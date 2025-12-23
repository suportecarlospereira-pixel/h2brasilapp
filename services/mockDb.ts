
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, push, child, get } from 'firebase/database';
import { Driver, DeliveryRoute, LocationPoint, UserRole } from '../types';

// Real Firebase Configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class DBService {
  private drivers: Driver[] = [];
  private routes: DeliveryRoute[] = [];
  private hasInitializedListeners = false;

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    if (this.hasInitializedListeners) return;
    this.hasInitializedListeners = true;

    // Listen to Drivers
    const driversRef = ref(database, 'drivers');
    onValue(driversRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.drivers = Object.values(data);
      } else {
        this.drivers = [];
      }
      this.notifyUpdate();
    });

    // Listen to Routes
    const routesRef = ref(database, 'routes');
    onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Safe mapping to ensure arrays exist
        this.routes = Object.values(data).map((r: any) => ({
            ...r,
            completedStops: r.completedStops || [], 
            failedStops: r.failedStops || [],
            stops: r.stops || []
        }));
      } else {
        this.routes = [];
      }
      this.notifyUpdate();
    });
  }

  private notifyUpdate() {
    window.dispatchEvent(new Event('db-update'));
  }

  // --- Auth ---
  login(name: string, role: UserRole): Driver | { name: string, role: UserRole } {
    if (role === UserRole.ADMIN) {
      return { name, role };
    }
    
    // For drivers, we either find existing or create new one on Firebase
    let driver = this.drivers.find(d => d.name.toLowerCase() === name.toLowerCase());
    
    if (!driver) {
      const newId = crypto.randomUUID();
      driver = {
        id: newId,
        name,
        role: UserRole.DRIVER,
        status: 'OFFLINE',
        lastUpdate: Date.now(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      };
      
      // Save to Firebase
      set(ref(database, 'drivers/' + newId), driver);
    } else {
        // Ensure status is online if logging in
        update(ref(database, 'drivers/' + driver.id), {
            status: 'IDLE',
            lastUpdate: Date.now()
        });
    }
    
    return driver;
  }

  // --- Driver Actions ---
  toggleDriverStatus(driverId: string, currentStatus: string) {
      const newStatus = currentStatus === 'ON_BREAK' ? 'IDLE' : 'ON_BREAK';
      update(ref(database, 'drivers/' + driverId), {
          status: newStatus,
          lastUpdate: Date.now()
      });
      return newStatus;
  }

  updateDriverLocation(driverId: string, coords: { lat: number; lng: number }) {
    const driver = this.drivers.find(d => d.id === driverId);
    // Don't auto-update status if on break
    const status = driver?.status === 'ON_BREAK' ? 'ON_BREAK' : 'EN_ROUTE';

    // Optimistic update
    const idx = this.drivers.findIndex(d => d.id === driverId);
    if (idx !== -1) {
       this.drivers[idx].currentLocation = coords;
       this.drivers[idx].lastUpdate = Date.now();
       this.drivers[idx].status = status; 
    }

    // Firebase Update
    update(ref(database, 'drivers/' + driverId), {
      currentLocation: coords,
      lastUpdate: Date.now(),
      status: status
    });
  }

  createRoute(driverId: string, stops: LocationPoint[]): DeliveryRoute {
    const routeId = crypto.randomUUID();
    
    const newRoute: DeliveryRoute = {
      id: routeId,
      driverId,
      stops: stops,
      status: 'IN_PROGRESS',
      startTime: Date.now(),
      completedStops: [],
      failedStops: []
    };
    
    set(ref(database, 'routes/' + routeId), newRoute);
    
    update(ref(database, 'drivers/' + driverId), {
        status: 'EN_ROUTE'
    });

    return newRoute;
  }

  reportIssue(routeId: string, stopId: string, issue: string) {
      const routeRef = ref(database, 'routes/' + routeId);
      const cachedRoute = this.routes.find(r => r.id === routeId);

      if (cachedRoute) {
          const currentFailed = Array.isArray(cachedRoute.failedStops) ? cachedRoute.failedStops : [];
          
          if (!currentFailed.includes(stopId)) {
              const updatedFailed = [...currentFailed, stopId];
              const updates: any = {
                  failedStops: updatedFailed
              };
              
              updates[`stopsData/${stopId}`] = {
                  status: 'FAILED',
                  issue: issue,
                  timestamp: Date.now()
              };

              // Check completion (total stops = success + failed)
              const totalProcessed = (cachedRoute.completedStops?.length || 0) + updatedFailed.length;
              if (totalProcessed === cachedRoute.stops.length) {
                  updates.status = 'COMPLETED';
                  update(ref(database, 'drivers/' + cachedRoute.driverId), { status: 'IDLE' });
              }

              update(routeRef, updates);
          }
      }
  }

  completeStop(routeId: string, stopId: string, podData?: { receiverName: string; observation: string }) {
    const routeRef = ref(database, 'routes/' + routeId);
    const cachedRoute = this.routes.find(r => r.id === routeId);
    
    if (cachedRoute) {
        const currentCompleted = Array.isArray(cachedRoute.completedStops) ? cachedRoute.completedStops : [];
            
        if (!currentCompleted.includes(stopId)) {
            const updatedCompleted = [...currentCompleted, stopId];
            
            const updates: any = {
                completedStops: updatedCompleted
            };

            if (podData) {
                updates[`stopsData/${stopId}`] = {
                    ...podData,
                    status: 'SUCCESS',
                    timestamp: Date.now()
                };
            }

            // Check completion
            const totalProcessed = updatedCompleted.length + (cachedRoute.failedStops?.length || 0);
            if (totalProcessed === cachedRoute.stops.length) {
                updates.status = 'COMPLETED';
                update(ref(database, 'drivers/' + cachedRoute.driverId), { status: 'IDLE' });
            }

            update(routeRef, updates).catch(err => {
                console.error("Firebase update failed:", err);
            });
        }
    }
  }

  getDrivers() { return this.drivers; }
  getActiveRoute(driverId: string) { return this.routes.find(r => r.driverId === driverId && r.status === 'IN_PROGRESS'); }
  getAllRoutes() { return this.routes; }
}

export const db = new DBService();
