import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinates, LocationPoint, DeliveryRoute } from '../types';

// Configure default Leaflet icons
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

interface MapComponentProps {
  userLocation?: Coordinates;
  points?: LocationPoint[];
  driverLocations?: { id: string, coords: Coordinates, name: string, status?: string }[];
  routeStops?: LocationPoint[]; // For Driver Mode (Single Route detailed)
  activeRoutes?: DeliveryRoute[]; // For Admin Mode (Multiple Routes lines)
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

  // 1. Initialize Map ONLY ONCE
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (Itajaí)
    const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] : [-26.9099, -48.6604];
    
    const map = L.map(mapContainerRef.current, {
        zoomControl: false 
    }).setView(initialCenter as L.LatLngExpression, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; Prefeitura de Itajaí | OpenStreetMap',
      maxZoom: 19
    }).addTo(map);
    
    L.control.zoom({ position: 'topright' }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); 

  // 2. Update Layers whenever data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    
    const layerGroup = layerGroupRef.current;
    const map = mapInstanceRef.current;
    
    // Clear previous layers to prevent memory leaks and ghost markers
    layerGroup.clearLayers();

    // Bounds calculator to auto-zoom
    const bounds = L.latLngBounds([]);

    // --- DRIVER MODE: Single Detailed Route ---
    if (routeStops && routeStops.length > 0) {
       const latlngs: L.LatLngExpression[] = [];
       if (userLocation) {
         latlngs.push([userLocation.lat, userLocation.lng]);
         bounds.extend([userLocation.lat, userLocation.lng]);
       }
       routeStops.forEach(stop => {
         latlngs.push([stop.coords.lat, stop.coords.lng]);
         bounds.extend([stop.coords.lat, stop.coords.lng]);
       });

       // Draw Polyline
       L.polyline(latlngs, { 
         color: '#2563EB', 
         weight: 6, 
         opacity: 0.8,
         lineCap: 'round'
       }).addTo(layerGroup);

       // Draw Numbered Markers
        routeStops.forEach((stop, index) => {
            const numIcon = L.divIcon({
                className: '',
                html: `<div style="background-color: #2563EB; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-family: sans-serif; font-size: 12px;">${index + 1}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });
            
            L.marker([stop.coords.lat, stop.coords.lng], { icon: numIcon })
             .bindPopup(`<div class="font-sans">
                <h3 class="font-bold text-sm text-blue-900">${index + 1}. ${stop.name}</h3>
                <p class="text-xs text-slate-600">${stop.address}</p>
             </div>`)
             .addTo(layerGroup);
        });
    } 
    
    // --- ADMIN MODE: Multiple Active Routes ---
    if (activeRoutes && activeRoutes.length > 0) {
        activeRoutes.forEach((route, idx) => {
            const routeLatLngs: L.LatLngExpression[] = route.stops.map(s => [s.coords.lat, s.coords.lng]);
            
            // Add driver position to start of line if available
            const driverLoc = driverLocations.find(d => d.id === route.driverId);
            if (driverLoc) {
                routeLatLngs.unshift([driverLoc.coords.lat, driverLoc.coords.lng]);
            }

            // Different color for each route (cycling through a palette)
            const colors = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#DC2626'];
            const color = colors[idx % colors.length];

            if (routeLatLngs.length > 0) {
                L.polyline(routeLatLngs, {
                    color: color,
                    weight: 4,
                    opacity: 0.6,
                    dashArray: '10, 10', // Dashed line for admin view to differentiate from main roads
                    lineCap: 'round'
                }).addTo(layerGroup);
                
                // Add stops to bounds
                routeLatLngs.forEach(pt => bounds.extend(pt as L.LatLngTuple));
            }
        });
    }

    // --- Draw Other Drivers (Admin & Driver View) ---
    driverLocations.forEach(driver => {
        // Only show if we have coordinates
        if (driver.coords && driver.coords.lat && driver.coords.lng) {
            bounds.extend([driver.coords.lat, driver.coords.lng]);

            // Enhanced Truck Icon
            const truckHtml = `
                <div style="position: relative; width: 40px; height: 40px; display: flex; flex-col; align-items: center; justify-content: center;">
                    <div style="background-color: white; border-radius: 50%; padding: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid ${driver.status === 'OFFLINE' ? '#64748B' : '#009c3b'};">
                        <div style="font-size: 20px; transform: scaleX(-1);">🚚</div>
                    </div>
                    <div style="position: absolute; bottom: -18px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; white-space: nowrap; font-weight: bold;">
                        ${driver.name.split(' ')[0]}
                    </div>
                </div>
            `;

            const truckIcon = L.divIcon({
                className: '',
                html: truckHtml,
                iconSize: [40, 40],
                iconAnchor: [20, 20], // Center it
                popupAnchor: [0, -20]
            });

            L.marker([driver.coords.lat, driver.coords.lng], { icon: truckIcon })
             .bindPopup(`<div class="text-center"><b class="font-sans text-sm">${driver.name}</b><br/><span class="text-xs ${driver.status === 'EN_ROUTE' ? 'text-green-600' : 'text-slate-500'}">${driver.status === 'EN_ROUTE' ? 'Em Rota' : 'Parado'}</span></div>`)
             .addTo(layerGroup);
        }
    });

    // --- Draw Static Points (Only if no active route in Driver Mode, or always in Admin Mode if requested) ---
    // In Admin mode, we might want to see points if no routes are active, or just specific bases.
    // For now, adhering to logic: Show points if provided and not cluttered.
    if (!routeStops && points.length > 0) {
        points.forEach(point => {
            let color = '#64748B'; 
            let size = 10;
            
            if (point.type === 'CRAS') color = '#E11D48';
            else if (point.type === 'UPA') color = '#EA580C';
            else if (point.type === 'UBS') color = '#16A34A';
            else if (point.type === 'PREFEITURA') { color = '#2563EB'; size = 14; }

            const html = `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`;
            
            const dotIcon = L.divIcon({
                className: '',
                html: html,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2]
            });

            L.marker([point.coords.lat, point.coords.lng], { icon: dotIcon })
             .bindPopup(`<b class="font-sans text-sm">${point.name}</b><br/><span class="text-xs font-bold text-slate-500">${point.type}</span>`)
             .addTo(layerGroup);
        });
    }

    // --- Draw Current User (Self) ---
    if (userLocation) {
        bounds.extend([userLocation.lat, userLocation.lng]);
        
        L.circle([userLocation.lat, userLocation.lng], {
            radius: 60,
            fillColor: "#3B82F6",
            fillOpacity: 0.15,
            stroke: false,
            className: 'animate-pulse-slow' 
        }).addTo(layerGroup);

        L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 8,
            fillColor: "#2563EB",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).bindPopup("<b>Você está aqui</b>").addTo(layerGroup);
    }
    
    // --- AUTO ZOOM (Fit Bounds) ---
    if (bounds.isValid()) {
        map.fitBounds(bounds, { 
            padding: [50, 50], 
            maxZoom: 16, 
            animate: true,
            duration: 1
        });
    }
    
    map.invalidateSize();

  }, [userLocation, points, driverLocations, routeStops, activeRoutes]); 

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-200" />;
};