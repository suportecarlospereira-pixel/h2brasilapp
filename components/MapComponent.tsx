import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinates, LocationPoint, DeliveryRoute } from '../types';

// Configuração dos ícones padrão do Leaflet para evitar bugs de imagem quebrada
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

// Força o ícone padrão globalmente se não for especificado outro
L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  userLocation?: Coordinates; // Localização do próprio usuário (Azul pulsante)
  points?: LocationPoint[]; // Pontos estáticos (para seleção de rota)
  driverLocations?: { id: string, coords: Coordinates, name: string, status?: string }[]; // Outros motoristas (Visão Admin)
  routeStops?: LocationPoint[]; // Rota ativa única (Visão Motorista)
  activeRoutes?: DeliveryRoute[]; // Todas as rotas (Visão Admin)
  isTrafficEnabled?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  userLocation,
  points = [],
  driverLocations = [],
  routeStops,
  activeRoutes = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Inicialização do Mapa (Roda apenas uma vez)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro padrão (Itajaí) se não tiver userLocation
    const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] : [-26.9099, -48.6604];
    
    const map = L.map(mapContainerRef.current, {
        zoomControl: false, // Vamos adicionar o controle em posição customizada se quiser
        attributionControl: false // Limpa a barra inferior para visual mais "app"
    }).setView(initialCenter as L.LatLngExpression, 14);

    // Camada do Mapa (OpenStreetMap Clean)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'map-tiles' // Classe para customização CSS se necessário
    }).addTo(map);
    
    // Adiciona atribuição de forma discreta
    L.control.attribution({ prefix: 'H2 Brasil' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Array vazio = DidMount

  // 2. Atualização dos Elementos (Roda sempre que os dados mudam)
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    
    const layerGroup = layerGroupRef.current;
    const map = mapInstanceRef.current;
    
    // Limpa camadas anteriores para redesenhar o estado atual
    layerGroup.clearLayers();

    // Bounds (limites) para auto-zoom
    const bounds = L.latLngBounds([]);

    // --- MODO MOTORISTA: Rota Única Detalhada ---
    if (routeStops && routeStops.length > 0) {
       const latlngs: L.LatLngExpression[] = [];
       
       // Adiciona posição atual ao traçado
       if (userLocation) {
         latlngs.push([userLocation.lat, userLocation.lng]);
         bounds.extend([userLocation.lat, userLocation.lng]);
       }
       
       routeStops.forEach(stop => {
         latlngs.push([stop.coords.lat, stop.coords.lng]);
         bounds.extend([stop.coords.lat, stop.coords.lng]);
       });

       // Linha da rota
       L.polyline(latlngs, { 
         color: '#2563EB', // Azul forte
         weight: 6, 
         opacity: 0.8,
         lineCap: 'round',
         lineJoin: 'round'
       }).addTo(layerGroup);

       // Marcadores Numerados (1, 2, 3...)
        routeStops.forEach((stop, index) => {
            const numIcon = L.divIcon({
                className: '',
                html: `<div style="
                    background-color: #2563EB; 
                    color: white; 
                    border-radius: 50%; 
                    width: 24px; 
                    height: 24px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    border: 2px solid white; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3); 
                    font-family: sans-serif; 
                    font-size: 12px;
                ">${index + 1}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });
            
            L.marker([stop.coords.lat, stop.coords.lng], { icon: numIcon })
             .bindPopup(`<div class="font-sans p-1">
                <h3 class="font-bold text-sm text-blue-900 mb-0.5">${index + 1}. ${stop.name}</h3>
                <p class="text-xs text-slate-600 m-0">${stop.address}</p>
             </div>`)
             .addTo(layerGroup);
        });
    } 
    
    // --- MODO ADMIN: Múltiplas Rotas ---
    if (activeRoutes && activeRoutes.length > 0) {
        activeRoutes.forEach((route, idx) => {
            const routeLatLngs: L.LatLngExpression[] = route.stops.map(s => [s.coords.lat, s.coords.lng]);
            
            // Conecta a linha ao motorista se tivermos a localização dele
            const driverLoc = driverLocations.find(d => d.id === route.driverId);
            if (driverLoc) {
                routeLatLngs.unshift([driverLoc.coords.lat, driverLoc.coords.lng]);
            }

            // Paleta de cores para diferenciar rotas
            const colors = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#DC2626'];
            const color = colors[idx % colors.length];

            if (routeLatLngs.length > 0) {
                L.polyline(routeLatLngs, {
                    color: color,
                    weight: 4,
                    opacity: 0.6,
                    dashArray: '5, 10', // Linha pontilhada para Admin (diferencia de ruas)
                    lineCap: 'round'
                }).addTo(layerGroup);
                
                routeLatLngs.forEach(pt => bounds.extend(pt as L.LatLngTuple));
            }
        });
    }

    // --- DESENHO DE MOTORISTAS (Caminhões) ---
    // Aparece no AdminView (vários) ou DriverView (se tiver lógica para ver colegas, mas no nosso caso é "stealth")
    driverLocations.forEach(driver => {
        if (driver.coords && driver.coords.lat && driver.coords.lng) {
            bounds.extend([driver.coords.lat, driver.coords.lng]);

            // Cor do status
            const statusColor = 
                driver.status === 'OFFLINE' ? '#64748B' : 
                driver.status === 'ON_BREAK' ? '#EAB308' : // Amarelo para almoço
                '#16A34A'; // Verde para online/rota

            const truckHtml = `
                <div style="position: relative; width: 40px; height: 40px; display: flex; flex-col; align-items: center; justify-content: center;">
                    <div style="background-color: white; border-radius: 50%; padding: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 3px solid ${statusColor}; transition: border-color 0.3s;">
                        <div style="font-size: 18px;">🚚</div>
                    </div>
                    <div style="
                        position: absolute; 
                        bottom: -16px; 
                        background: rgba(0,0,0,0.8); 
                        color: white; 
                        padding: 1px 6px; 
                        border-radius: 4px; 
                        font-size: 9px; 
                        white-space: nowrap; 
                        font-weight: bold;
                        z-index: 100;
                    ">
                        ${driver.name.split(' ')[0]}
                    </div>
                </div>
            `;

            const truckIcon = L.divIcon({
                className: 'custom-truck-icon',
                html: truckHtml,
                iconSize: [40, 40],
                iconAnchor: [20, 20], 
                popupAnchor: [0, -20]
            });

            L.marker([driver.coords.lat, driver.coords.lng], { icon: truckIcon })
             .bindPopup(`
                <div class="text-center font-sans">
                    <b class="text-sm">${driver.name}</b><br/>
                    <span class="text-xs font-bold" style="color:${statusColor}">
                        ${driver.status === 'EN_ROUTE' ? 'Em Rota' : driver.status === 'ON_BREAK' ? 'Em Pausa/Almoço' : driver.status === 'IDLE' ? 'Disponível' : 'Offline'}
                    </span>
                </div>
             `)
             .addTo(layerGroup);
        }
    });

    // --- PONTOS DE ENTREGA (Modo Seleção) ---
    // Só desenha se não tiver rota ativa (Driver) ou se for Admin
    if ((!routeStops || routeStops.length === 0) && points.length > 0) {
        points.forEach(point => {
            let color = '#64748B'; // Slate (Outros)
            let size = 12;
            
            // Cores semânticas para os tipos de local
            if (point.type === 'CRAS') color = '#E11D48'; // Rosa/Vermelho
            else if (point.type === 'UPA') color = '#EA580C'; // Laranja
            else if (point.type === 'UBS') color = '#16A34A'; // Verde
            else if (point.type === 'PREFEITURA') { color = '#2563EB'; size = 16; }

            // Marker circular simples e limpo
            const html = `<div style="
                background-color: ${color}; 
                width: ${size}px; 
                height: ${size}px; 
                border-radius: 50%; 
                border: 2px solid white; 
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                cursor: pointer;
            "></div>`;
            
            const dotIcon = L.divIcon({
                className: 'location-dot',
                html: html,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
                popupAnchor: [0, -5]
            });

            L.marker([point.coords.lat, point.coords.lng], { icon: dotIcon })
             .bindPopup(`
                 <div class="font-sans">
                    <b class="text-sm text-slate-800">${point.name}</b><br/>
                    <span class="text-xs font-bold text-slate-500 bg-slate-100 px-1 rounded">${point.type}</span>
                    <p class="text-[10px] text-slate-400 mt-1 m-0">${point.address}</p>
                 </div>
             `)
             .addTo(layerGroup);
             
             bounds.extend([point.coords.lat, point.coords.lng]);
        });
    }

    // --- POSIÇÃO DO USUÁRIO (EU) ---
    if (userLocation) {
        bounds.extend([userLocation.lat, userLocation.lng]);
        
        // Círculo de precisão (efeito visual)
        L.circle([userLocation.lat, userLocation.lng], {
            radius: 60,
            fillColor: "#3B82F6",
            fillOpacity: 0.1,
            stroke: false,
            className: 'animate-pulse' 
        }).addTo(layerGroup);

        // Ponto azul central
        L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 8,
            fillColor: "#2563EB",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).bindPopup("<b>Você está aqui</b>").addTo(layerGroup);
    }
    
    // --- AUTO ZOOM ---
    // Só ajusta o zoom se tivermos bounds válidos
    if (bounds.isValid()) {
        map.fitBounds(bounds, { 
            padding: [50, 50], 
            maxZoom: 16, 
            animate: true,
            duration: 1
        });
    }
    
    // Hack para corrigir renderização se o mapa for redimensionado (ex: abaixar teclado mobile)
    setTimeout(() => { map.invalidateSize(); }, 300);

  }, [userLocation, points, driverLocations, routeStops, activeRoutes]); 

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-200 z-0" />;
};