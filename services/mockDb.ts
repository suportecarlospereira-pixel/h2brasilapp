import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, onDisconnect, serverTimestamp } from 'firebase/database';
import { Driver, DeliveryRoute, LocationPoint, UserRole } from '../types';

// CONFIGURAÇÃO REAL DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyB1w2ZU2S9u7WG41DWf9utYwpOUlfAYLvk",
  authDomain: "h2app-70d40.firebaseapp.com",
  databaseURL: "https://h2app-70d40-default-rtdb.firebaseio.com",
  projectId: "h2app-70d40",
  storageBucket: "h2app-70d40.firebasestorage.app",
  messagingSenderId: "496771157396",
  appId: "1:496771157396:web:377c7a3b0b6ac1f9611381",
  measurementId: "G-Q6LL5DJ6K0"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class DBService {
  private drivers: Driver[] = [];
  private routes: DeliveryRoute[] = [];
  // Inicializa lendo a fila do disco para não perder dados se fechar o app
  private offlineQueue: Array<{ path: string; data: any; method: 'set' | 'update' }> = 
    JSON.parse(localStorage.getItem('h2_offline_queue') || '[]');
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initListeners();
    this.handleConnectionState();
    
    window.addEventListener('online', () => { this.isOnline = true; this.processOfflineQueue(); });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  // Helper para salvar fila no disco
  private saveQueue() {
    localStorage.setItem('h2_offline_queue', JSON.stringify(this.offlineQueue));
  }

  private handleConnectionState() {
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        this.isOnline = true;
        this.processOfflineQueue();
      } else {
        this.isOnline = false;
      }
      window.dispatchEvent(new CustomEvent('connection-change', { detail: { online: this.isOnline } }));
    });
  }

  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const queueToProcess = [...this.offlineQueue];
    this.offlineQueue = []; 
    this.saveQueue();

    for (const task of queueToProcess) {
      try {
        const dbRef = ref(database, task.path);
        if (task.method === 'set') await set(dbRef, task.data);
        else await update(dbRef, task.data);
      } catch (e) {
        console.error("Erro sync, devolvendo para fila:", e);
        this.offlineQueue.push(task);
        this.saveQueue();
      }
    }
  }

  private async safeWrite(path: string, data: any, method: 'set' | 'update' = 'update') {
    if (!this.isOnline) {
      this.offlineQueue.push({ path, data, method });
      this.saveQueue();
      return;
    }
    try {
      const dbRef = ref(database, path);
      // No Firebase, setar como null deleta o nó
      if (method === 'set') await set(dbRef, data);
      else await update(dbRef, data);
    } catch (error) {
      this.offlineQueue.push({ path, data, method });
      this.saveQueue();
    }
  }

  private initListeners() {
    onValue(ref(database, 'drivers'), (snapshot) => {
      const data = snapshot.val();
      this.drivers = data ? Object.values(data) : [];
      this.notifyUpdate();
    });

    onValue(ref(database, 'routes'), (snapshot) => {
      const data = snapshot.val();
      this.routes = data ? Object.values(data).map((r: any) => ({
            ...r,
            completedStops: r.completedStops || [], 
            failedStops: r.failedStops || [],
            stops: r.stops || []
        })) : [];
      this.notifyUpdate();
    });
  }

  private notifyUpdate() {
    window.dispatchEvent(new Event('db-update'));
  }

  // --- MÉTODOS DE AÇÃO ---

  // NOVO: Método para excluir motorista
  deleteDriver(driverId: string) {
      // Passar 'null' para o set remove o registro no Firebase
      this.safeWrite(`drivers/${driverId}`, null, 'set');
  }

  async login(name: string, role: UserRole): Promise<Driver | { name: string, role: UserRole }> {
    if (role === UserRole.ADMIN) {
      return { name, role };
    }
    
    const normalizedName = name.trim();
    let driver = this.drivers.find(d => d.name.toLowerCase() === normalizedName.toLowerCase());
    
    if (!driver) {
      const newId = crypto.randomUUID();
      driver = {
        id: newId,
        name: normalizedName,
        role: UserRole.DRIVER,
        status: 'IDLE',
        lastUpdate: Date.now(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedName}`
      };
      await this.safeWrite('drivers/' + newId, driver, 'set');
    } else {
        await this.safeWrite('drivers/' + driver.id, {
            status: 'IDLE',
            lastUpdate: serverTimestamp()
        });
    }

    const presenceRef = ref(database, 'drivers/' + driver.id);
    onDisconnect(presenceRef).update({
        status: 'OFFLINE',
        lastUpdate: serverTimestamp()
    });
    
    return driver;
  }

  updateDriverLocation(driverId: string, coords: { lat: number; lng: number }) {
    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) return;

    const status = driver.status === 'ON_BREAK' ? 'ON_BREAK' : 'EN_ROUTE';
    
    driver.currentLocation = coords;
    driver.status = status;
    driver.lastUpdate = Date.now();

    this.safeWrite('drivers/' + driverId, {
      currentLocation: coords,
      lastUpdate: serverTimestamp(),
      status: status
    });
  }

  createRoute(driverId: string, stops: LocationPoint[]): DeliveryRoute {
    const routeId = crypto.randomUUID();
    const newRoute: DeliveryRoute = {
      id: routeId,
      driverId,
      stops,
      status: 'IN_PROGRESS',
      startTime: Date.now(),
      completedStops: [],
      failedStops: []
    };
    
    this.safeWrite('routes/' + routeId, newRoute, 'set');
    this.safeWrite('drivers/' + driverId, { status: 'EN_ROUTE' });

    return newRoute;
  }

  completeStop(routeId: string, stopId: string, podData?: { receiverName: string; observation: string }) {
    const cachedRoute = this.routes.find(r => r.id === routeId);
    if (!cachedRoute) return;

    const currentCompleted = [...(cachedRoute.completedStops || []), stopId];
    
    const updates: any = {
        completedStops: currentCompleted,
        [`stopsData/${stopId}`]: {
            ...podData,
            status: 'SUCCESS',
            timestamp: serverTimestamp()
        }
    };

    const totalProcessed = currentCompleted.length + (cachedRoute.failedStops?.length || 0);
    if (totalProcessed === cachedRoute.stops.length) {
        updates.status = 'COMPLETED';
        updates.endTime = serverTimestamp();
        this.safeWrite('drivers/' + cachedRoute.driverId, { status: 'IDLE' });
    }

    this.safeWrite('routes/' + routeId, updates);
  }

  reportIssue(routeId: string, stopId: string, issue: string) {
      const cachedRoute = this.routes.find(r => r.id === routeId);
      if (!cachedRoute) return;

      const currentFailed = [...(cachedRoute.failedStops || []), stopId];
      const updates: any = {
          failedStops: currentFailed,
          [`stopsData/${stopId}`]: {
              status: 'FAILED',
              issue: issue,
              timestamp: serverTimestamp()
          }
      };

      const totalProcessed = (cachedRoute.completedStops?.length || 0) + currentFailed.length;
      if (totalProcessed === cachedRoute.stops.length) {
          updates.status = 'COMPLETED';
          updates.endTime = serverTimestamp();
          this.safeWrite('drivers/' + cachedRoute.driverId, { status: 'IDLE' });
      }

      this.safeWrite('routes/' + routeId, updates);
  }

  toggleDriverStatus(driverId: string, currentStatus: string) {
    const newStatus = currentStatus === 'ON_BREAK' ? 'IDLE' : 'ON_BREAK';
    this.safeWrite('drivers/' + driverId, {
        status: newStatus,
        lastUpdate: serverTimestamp()
    });
    return newStatus;
  }

  getDrivers() { return this.drivers; }
  getActiveRoute(driverId: string) { return this.routes.find(r => r.driverId === driverId && r.status === 'IN_PROGRESS'); }
  getAllRoutes() { return this.routes; }
}

export const db = new DBService();