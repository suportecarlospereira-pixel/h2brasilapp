import React, { useEffect, useState } from 'react';
import { MapComponent } from './MapComponent';
import { db } from '../services/mockDb';
import { Driver, UserRole, DeliveryRoute } from '../types';
import { Truck, Clock, Calendar, CheckCircle, Map as MapIcon, Menu, X, LogOut, Download, Search } from 'lucide-react';
import { ITAJAI_CENTER } from '../constants';
import { Logo } from './Logo';

interface AdminViewProps {
    onLogout: () => void;
}

const Skeleton: React.FC<{ className: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`}></div>
);

const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora';
    if (minutes > 60) return '> 1h';
    return `${minutes} min`;
};

export const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORY'>('LIVE');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  
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

    setTimeout(fetch, 1000);
    window.addEventListener('db-update', fetch);
    const interval = setInterval(fetch, 5000); // Polling para atualizar o "tempo atrás"
    
    return () => {
      window.removeEventListener('db-update', fetch);
      clearInterval(interval);
    };
  }, []);

  const activeDrivers = drivers.filter(d => d.status !== 'OFFLINE');
  
  const driverLocations = activeDrivers
    .filter(d => d.currentLocation)
    .map(d => ({ 
        id: d.id, 
        coords: d.currentLocation!, 
        name: d.name, 
        status: d.status 
    }));

  const liveRoutes = routes.filter(r => r.status === 'IN_PROGRESS');

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 text-white overflow-hidden">
      
      {/* Sidebar Desktop */}
      <div className="md:w-80 md:border-r md:border-slate-700 md:flex md:flex-col bg-slate-800">
        <div className="p-6 border-b border-slate-700">
          <Logo className="w-20 h-20 mb-2" showText={true} />
          <p className="text-xs text-slate-400 text-center mt-2 tracking-widest uppercase font-bold">Gestão Logística</p>
        </div>

        <div className="flex p-2 gap-2 bg-slate-900/50 m-4 rounded-xl border border-slate-700/50">
           <button onClick={() => setViewMode('LIVE')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${viewMode === 'LIVE' ? 'bg-[#002776] text-white' : 'text-slate-400 hover:text-white'}`}>
             <MapIcon size={16} /> Tempo Real
           </button>
           <button onClick={() => setViewMode('HISTORY')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${viewMode === 'HISTORY' ? 'bg-[#002776] text-white' : 'text-slate-400 hover:text-white'}`}>
             <Calendar size={16} /> Relatórios
           </button>
        </div>

        {viewMode === 'LIVE' && (
            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                        <span className="text-xs text-slate-400 block mb-1 font-bold">FROTA</span>
                        <span className="text-2xl font-bold">{drivers.length}</span>
                    </div>
                    <div className="bg-green-900/20 p-3 rounded-xl border border-green-800/50">
                        <span className="text-xs text-green-400 block mb-1 font-bold">ONLINE</span>
                        <span className="text-2xl font-bold text-green-400">{activeDrivers.length}</span>
                    </div>
                </div>
                
                <div className="space-y-2">
                    {drivers.map(driver => {
                        const isStale = (Date.now() - driver.lastUpdate) > 10 * 60 * 1000;
                        return (
                        <div key={driver.id} className={`p-3 rounded-xl flex items-center gap-3 border ${isStale ? 'bg-slate-800 border-red-900/30 opacity-60' : 'bg-slate-700/30 border-transparent'}`}>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center font-bold">
                                    {driver.name.charAt(0)}
                                </div>
                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${isStale ? 'bg-gray-500' : driver.status === 'EN_ROUTE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                    <h4 className="font-semibold text-sm truncate">{driver.name}</h4>
                                    <span className={`text-[10px] font-mono ${isStale ? 'text-red-400' : 'text-slate-400'}`}>{getTimeAgo(driver.lastUpdate)}</span>
                                </div>
                                <span className="text-xs text-slate-400">{driver.status === 'EN_ROUTE' ? 'Em rota' : 'Parado'}</span>
                            </div>
                        </div>
                        )
                    })}
                </div>
            </div>
        )}
        
        <div className="p-4 border-t border-slate-700 mt-auto">
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-3 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition">
                <LogOut size={16} /> SAIR
            </button>
        </div>
      </div>

      {/* Main Map */}
      <div className="flex-1 relative bg-slate-900">
         {viewMode === 'LIVE' ? (
             <MapComponent 
                userLocation={ITAJAI_CENTER}
                driverLocations={driverLocations}
                activeRoutes={liveRoutes}
             />
         ) : (
             <div className="flex items-center justify-center h-full opacity-30">
                 <Logo className="w-48 h-48 grayscale" />
             </div>
         )}
      </div>
    </div>
  );
};