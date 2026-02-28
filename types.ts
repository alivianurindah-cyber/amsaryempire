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
  typhoidCertificateUrl?: string;
  typhoidExpiryDate?: string;
  typhoidVerificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  typhoidVerificationDetails?: string;
  shiftStart?: string; // "HH:mm"
  shiftEnd?: string; // "HH:mm"
  baseSalary?: number;
  salaryType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
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
  otStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  CAMERA = 'CAMERA',
  HISTORY = 'HISTORY',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
  CALENDAR = 'CALENDAR'
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string; // Base64 data URL
  lyrics: string;
  createdAt: number;
}