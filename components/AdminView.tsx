import React, { useEffect, useState } from 'react';
import { MapComponent } from './MapComponent';
import { db } from '../services/mockDb';
import { Driver, UserRole, DeliveryRoute } from '../types';
import { Truck, Clock, Calendar, CheckCircle, Map as MapIcon, Menu, X, LogOut, Download, AlertTriangle, Search } from 'lucide-react';
import { ITAJAI_CENTER } from '../constants';
import { Logo } from './Logo';

interface AdminViewProps {
    onLogout: () => void;
}

// Skeleton Component for loading states
const Skeleton: React.FC<{ className: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`}></div>
);

export const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORY'>('LIVE');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time listener for DB changes
  useEffect(() => {
    const fetch = () => {
      try {
          const allDrivers = db.getDrivers();
          setDrivers(allDrivers.filter(d => d.role === UserRole.DRIVER));
          
          const allRoutes = db.getAllRoutes();
          setRoutes(allRoutes);
      } catch (err) {
          console.error("Failed to fetch admin data", err);
      } finally {
          setIsLoading(false);
      }
    };

    // Initial slight delay to simulate connection check and show skeleton
    setTimeout(fetch, 1000);

    window.addEventListener('db-update', fetch);
    const interval = setInterval(fetch, 3000); // Poll less frequently to save resources
    
    return () => {
      window.removeEventListener('db-update', fetch);
      clearInterval(interval);
    };
  }, []);

  const activeDrivers = drivers.filter(d => d.status !== 'OFFLINE');
  
  // Format driver locations for the map, including status for color coding
  const driverLocations = activeDrivers
    .filter(d => d.currentLocation)
    .map(d => ({ 
        id: d.id, 
        coords: d.currentLocation!, 
        name: d.name,
        status: d.status
    }));

  // Filter routes for "Live" view (In Progress) vs "History" view (Selected Date)
  const filteredRoutes = routes.filter(r => {
      const routeDate = new Date(r.startTime).toISOString().split('T')[0];
      return routeDate === selectedDate;
  });

  // Get active routes for the map display (regardless of date, if they are currently running)
  const liveRoutes = routes.filter(r => r.status === 'IN_PROGRESS');

  const completedRoutes = filteredRoutes.filter(r => r.status === 'COMPLETED').length;
  const totalStops = filteredRoutes.reduce((acc, r) => acc + r.stops.length, 0);
  const completedStops = filteredRoutes.reduce((acc, r) => acc + (r.completedStops || []).length, 0);

  const handleExport = () => {
      if (filteredRoutes.length === 0) return;
      // In a real app, generate CSV here
      alert("Relatório CSV gerado com sucesso! Verifique sua pasta de downloads.");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 text-white overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 z-50 shadow-md">
         <div className="flex items-center gap-2">
            <h1 className="font-black text-lg text-white tracking-tight">H2<span className="text-[#009c3b]">BRASIL</span></h1>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 active:bg-slate-700 rounded-lg">
            {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-0 z-40 bg-slate-800 transform transition-transform duration-300
        md:relative md:translate-x-0 md:w-80 md:border-r md:border-slate-700 md:flex md:flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-700 hidden md:block">
          <Logo className="w-20 h-20 mb-2" showText={true} />
          <p className="text-xs text-slate-400 text-center mt-2 tracking-widest uppercase font-bold">Painel de Gestão</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-2 gap-2 bg-slate-900/50 m-4 rounded-xl border border-slate-700/50">
           <button 
             onClick={() => { setViewMode('LIVE'); setIsMobileMenuOpen(false); }}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'LIVE' ? 'bg-[#002776] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
           >
             <MapIcon size={16} /> Tempo Real
           </button>
           <button 
             onClick={() => { setViewMode('HISTORY'); setIsMobileMenuOpen(false); }}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'HISTORY' ? 'bg-[#002776] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
           >
             <Calendar size={16} /> Relatórios
           </button>
        </div>

        {viewMode === 'LIVE' ? (
            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                        <span className="text-xs text-slate-400 block mb-1 font-bold">FROTA TOTAL</span>
                        {isLoading ? <Skeleton className="h-8 w-10" /> : <span className="text-2xl font-bold">{drivers.length}</span>}
                    </div>
                    <div className="bg-green-900/20 p-3 rounded-xl border border-green-800/50">
                        <span className="text-xs text-green-400 block mb-1 font-bold">ONLINE AGORA</span>
                         {isLoading ? <Skeleton className="h-8 w-10 bg-green-900/40" /> : <span className="text-2xl font-bold text-green-400">{activeDrivers.length}</span>}
                    </div>
                </div>
                
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                    Monitoramento
                    {!isLoading && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                </h3>
                
                <div className="space-y-2">
                    {isLoading ? (
                        <>
                           {[1,2,3].map(i => (
                               <div key={i} className="flex gap-3 p-3">
                                   <Skeleton className="w-10 h-10 rounded-full" />
                                   <div className="flex-1 space-y-2">
                                       <Skeleton className="w-3/4 h-4" />
                                       <Skeleton className="w-1/2 h-3" />
                                   </div>
                               </div>
                           ))}
                        </>
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-8 opacity-50">
                            <Truck size={32} className="mx-auto mb-2" />
                            <p className="text-sm">Nenhum motorista cadastrado.</p>
                        </div>
                    ) : (
                        drivers.map(driver => (
                        <div key={driver.id} className="p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700 transition flex items-center gap-3 border border-transparent hover:border-slate-500 group">
                            <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-lg font-bold shadow-inner">
                                {driver.name.charAt(0)}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${driver.status === 'OFFLINE' ? 'bg-slate-500' : driver.status === 'EN_ROUTE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate text-white group-hover:text-blue-200 transition-colors">{driver.name}</h4>
                                <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                        driver.status === 'EN_ROUTE' ? 'bg-green-900/50 text-green-300 border border-green-800' :
                                        driver.status === 'IDLE' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-800' :
                                        'bg-slate-600/50 text-slate-400 border border-slate-600'
                                    }`}>
                                        {driver.status === 'EN_ROUTE' ? 'EM ROTA' : driver.status === 'IDLE' ? 'AGUARDANDO' : 'OFFLINE'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        ))
                    )}
                </div>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                 <div className="mb-4">
                    <label className="text-xs text-slate-400 mb-1 block font-bold uppercase">Filtrar por Data</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#002776] outline-none hover:bg-slate-600 transition-colors cursor-pointer"
                        />
                    </div>
                 </div>

                 {isLoading ? (
                     <Skeleton className="h-24 w-full mb-4" />
                 ) : (
                     <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-5 rounded-2xl mb-6 border border-slate-600 relative overflow-hidden group shadow-lg">
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-bold text-slate-300 uppercase">Produtividade do Dia</span>
                                <span className="font-black text-[#ffdf00] text-lg">{completedStops} <span className="text-sm text-slate-400 font-medium">/ {totalStops}</span></span>
                            </div>
                            <div className="w-full bg-slate-900/50 h-3 rounded-full overflow-hidden border border-slate-600">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000 ease-out relative" 
                                    style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` }}
                                >
                                    <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                            <div className="mt-2 text-right">
                                <span className="text-xs text-slate-400">{filteredRoutes.length} rotas ativas</span>
                            </div>
                        </div>
                     </div>
                 )}

                 <div className="space-y-3">
                    {isLoading ? (
                        [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                    ) : filteredRoutes.length === 0 ? (
                        <div className="text-center py-10 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                            <Search size={32} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-slate-500 text-sm">Nenhuma rota registrada nesta data.</p>
                        </div>
                    ) : (
                        filteredRoutes.map(route => {
                             const driver = drivers.find(d => d.id === route.driverId);
                             const percentage = Math.round(((route.completedStops || []).length / route.stops.length) * 100);
                             
                             return (
                                 <div key={route.id} className="bg-slate-700/40 hover:bg-slate-700/80 transition rounded-xl p-4 border border-slate-600/50 group">
                                     <div className="flex justify-between items-start mb-3">
                                         <div>
                                            <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                                {driver?.name || 'Motorista Desconhecido'}
                                            </h4>
                                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                <Clock size={12} />
                                                {new Date(route.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                         </div>
                                         <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${
                                             route.status === 'COMPLETED' 
                                             ? 'bg-green-900/30 text-green-400 border-green-800' 
                                             : 'bg-blue-900/30 text-blue-400 border-blue-800'
                                         }`}>
                                             {route.status === 'COMPLETED' ? 'CONCLUÍDO' : `${percentage}%`}
                                         </span>
                                     </div>
                                     <div className="space-y-1.5 pl-1 border-l-2 border-slate-600">
                                         {route.stops.map((stop, i) => {
                                             const isDone = (route.completedStops || []).includes(stop.id);
                                             return (
                                                <div key={stop.id} className="flex items-center gap-2 text-xs pl-2">
                                                    {isDone ? (
                                                        <CheckCircle size={12} className="text-green-500 shrink-0" />
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full border border-slate-500 shrink-0"></div>
                                                    )}
                                                    <span className={`truncate ${isDone ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                                        {stop.name}
                                                    </span>
                                                </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                             )
                        })
                    )}
                 </div>
                 
                 {filteredRoutes.length > 0 && (
                    <button 
                        onClick={handleExport}
                        className="w-full mt-6 mb-4 flex items-center justify-center gap-2 bg-[#009c3b] hover:bg-green-600 text-white py-3.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:shadow-green-900/20 active:scale-[0.98]"
                    >
                        <Download size={18} /> EXPORTAR RELATÓRIO
                    </button>
                 )}
            </div>
        )}

        <div className="p-4 border-t border-slate-700 mt-auto bg-slate-800/50">
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white py-3 rounded-xl transition-all font-bold text-sm border border-red-500/20 hover:border-transparent"
            >
                <LogOut size={16} /> SAIR DO SISTEMA
            </button>
        </div>
        
        <button 
           onClick={() => setIsMobileMenuOpen(false)}
           className="md:hidden absolute top-4 right-4 text-white p-2"
        >
           <X size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-slate-900 w-full h-full">
         {viewMode === 'LIVE' ? (
             <>
                <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur text-white px-4 py-2 rounded-lg border border-slate-600 shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <Clock size={16} className="text-[#ffdf00]" />
                    <span className="font-mono text-sm">{new Date().toLocaleTimeString()}</span>
                    <span className="text-[10px] font-bold text-green-400 ml-2 animate-pulse bg-green-900/30 px-2 py-0.5 rounded-full border border-green-800">● AO VIVO</span>
                </div>
                <div className="w-full h-full relative">
                    <MapComponent 
                        userLocation={ITAJAI_CENTER}
                        driverLocations={driverLocations}
                        activeRoutes={liveRoutes}
                        isTrafficEnabled={true}
                    />
                    {/* Map Overlay Gradient */}
                    <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-slate-900/50 to-transparent pointer-events-none"></div>
                </div>
             </>
         ) : (
             <div className="p-8 h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                 <Logo className="w-48 h-48 grayscale mb-6" showText={false} />
                 <h2 className="text-4xl font-black text-white tracking-tight">H2 BRASIL</h2>
                 <p className="text-slate-400 mt-2 font-light">Selecione uma data no menu para acessar os relatórios.</p>
             </div>
         )}
      </div>
    </div>
  );
};