import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, onDisconnect, serverTimestamp } from 'firebase/database';
import { Driver, DeliveryRoute, LocationPoint, UserRole } from '../types';

// CONFIGURAÇÃO REAL DO FIREBASE
// Substitua pelas chaves de produção da H2 Brasil
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
  private offlineQueue: Array<{ path: string; data: any; method: 'set' | 'update' }> = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initListeners();
    this.handleConnectionState();
    
    // Listeners nativos do navegador para internet
    window.addEventListener('online', () => { this.isOnline = true; this.processOfflineQueue(); });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  // 1. MONITORAMENTO DE CONEXÃO ROBUSTO
  private handleConnectionState() {
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        this.isOnline = true;
        this.processOfflineQueue();
      } else {
        this.isOnline = false;
      }
      // Dispara evento para a UI saber se está offline
      window.dispatchEvent(new CustomEvent('connection-change', { detail: { online: this.isOnline } }));
    });
  }

  // 2. PROCESSAMENTO DE FILA OFFLINE (Sincronização)
  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`[SYNC] Enviando ${this.offlineQueue.length} ações pendentes...`);
    
    // Copia e limpa a fila para processar
    const queueToProcess = [...this.offlineQueue];
    this.offlineQueue = []; 

    for (const task of queueToProcess) {
      try {
        const dbRef = ref(database, task.path);
        if (task.method === 'set') await set(dbRef, task.data);
        else await update(dbRef, task.data);
      } catch (e) {
        console.error("[SYNC FALHOU] Retornando item para a fila:", e);
        this.offlineQueue.push(task); // Devolve para tentar depois
      }
    }
  }

  // 3. ESCRITA SEGURA (Wrapper)
  private async safeWrite(path: string, data: any, method: 'set' | 'update' = 'update') {
    if (!this.isOnline) {
      this.offlineQueue.push({ path, data, method });
      console.warn(`[OFFLINE] Dados salvos localmente: ${path}`);
      return;
    }
    try {
      const dbRef = ref(database, path);
      if (method === 'set') await set(dbRef, data);
      else await update(dbRef, data);
    } catch (error) {
      console.error(`Erro ao escrever em ${path}, enfileirando:`, error);
      this.offlineQueue.push({ path, data, method });
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

  // --- MÉTODOS DE NEGÓCIO ---

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

    // PRESENÇA: Se desconectar abruptamente, marca como OFFLINE no servidor
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

    // Mantém status de pausa se estiver ativo
    const status = driver.status === 'ON_BREAK' ? 'ON_BREAK' : 'EN_ROUTE';
    
    // UI Update Imediato (Otimista)
    driver.currentLocation = coords;
    driver.status = status;
    driver.lastUpdate = Date.now();

    // Server Update (Queueable)
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

    // Verifica se a rota acabou
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