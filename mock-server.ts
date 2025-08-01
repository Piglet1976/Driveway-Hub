import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

const app = express();

// CORS configuration for frontend integration
app.use(cors({
  origin: [
    'http://localhost:3001', // React dev server
    'http://localhost:3000', // Alternative frontend port
    'http://frontend:3000'   // Docker internal network
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// JWT Middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  
  const mockUser = {
    id: 'mock-uuid-123',
    first_name: 'Demo',
    last_name: 'User',
    email: email || 'hello@driveway-hub.app',
  };
  
  const token = jwt.sign(
    { 
      email: mockUser.email, 
      id: mockUser.id,
      first_name: mockUser.first_name,
      last_name: mockUser.last_name
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
  
  console.log('✅ Mock login successful for:', mockUser.email);
  
  res.json({
    token,
    user: mockUser
  });
});

// Mock driveways endpoint
app.get('/api/driveways', authenticateToken, (req, res) => {
  const mockDriveways = [
    {
      id: 'driveway-1',
      title: 'Cozy Downtown Driveway',
      description: 'Spacious and secure parking spot in the heart of downtown. Perfect for Tesla vehicles with nearby charging options.',
      latitude: 37.7749,
      longitude: -122.4194,
      hourly_rate: 5.0,
      daily_rate: 30.0,
      weekly_rate: 180.0,
      monthly_rate: 600.0,
      available: true,
      has_ev_charging: false,
      charging_connector_type: null,
      charging_rate_kw: null,
      estimated_charge_time: null,
      host_name: 'John Doe',
      host_email: 'john@example.com'
    },
    {
      id: 'driveway-2', 
      title: 'Tesla Supercharger Driveway',
      description: 'Premium covered parking with dedicated Tesla Supercharger access. Automated entry via Tesla app integration.',
      latitude: 37.7849,
      longitude: -122.4094,
      hourly_rate: 8.5,
      daily_rate: 50.0,
      weekly_rate: 280.0,
      monthly_rate: 950.0,
      available: true,
      has_ev_charging: true,
      charging_connector_type: 'Tesla',
      charging_rate_kw: 150, // 150kW Supercharger
      estimated_charge_time: '45 min to 80%', // For low battery vehicles
      charge_cost_per_kwh: 0.28,
      host_name: 'Sarah Tesla',
      host_email: 'sarah@example.com'
    },
    {
      id: 'driveway-3',
      title: 'Airport Parking - 5min walk',
      description: 'Secure long-term parking just 5 minutes from SFO. Ideal for business travelers with Tesla vehicles.',
      latitude: 37.7649,
      longitude: -122.4294,
      hourly_rate: 6.0,
      daily_rate: 35.0,
      weekly_rate: 210.0,
      monthly_rate: 720.0,
      available: true,
      has_ev_charging: false,
      charging_connector_type: null,
      charging_rate_kw: null,
      estimated_charge_time: null,
      host_name: 'Mike Airport',
      host_email: 'mike@example.com'
    }
  ];

  console.log('✅ Serving mock driveways:', mockDriveways.length, 'available');
  
  res.json({
    driveways: mockDriveways,
    count: mockDriveways.length
  });
});

// Mock user profile endpoint
app.get('/api/users/profile', authenticateToken, (req, res) => {
  const mockProfile = {
    id: 'mock-uuid-123',
    first_name: 'Demo',
    last_name: 'User',
    email: req.user.email,
    user_type: 'driver',
    phone: '+1-555-0123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('✅ Serving user profile for:', req.user.email);
  
  res.json({
    user: mockProfile
  });
});

// Mock vehicles endpoint
app.get('/api/users/vehicles', authenticateToken, (req, res) => {
  const mockVehicles = [
    {
      id: 'vehicle-1',
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      color: 'Pearl White',
      license_plate: 'TESLA123',
      vin: '5YJ3E1EA1JF000001',
      tesla_vin: '5YJ3E1EA1JF000001',
      length: 185, // inches
      width: 73,
      height: 57,
      // Battery and charging data
      battery_level: 23,
      battery_range: 68, // miles remaining
      max_range: 296, // EPA estimated range
      is_charging: false,
      charge_port_open: false,
      charging_rate: null,
      time_to_full_charge: null,
      charge_limit_soc: 80, // State of charge limit
      needs_charging: true, // Below 25%
      location: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    },
    {
      id: 'vehicle-2',
      make: 'Tesla',
      model: 'Model Y',
      year: 2024,
      color: 'Midnight Silver',
      license_plate: 'TESLA456',
      vin: '5YJYGDEE1LF000002',
      tesla_vin: '5YJYGDEE1LF000002',
      length: 187,
      width: 76,
      height: 64,
      // Battery and charging data
      battery_level: 78,
      battery_range: 267, // miles remaining
      max_range: 330, // EPA estimated range
      is_charging: false,
      charge_port_open: false,
      charging_rate: null,
      time_to_full_charge: null,
      charge_limit_soc: 80,
      needs_charging: false,
      location: {
        latitude: 37.7849,
        longitude: -122.4094
      }
    }
  ];

  console.log('✅ Serving mock vehicles:', mockVehicles.length, 'Tesla vehicles with battery data');
  
  res.json({
    vehicles: mockVehicles,
    count: mockVehicles.length
  });
});

// Mock booking creation endpoint
app.post('/api/bookings/create', authenticateToken, (req, res) => {
  const { driveway_id, vehicle_id, start_time, end_time, driver_notes } = req.body;
  
  // Mock booking calculation
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  const hourlyRate = 8.50; // From mock driveway data
  const subtotal = hours * hourlyRate;
  const platformFee = subtotal * 0.15; // 15% platform fee
  const totalAmount = subtotal + platformFee;
  const hostPayout = subtotal - platformFee;

  const mockBooking = {
    booking_id: 'booking-' + Math.random().toString(36).substr(2, 9),
    booking_reference: 'DH-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    total_amount: parseFloat(totalAmount.toFixed(2)),
    platform_fee: parseFloat(platformFee.toFixed(2)),
    host_payout: parseFloat(hostPayout.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    hours: hours,
    hourly_rate: hourlyRate,
    start_time: start_time,
    end_time: end_time,
    status: 'confirmed',
    driver_id: req.user.id,
    driveway_id: driveway_id,
    vehicle_id: vehicle_id,
    driver_notes: driver_notes,
    created_at: new Date().toISOString()
  };

  console.log('✅ Mock booking created:', mockBooking.booking_reference, 
    `$${mockBooking.total_amount} (${hours}h × $${hourlyRate})`);
  
  res.status(201).json({
    message: 'Booking created successfully',
    booking: mockBooking
  });
});

// Mock booking details endpoint
app.get('/api/bookings/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const mockBookingDetails = {
    id: id,
    booking_reference: 'DH-DEMO01',
    status: 'confirmed',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
    total_amount: 34.00,
    platform_fee: 5.10,
    host_payout: 28.90,
    driveway_title: 'Tesla Supercharger Driveway',
    driveway_description: 'Premium covered parking with Tesla Supercharger',
    vehicle_make: 'Tesla',
    vehicle_model: 'Model 3',
    license_plate: 'TESLA123'
  };

  console.log('✅ Serving booking details for:', id);
  
  res.json({
    booking: mockBookingDetails
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 Driveway Hub API Server running on port', PORT);
  console.log('📊 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔗 Frontend URLs: http://localhost:3001');
  console.log('✨ Mock Mode: All endpoints serving demo data');
  console.log('🎯 Ready for investor presentations!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down Driveway Hub API server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Shutting down Driveway Hub API server...');
  process.exit(0);
});