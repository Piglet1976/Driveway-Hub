// src/types/index.ts
import { Request } from 'express';

// Extend Express Request to include user from JWT
declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        iat: number;
        exp: number;
      };
    }
  }
}

// User Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'driver' | 'host' | 'both';
  phone?: string;
  email_verified: boolean;
  created_at: Date;
}

// Vehicle Types
export interface Vehicle {
  id: string;
  user_id: string;
  tesla_vehicle_id: number;
  vin: string;
  display_name: string;
  model: string;
  year: number;
  color: string;
  length_inches: number;
  width_inches: number;
  height_inches: number;
  is_active: boolean;
}

// Driveway Types
export interface Driveway {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  driveway_type: 'concrete' | 'asphalt' | 'gravel' | 'paved';
  is_covered: boolean;
  max_vehicle_length: number;
  max_vehicle_width: number;
  max_vehicle_height?: number;
  hourly_rate: number;
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  has_ev_charging: boolean;
  charging_connector_type?: string;
  has_security_camera: boolean;
  has_lighting: boolean;
  listing_status: 'active' | 'inactive' | 'suspended';
  is_available: boolean;
  coordinates?: { lat: number; lng: number };
}

// Booking Types
export interface Booking {
  id: string;
  driver_id: string;
  vehicle_id: string;
  driveway_id: string;
  host_id: string;
  booking_reference: string;
  start_time: Date;
  end_time: Date;
  hourly_rate: number;
  total_hours: number;
  subtotal: number;
  platform_fee: number;
  total_amount: number;
  booking_status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'no_show';
  driver_notes?: string;
  host_notes?: string;
  tesla_navigation_sent: boolean;
  auto_park_attempted: boolean;
  auto_park_successful: boolean;
  arrival_detected_at?: Date;
  departure_detected_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Service Layer Types
export interface CreateBookingData {
  driver_id: string;
  vehicle_id: string;
  driveway_id: string;
  start_time: Date;
  end_time: Date;
  driver_notes?: string;
}

export interface BookingResult {
  id: string;
  reference: string;
  total_amount: number;
  host_id: string;
  host_earnings: number;
  platform_fee: number;
}

export interface PricingCalculation {
  hourly_rate: number;
  total_hours: number;
  subtotal: number;
  platform_fee: number;
  total_amount: number;
  host_earnings: number;
}

export interface PricingInput {
  hourly_rate: number;
  start_time: Date;
  end_time: Date;
  has_ev_charging?: boolean;
  charging_premium?: number;
}

// Analytics Types
export interface HostAnalytics {
  total_bookings: number;
  total_earnings: number;
  avg_booking_value: number;
  completed_bookings: number;
  cancelled_bookings: number;
  occupancy_rate: number;
}

export interface PlatformAnalytics {
  total_bookings: number;
  total_revenue: number;
  platform_revenue: number;
  unique_drivers: number;
  unique_hosts: number;
  avg_booking_value: number;
}

// Tesla Integration Types
export interface TeslaNavigationData {
  vehicle_id: string;
  destination: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  booking_reference: string;
}

export interface TeslaAutoParkResult {
  success: boolean;
  error?: string;
  position?: {
    latitude: number;
    longitude: number;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

// Error Types
export interface BusinessError extends Error {
  code: string;
  statusCode: number;
}

export class DrivewayHubError extends Error implements BusinessError {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'DrivewayHubError';
  }
}

// Database Types
export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}