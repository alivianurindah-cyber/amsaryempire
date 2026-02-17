export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar: string;
  department?: string;
  phone?: string;
  employeeId?: string;
  icNumber?: string;
  homeAddress?: string;
  emergencyPhone?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole; // Snapshot of role at time of record
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  timestamp: number;
  dateStr: string;
  timeStr: string;
  location: LocationData;
  photoUrl: string; // Base64 data URL
  aiVerification?: string;
  synced: boolean;
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  CAMERA = 'CAMERA',
  HISTORY = 'HISTORY',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS'
}