import React, { useState, useEffect, useMemo } from 'react';
import { MapComponent } from './MapComponent';
import { PREDEFINED_LOCATIONS } from '../constants';
import { LocationPoint, DeliveryRoute, Driver, Coordinates } from '../types';
import { db } from '../services/mockDb';
import { Navigation, MapPin, CheckCircle, ChevronUp, ChevronDown, Loader, LogOut, PackageCheck, X, AlertTriangle, Play, Coffee, AlertCircle, RefreshCw, Trophy, Utensils } from 'lucide-react';

interface DriverViewProps {
  driver: Driver;
  onLogout: () => void;
}

const calculateDistance = (coord1: Coordinates, coord2: Coordinates) => {
    const R = 6371; 
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const optimizeRoutePoints = (startCoords: Coordinates, points: LocationPoint[]) => {
    if (points.length === 0) return [];
    let currentPos = startCoords;
    const remaining = [...points];
    const optimized: LocationPoint[] = [];

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let minDistance = Infinity;
        remaining.forEach((point, idx) => {
            const dist = calculateDistance(currentPos, point.coords);
            if (dist < minDistance) {
                minDistance = dist;
                nearestIdx = idx;
            }
        });
        const nextPoint = remaining[nearestIdx];
        optimized.push(nextPoint);
        currentPos = nextPoint.coords;
        remaining.splice(nearestIdx, 1);
    }
    return optimized;
};

const Toast = ({ message, type, onClose }: { message: string, type: 'error' | 'success', onClose: () => void }) => (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
        {type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
        <span className="font-bold text-sm">{message}</span>
        <button onClick={onClose}><X size={16} className="opacity-70 hover:opacity-100" /></button>
    </div>
);

export const DriverView: React.FC<DriverViewProps> = ({ driver, onLogout }) => {
  const [currentLoc, setCurrentLoc] = useState<Coordinates | undefined>(driver.currentLocation);
  const [driverStatus, setDriverStatus] = useState(driver.status);
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [activeRoute, setActiveRoute] = useState<DeliveryRoute | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(0);
  
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [completingStopId, setCompletingStopId] = useState<string | null>(null);
  const [reportingIssueId, setReportingIssueId] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [observation, setObservation] = useState('');
  const [issueReason, setIssueReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(accuracy);
        if (accuracy < 150 || !currentLoc) {
            const coords = { lat: latitude, lng: longitude };
            setCurrentLoc(coords);
            db.updateDriverLocation(driver.id, coords);
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [driver.id]);

  useEffect(() => {
    const syncRoute = () => {
        const route = db.getActiveRoute(driver.id);
        const me = db.getDrivers().find(d => d.id === driver.id);
        if (me) setDriverStatus(me.status);

        if (route) {
             setActiveRoute(prev => {
                 const prevProcessed = (prev?.completedStops?.length || 0) + (prev?.failedStops?.length || 0);
                 const newProcessed = (route.completedStops?.length || 0) + (route.failedStops?.length || 0);
                 if (prev && prevProcessed === newProcessed && prev.status === route.status) return prev;
                 return route;
             });
             if (route.status === 'COMPLETED') setShowSuccessModal(true);
        } else {
            setActiveRoute(undefined);
        }
    };
    syncRoute();
    window.addEventListener('db-update', syncRoute);
    return () => window.removeEventListener('db-update', syncRoute);
  }, [driver.id]);

  const nextStopIndex = useMemo(() => {
      if (!activeRoute) return -1;
      const completed = activeRoute.completedStops || [];
      const failed = activeRoute.failedStops || [];
      return activeRoute.stops.findIndex(s => !completed.includes(s.id) && !failed.includes(s.id));
  }, [activeRoute]);

  const showToast = (msg: string, type: 'error' | 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  const togglePoint = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setSelectedPoints(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const toggleStatus = () => {
      const newStatus = db.toggleDriverStatus(driver.id, driverStatus);
      setDriverStatus(newStatus as any);
      if (newStatus === 'ON_BREAK') {
          showToast('Bom almoço! Sistema em pausa.', 'success');
      } else {
          showToast('Bem-vindo de volta! Vamos trabalhar.', 'success');
      }
  };

  const createRoute = async () => {
    if (selectedPoints.length === 0) {
        showToast("Selecione pelo menos um cliente.", "error");
        return;
    }
    if (!currentLoc) {
        showToast("Aguardando GPS...", "error");
        return;
    }
    setLoading(true);
    setTimeout(() => {
        const rawPoints = PREDEFINED_LOCATIONS.filter(p => selectedPoints.includes(p.id));
        const optimizedPoints = optimizeRoutePoints(currentLoc, rawPoints);
        db.createRoute(driver.id, optimizedPoints);
        setLoading(false);
        setIsSheetOpen(false); 
        showToast(`Rota iniciada com ${optimizedPoints.length} entregas.`, "success");
    }, 500);
  };

  const handleConfirmDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoute || !completingStopId) return;
    
    const stop = activeRoute.stops.find(s => s.id === completingStopId);
    if (stop && currentLoc) {
        const distKm = calculateDistance(currentLoc, stop.coords);
        if (distKm > 0.5) {
             if(!confirm(`Você parece estar a ${distKm.toFixed(1)}km do local. Confirmar mesmo assim?`)) return;
        }
    }

    if (!receiverName.trim()) { showToast("Informe quem recebeu.", "error"); return; }
    
    setIsSubmitting(true);
    db.completeStop(activeRoute.id, completingStopId, { receiverName, observation });
    setIsSubmitting(false);
    setCompletingStopId(null);
    setReceiverName('');
    setObservation('');
    showToast("Entrega realizada!", "success");
  };

  const handleReportIssue = (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeRoute || !reportingIssueId || !issueReason) return;
      setIsSubmitting(true);
      db.reportIssue(activeRoute.id, reportingIssueId, issueReason);
      setIsSubmitting(false);
      setReportingIssueId(null);
      setIssueReason('');
      showToast("Problema registrado.", "success");
  };

  // --- CORREÇÃO: Função openExternalMap Restaurada ---
  const openExternalMap = (app: 'google' | 'waze') => {
    if (!activeRoute || !currentLoc) return;
    const completed = activeRoute.completedStops || [];
    const failed = activeRoute.failedStops || [];
    const destination = activeRoute.stops.find(s => !completed.includes(s.id) && !failed.includes(s.id));
    if (!destination) { showToast("Rota finalizada.", "error"); return; }
    
    const query = encodeURIComponent(`${destination.name}, ${destination.address}, Itajaí - SC`);
    const coords = `${destination.coords.lat},${destination.coords.lng}`;
    
    // Links universais robustos
    let url = '';
    if (app === 'waze') {
        url = `https://waze.com/ul?q=${query}&navigate=yes`;
    } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 relative overflow-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md shadow-lg rounded-2xl p-3 flex justify-between items-center pointer-events-auto border border-white/50">
             <div className="flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full shadow-lg ${
                     gpsAccuracy > 150 ? 'bg-red-500 animate-pulse' : 
                     driverStatus === 'ON_BREAK' ? 'bg-yellow-400' : 'bg-green-500'
                 }`}></div>
                 <div>
                    <h1 className="font-extrabold text-sm text-slate-800 leading-none truncate max-w-[120px]">{driver.name}</h1>
                    <span className="text-[10px] text-slate-500 font-bold tracking-wide">
                        {driverStatus === 'ON_BREAK' ? 'EM HORÁRIO DE ALMOÇO' : 'DISPONÍVEL'}
                    </span>
                 </div>
             </div>
             
             <div className="flex items-center gap-2">
                 <button 
                    onClick={toggleStatus}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 ${
                        driverStatus === 'ON_BREAK' 
                        ? 'bg-yellow-400 text-yellow-900 border border-yellow-500 ring-2 ring-yellow-200' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Pausa para Almoço"
                 >
                    {driverStatus === 'ON_BREAK' ? <Play size={16} fill="currentColor" /> : <Utensils size={16} />}
                    <span className="hidden sm:inline">{driverStatus === 'ON_BREAK' ? 'VOLTAR' : 'ALMOÇO'}</span>
                 </button>

                 {activeRoute && !showSuccessModal && (
                    <div className="flex gap-1">
                        <button onClick={() => openExternalMap('google')} className="bg-blue-600 text-white p-2 rounded-lg shadow-md hover:scale-105 transition-transform"><MapPin size={18} /></button>
                        <button onClick={() => openExternalMap('waze')} className="bg-cyan-500 text-white p-2 rounded-lg shadow-md hover:scale-105 transition-transform"><Navigation size={18} /></button>
                    </div>
                 )}
                 <button onClick={onLogout} className="bg-white border border-red-100 text-red-500 p-2 rounded-lg shadow-sm hover:bg-red-50"><LogOut size={18} /></button>
             </div>
        </div>
      </div>

      {/* MAPA: --- CORREÇÃO: Prop 'points' adicionada --- */}
      <div className="absolute inset-0 z-0">
         <MapComponent 
            userLocation={currentLoc} 
            routeStops={activeRoute?.stops} 
            points={!activeRoute ? PREDEFINED_LOCATIONS : []} 
         />
      </div>

      {/* Painel Inferior */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-30 transition-all duration-300 ease-in-out flex flex-col ${isSheetOpen ? 'h-[70vh]' : 'h-[140px]'}`}>
          <div className="w-full h-9 flex items-center justify-center cursor-pointer hover:bg-slate-50 rounded-t-3xl" onClick={() => setIsSheetOpen(!isSheetOpen)}>
              <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
          </div>

          <div className="px-6 pb-2 flex justify-between items-center border-b border-slate-100">
             <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${activeRoute ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {activeRoute ? <PackageCheck size={20} /> : <MapPin size={20} />}
                </div>
                <div>
                    <h2 className="font-black text-[#002776] text-lg leading-tight">{activeRoute ? 'Rota Atual' : 'Escolher Entregas'}</h2>
                    <p className="text-xs text-slate-400 font-medium">
                        {activeRoute ? `${nextStopIndex + 1}ª parada de ${activeRoute.stops.length}` : 'Selecione os clientes no mapa ou lista'}
                    </p>
                </div>
             </div>
             <button onClick={() => setIsSheetOpen(!isSheetOpen)} className="p-2 hover:bg-slate-100 rounded-full">
                 {isSheetOpen ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronUp size={20} className="text-slate-400"/>}
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar">
             {!activeRoute ? (
                <>
                  {PREDEFINED_LOCATIONS.map(loc => {
                     const isSelected = selectedPoints.includes(loc.id);
                     return (
                        <div key={loc.id} onClick={() => togglePoint(loc.id)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 active:scale-[0.98] ${isSelected ? 'border-[#002776] bg-blue-50 shadow-md' : 'border-transparent bg-white shadow-sm'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#002776] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <MapPin size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-sm text-slate-800">{loc.name}</h3>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold bg-slate-200 px-2 py-0.5 rounded-full">{loc.type}</span>
                                    {currentLoc && <span className="text-[10px] text-slate-400 font-mono">~{calculateDistance(currentLoc, loc.coords).toFixed(1)}km</span>}
                                </div>
                            </div>
                            {isSelected && <CheckCircle size={20} className="text-[#009c3b]" />}
                        </div>
                     );
                  })}
                </>
             ) : (
                <div className="space-y-4 pb-20">
                   {activeRoute.stops.map((stop, idx) => {
                     const completedList = activeRoute.completedStops || [];
                     const failedList = activeRoute.failedStops || [];
                     const isCompleted = completedList.includes(stop.id);
                     const isFailed = failedList.includes(stop.id);
                     const isNext = idx === nextStopIndex;
                     
                     return (
                       <div key={stop.id} className={`relative p-4 rounded-xl border-l-4 transition-all ${
                           isCompleted ? 'bg-green-50 border-green-500 opacity-60' : 
                           isFailed ? 'bg-red-50 border-red-500 opacity-60' :
                           isNext ? 'bg-white border-[#002776] shadow-md ring-1 ring-blue-100' : 
                           'bg-white border-slate-300 shadow-sm opacity-80'
                       }`}>
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                                    isCompleted ? 'bg-green-500 text-white' : 
                                    isFailed ? 'bg-red-500 text-white' :
                                    'bg-[#002776] text-white'
                                }`}>
                                    {isCompleted ? <CheckCircle size={16} /> : isFailed ? <X size={16} /> : idx + 1}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{stop.name}</h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{stop.address}</p>
                                </div>
                              </div>
                          </div>
                             
                          {!isCompleted && !isFailed && isNext && (
                            <div className="grid grid-cols-4 gap-2 mt-3">
                                <button onClick={() => setCompletingStopId(stop.id)} className="col-span-3 py-3 bg-[#009c3b] hover:bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                    <PackageCheck size={18} /> CONFIRMAR
                                </button>
                                <button onClick={() => setReportingIssueId(stop.id)} className="col-span-1 py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 active:scale-[0.98]">
                                    <AlertTriangle size={16} /> Problema
                                </button>
                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>
             )}
          </div>
          
          <div className="p-4 bg-white border-t border-slate-200">
             {!activeRoute ? (
                 <button onClick={createRoute} disabled={selectedPoints.length === 0 || loading} className="w-full py-4 bg-[#002776] text-[#ffdf00] rounded-xl font-black shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2 text-lg transition-all">
                    {loading ? <Loader className="animate-spin" /> : 'OTIMIZAR E INICIAR'}
                 </button>
             ) : (
                <button onClick={() => confirm("Cancelar rota?") && setActiveRoute(undefined)} className="w-full py-3 text-red-500 font-bold text-sm bg-red-50 rounded-xl hover:bg-red-100 transition">
                    Cancelar e Escolher Outra
                </button>
             )}
          </div>

          {completingStopId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="bg-[#002776] p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold flex items-center gap-2"><PackageCheck /> Confirmar Entrega</h3>
                        <button onClick={() => setCompletingStopId(null)}><X size={20} /></button>
                    </div>
                    <form onSubmit={handleConfirmDelivery} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Recebedor</label>
                            <input type="text" required value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Quem recebeu?" className="w-full p-3 bg-slate-50 border rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                            <textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Opcional..." className="w-full p-3 bg-slate-50 border rounded-xl h-20 resize-none" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#009c3b] text-white font-bold rounded-xl">{isSubmitting ? 'Salvando...' : 'FINALIZAR ENTREGA'}</button>
                    </form>
                </div>
            </div>
          )}

          {reportingIssueId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
                      <div className="bg-red-600 p-4 flex justify-between items-center text-white">
                          <h3 className="font-bold flex items-center gap-2"><AlertTriangle /> Registrar Problema</h3>
                          <button onClick={() => setReportingIssueId(null)}><X size={20} /></button>
                      </div>
                      <form onSubmit={handleReportIssue} className="p-6 space-y-4">
                          <div className="grid grid-cols-1 gap-2">
                              {['Cliente ausente', 'Endereço errado', 'Local fechado', 'Recusado', 'Problema mecânico'].map(r => (
                                  <button key={r} type="button" onClick={() => setIssueReason(r)} className={`p-3 rounded-lg text-sm font-medium border text-left ${issueReason === r ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50 hover:bg-slate-100'}`}>{r}</button>
                              ))}
                          </div>
                          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl mt-2">CONFIRMAR</button>
                      </form>
                  </div>
              </div>
          )}

          {showSuccessModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#002776]/90 backdrop-blur-md p-6">
                  <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center animate-in zoom-in-95">
                      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 text-[#ffdf00]"><Trophy size={40} /></div>
                      <h2 className="text-2xl font-black text-[#002776] mb-2">ROTA FINALIZADA!</h2>
                      <p className="text-slate-500 mb-8">Bom trabalho. Descanse ou inicie outra rota.</p>
                      <button onClick={() => { setActiveRoute(undefined); setShowSuccessModal(false); setIsSheetOpen(true); }} className="w-full py-4 bg-[#002776] text-[#ffdf00] rounded-xl font-black flex items-center justify-center gap-2"><RefreshCw size={20} /> NOVA ROTA</button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};