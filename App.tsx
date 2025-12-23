import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { DriverView } from './components/DriverView';
import { AdminView } from './components/AdminView';
import { ChatWidget } from './components/ChatWidget';
import { UserRole } from './types';
import { db } from './services/mockDb';
import { MapPinOff, WifiOff } from 'lucide-react';
import { Logo } from './components/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<{name: string, role: UserRole, id?: string} | null>(null);
  const [geoPermission, setGeoPermission] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('loading');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Connectivity Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enforce Geolocation on App Start
  useEffect(() => {
    const checkGeo = () => {
      if (!('geolocation' in navigator)) {
        setGeoPermission('denied');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setGeoPermission('granted');
        },
        (error) => {
          console.error("Geo Error", error);
          setGeoPermission('denied');
        },
        { enableHighAccuracy: true }
      );
    };

    checkGeo();
    
    // Also request permissions query if available to watch for changes
    if (navigator.permissions && navigator.permissions.query) {
       navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'granted') setGeoPermission('granted');
          else if (result.state === 'denied') setGeoPermission('denied');
          
          result.onchange = () => {
             if (result.state === 'granted') setGeoPermission('granted');
             else setGeoPermission('denied');
          };
       });
    }
  }, []);

  const handleLogin = (name: string, role: UserRole) => {
    const loggedUser = db.login(name, role);
    if ('id' in loggedUser) {
        setUser({ name: loggedUser.name, role: loggedUser.role, id: loggedUser.id });
    } else {
        setUser({ name: loggedUser.name, role: loggedUser.role });
    }
  };

  const handleLogout = () => {
    if (user?.role === UserRole.DRIVER && user.id) {
       // Optional: Set driver to offline when logging out
       // db.updateDriverStatus(user.id, 'OFFLINE'); 
    }
    setUser(null);
  };

  // 1. Permission Gate
  if (geoPermission === 'denied') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
         <div className="bg-red-500/20 p-6 rounded-full mb-6 animate-pulse">
            <MapPinOff size={64} className="text-red-500" />
         </div>
         <h1 className="text-2xl font-black mb-2">Localização Necessária</h1>
         <p className="text-slate-300 max-w-xs mx-auto mb-8">
            Para utilizar o sistema H2 Brasil, é obrigatório permitir o acesso à sua localização em tempo real.
         </p>
         <button 
           onClick={() => window.location.reload()}
           className="px-8 py-3 bg-[#009c3b] text-white font-bold rounded-xl shadow-lg hover:scale-105 transition"
         >
            Tentar Novamente
         </button>
      </div>
    );
  }

  // 2. Loading State (optional, usually fast)
  if (geoPermission === 'loading') {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
              <Logo className="w-24 h-24 animate-bounce" />
          </div>
      );
  }

  // 3. Main App Flow
  if (!user) {
    return (
        <>
            {!isOnline && (
                <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1 z-50 flex justify-center gap-2">
                    <WifiOff size={14} /> SEM CONEXÃO COM A INTERNET
                </div>
            )}
            <Login onLogin={handleLogin} />
        </>
    );
  }

  return (
    <div className="w-full h-full relative">
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1 z-50 flex justify-center gap-2">
            <WifiOff size={14} /> SEM CONEXÃO - MODO OFFLINE
        </div>
      )}
      
      {user.role === UserRole.DRIVER && user.id ? (
        <DriverView 
          driver={{
            id: user.id,
            name: user.name,
            role: UserRole.DRIVER,
            status: 'IDLE',
            lastUpdate: Date.now()
          }} 
          onLogout={handleLogout}
        />
      ) : (
        <AdminView onLogout={handleLogout} />
      )}
      
      {/* AI Assistant for logistics help */}
      <ChatWidget />
    </div>
  );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}

export default App;