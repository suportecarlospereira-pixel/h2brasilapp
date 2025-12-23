
export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPoint {
  id: string;
  name: string;
  type: 'CRAS' | 'UPA' | 'UBS' | 'PREFEITURA' | 'SECRETARIA' | 'CLIENTE' | 'OUTRO';
  address: string;
  coords: Coordinates;
}

export interface Driver {
  id: string;
  name: string;
  role: UserRole.DRIVER;
  currentLocation?: Coordinates;
  status: 'IDLE' | 'EN_ROUTE' | 'OFFLINE' | 'ON_BREAK'; // Added ON_BREAK
  lastUpdate: number;
  avatarUrl?: string;
}

export interface DeliveryRoute {
  id: string;
  driverId: string;
  stops: LocationPoint[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startTime: number;
  completedStops: string[]; // IDs of successfully completed stops
  failedStops: string[]; // IDs of stops with issues
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K'
}
