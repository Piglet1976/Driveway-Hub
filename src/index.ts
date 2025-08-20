import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';
import { TeslaService } from './services/tesla.service';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://frontend:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// PostgreSQL Pool Configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'driveway_hub_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || undefined,
});

// Redis Client Configuration
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

redisClient.on('error', (err: Error) => {
  console.error('❌ Redis connection error:', err.message);
});

async function connectRedis() {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  } catch (err: any) {
    console.error('❌ Failed to connect to Redis:', err.message);
    console.log('ℹ️ Proceeding without Redis for mock endpoints');
  }
}
connectRedis();

// Log database configuration
console.log('DB Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '[REDACTED]' : 'undefined'
});

// Database connection test
pool.on('connect', (client) => {
  console.log('🔗 Connected to PostgreSQL. Checking auth method...');
  client.query('SHOW password_encryption', (err, res) => {
    if (err) {
      console.error('❌ Error checking password_encryption:', err.stack);
    } else {
      console.log('🔐 Server password_encryption:', res.rows[0].password_encryption);
    }
  });
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected pool error:', err.stack);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully acquired client from pool');
    const res = await client.query('SELECT NOW()');
    console.log('✅ Test query result:', res.rows[0].now);
    client.release();
  } catch (err: any) {
    console.error('❌ Failed to connect to database:', err.message);
    console.error('Full error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail
    });
  }
}
testConnection().catch(() => {}); // Prevent process exit on error

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Initialize Tesla Service
const teslaService = new TeslaService(pool);

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Real database login
app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Query real user from database
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, user_type, created_at FROM users WHERE email = $1',
      [email || 'driver@test.com']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    console.log('Real database login for:', user.email, '- Token:', token);
    
    res.json({ 
      token, 
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Database error during login' });
  }
});

// Real database driveways
app.get('/api/driveways', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id, d.title, d.description, d.latitude, d.longitude,
        d.hourly_rate, d.daily_rate, d.is_available as available,
        d.has_ev_charging, d.charging_connector_type,
        u.first_name as host_first_name, u.last_name as host_last_name
      FROM driveways d
      JOIN users u ON d.host_id = u.id
      WHERE d.listing_status = 'active'
      ORDER BY d.created_at DESC
    `);
    
    const driveways = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      hourly_rate: parseFloat(row.hourly_rate),
      daily_rate: row.daily_rate ? parseFloat(row.daily_rate) : null,
      available: row.available,
      has_ev_charging: row.has_ev_charging,
      charging_connector_type: row.charging_connector_type,
      // Mock Tesla-specific charging data for demo
      charging_rate_kw: row.has_ev_charging ? 150 : null,
      estimated_charge_time: row.has_ev_charging ? '45 minutes' : null,
      charge_cost_per_kwh: row.has_ev_charging ? 0.28 : null,
      host_name: `${row.host_first_name} ${row.host_last_name}`
    }));
    
    console.log(`Found ${driveways.length} driveways from database`);
    res.json({ driveways, count: driveways.length });
  } catch (err: any) {
    console.error('Driveways query error:', err.message);
    res.status(500).json({ error: 'Database error fetching driveways' });
  }
});

// Real database profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, user_type, created_at, phone, email_verified FROM users WHERE email = $1',
      [req.user.email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    console.log(`Profile loaded for user: ${user.email}`);
    
    res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type,
        phone: user.phone,
        email_verified: user.email_verified,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Profile query error:', err.message);
    res.status(500).json({ error: 'Database error fetching profile' });
  }
});

// Real database vehicles
app.get('/api/users/vehicles', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [req.user.email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    const result = await pool.query(`
      SELECT 
        id, tesla_vehicle_id, vin, display_name, model, year, color,
        length_inches, width_inches, height_inches, is_active, last_seen_at
      FROM vehicles 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [userId]);
    
    const vehicles = result.rows.map(row => ({
      id: row.id,
      tesla_vehicle_id: row.tesla_vehicle_id,
      vin: row.vin,
      make: 'Tesla', // All vehicles in this demo are Tesla
      model: row.model,
      year: row.year,
      color: row.color,
      display_name: row.display_name,
      license_plate: row.vin ? row.vin.slice(-6) : 'ABC123', // Mock license from VIN
      length: row.length_inches,
      width: row.width_inches, 
      height: row.height_inches,
      // Tesla-specific demo data for frontend
      battery_level: Math.floor(Math.random() * 60) + 20, // 20-80%
      battery_range: Math.floor(Math.random() * 200) + 150, // 150-350 miles
      max_range: 350,
      is_charging: Math.random() > 0.7,
      charge_port_open: false,
      charging_rate: Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 25 : null,
      time_to_full_charge: null,
      charge_limit_soc: 90,
      needs_charging: Math.random() > 0.6,
      location: {
        latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.1
      }
    }));
    
    // Add calculated charging status
    vehicles.forEach(vehicle => {
      vehicle.needs_charging = vehicle.battery_level < 30;
    });
    
    console.log(`Found ${vehicles.length} vehicles for user: ${req.user.email}`);
    res.json({ vehicles, count: vehicles.length });
  } catch (err: any) {
    console.error('Vehicles query error:', err.message);
    res.status(500).json({ error: 'Database error fetching vehicles' });
  }
});

// Tesla OAuth initiation
app.get('/api/auth/tesla', authenticateToken, async (req, res) => {
  try {
    const authUrl = await teslaService.generateAuthUrl(req.user.id);
    console.log('Tesla OAuth redirect URL:', authUrl);
    res.json({ auth_url: authUrl });
  } catch (error: any) {
    console.error('Tesla auth URL generation error:', error.message);
    console.error('Full error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('TESLA_CLIENT_ID')) {
      res.status(500).json({ 
        error: 'Tesla integration not configured: Client ID missing',
        details: 'TESLA_CLIENT_ID environment variable is not set'
      });
    } else if (error.message.includes('TESLA_CLIENT_SECRET')) {
      res.status(500).json({ 
        error: 'Tesla integration not configured: Client Secret missing',
        details: 'TESLA_CLIENT_SECRET environment variable is not set'
      });
    } else if (error.message.includes('TESLA_OAUTH_REDIRECT_URI')) {
      res.status(500).json({ 
        error: 'Tesla integration not configured: Redirect URI missing',
        details: 'TESLA_OAUTH_REDIRECT_URI environment variable is not set'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate Tesla authorization URL',
        details: error.message
      });
    }
  }
});

// Tesla OAuth callback
app.post('/api/auth/tesla/callback', authenticateToken, async (req, res) => {
  const { code, state } = req.body;
  
  try {
    // Parse and verify state
    const stateData = teslaService.parseState(state);
    if (!stateData || stateData.userId !== req.user.id) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    // Get stored code verifier
    const codeVerifier = await teslaService.getCodeVerifier(req.user.id);
    if (!codeVerifier) {
      return res.status(400).json({ error: 'Code verifier not found. Please restart OAuth flow.' });
    }
    
    // Exchange code for tokens
    const tokenData = await teslaService.exchangeCodeForToken(code, codeVerifier);
    
    // Store tokens
    await teslaService.storeTokens(req.user.id, tokenData);
    
    // Fetch and sync vehicles
    try {
      const vehicles = await teslaService.getVehicles(tokenData.access_token);
      await teslaService.syncVehiclesToDatabase(req.user.id, vehicles);
      console.log(`Synced ${vehicles.length} Tesla vehicles for user: ${req.user.email}`);
    } catch (syncError) {
      console.error('Vehicle sync error (non-fatal):', syncError);
    }
    
    console.log('Tesla OAuth success for user:', req.user.email);
    res.json({ 
      success: true, 
      message: 'Tesla account connected successfully',
      expires_in: tokenData.expires_in
    });
    
  } catch (err: any) {
    console.error('Tesla OAuth error:', err.message);
    res.status(500).json({ error: 'Tesla authentication failed: ' + err.message });
  }
});

// Get Tesla vehicles for authenticated user
app.get('/api/tesla/vehicles', authenticateToken, async (req, res) => {
  try {
    // Get valid access token (handles refresh if needed)
    const accessToken = await teslaService.getValidAccessToken(req.user.id);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Tesla account not connected or token expired' });
    }
    
    // Fetch vehicles from Tesla API
    const vehicles = await teslaService.getVehicles(accessToken);
    
    // Sync to database
    await teslaService.syncVehiclesToDatabase(req.user.id, vehicles);
    
    console.log(`Fetched ${vehicles.length} vehicles from Tesla API for user: ${req.user.email}`);
    res.json({ response: vehicles, count: vehicles.length });
    
  } catch (err: any) {
    console.error('Tesla vehicles error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Tesla vehicles' });
  }
});

// Get specific Tesla vehicle data
app.get('/api/tesla/vehicles/:vehicleId', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const accessToken = await teslaService.getValidAccessToken(req.user.id);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Tesla account not connected or token expired' });
    }
    
    const vehicleData = await teslaService.getVehicleData(accessToken, vehicleId);
    
    console.log(`Fetched data for Tesla vehicle ${vehicleId} for user: ${req.user.email}`);
    res.json({ response: vehicleData });
    
  } catch (err: any) {
    console.error('Tesla vehicle data error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Tesla vehicle data' });
  }
});

// Wake up Tesla vehicle
app.post('/api/tesla/vehicles/:vehicleId/wake', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const accessToken = await teslaService.getValidAccessToken(req.user.id);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Tesla account not connected or token expired' });
    }
    
    const isAwake = await teslaService.wakeUpVehicle(accessToken, vehicleId);
    
    console.log(`Wake command for Tesla vehicle ${vehicleId}: ${isAwake ? 'success' : 'failed'}`);
    res.json({ success: isAwake, message: isAwake ? 'Vehicle is awake' : 'Failed to wake vehicle' });
    
  } catch (err: any) {
    console.error('Tesla wake error:', err.message);
    res.status(500).json({ error: 'Failed to wake Tesla vehicle' });
  }
});

// Send command to Tesla vehicle
app.post('/api/tesla/vehicles/:vehicleId/command/:command', authenticateToken, async (req, res) => {
  try {
    const { vehicleId, command } = req.params;
    const accessToken = await teslaService.getValidAccessToken(req.user.id);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Tesla account not connected or token expired' });
    }
    
    const result = await teslaService.sendCommand(accessToken, vehicleId, command, req.body);
    
    console.log(`Command '${command}' sent to Tesla vehicle ${vehicleId}`);
    res.json(result);
    
  } catch (err: any) {
    console.error('Tesla command error:', err.message);
    res.status(500).json({ error: `Failed to execute Tesla command: ${err.message}` });
  }
});

// Check Tesla connection status
app.get('/api/tesla/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT tesla_access_token, tesla_token_expires_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0 || !result.rows[0].tesla_access_token) {
      return res.json({ connected: false, message: 'Tesla account not connected' });
    }
    
    const expiresAt = new Date(result.rows[0].tesla_token_expires_at);
    const now = new Date();
    const isExpired = now > expiresAt;
    
    res.json({
      connected: true,
      expired: isExpired,
      expires_at: expiresAt.toISOString(),
      message: isExpired ? 'Token expired, refresh needed' : 'Tesla account connected'
    });
    
  } catch (err: any) {
    console.error('Tesla status error:', err.message);
    res.status(500).json({ error: 'Failed to check Tesla status' });
  }
});

// Real database booking create
app.post('/api/bookings/create', authenticateToken, async (req, res) => {
  const { driveway_id, vehicle_id, start_time, end_time, driver_notes } = req.body;
  
  try {
    // SECURITY: Validate start time is not in the past
    const startTime = new Date(start_time);
    const now = new Date();
    if (startTime < now) {
      return res.status(400).json({ error: 'Start time cannot be in the past' });
    }
    
    // Get user ID from token
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [req.user.email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const driverId = userResult.rows[0].id;
    
    // Get driveway info and host_id
    const drivewayResult = await pool.query(
      'SELECT host_id, hourly_rate, title FROM driveways WHERE id = $1 AND listing_status = $2',
      [driveway_id, 'active']
    );
    
    if (drivewayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driveway not found or not available' });
    }
    
    const { host_id, hourly_rate, title } = drivewayResult.rows[0];
    
    // Calculate booking duration and pricing
    const endTime = new Date(end_time);
    const totalHours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    const subtotal = totalHours * parseFloat(hourly_rate);
    const platformFee = Math.max(subtotal * 0.1, 2.00); // 10% platform fee, min $2
    const totalAmount = subtotal + platformFee;
    
    // Generate booking reference
    const bookingRef = `DH-${Math.random().toString(36).toUpperCase().substring(2, 8)}`;
    
    // Insert booking into database
    const bookingResult = await pool.query(`
      INSERT INTO bookings (
        driveway_id, driver_id, host_id, vehicle_id,
        booking_reference, start_time, end_time, total_hours, hourly_rate,
        subtotal, platform_fee, total_amount, booking_status, driver_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, booking_reference, total_amount, created_at
    `, [
      driveway_id, driverId, host_id, vehicle_id,
      bookingRef, start_time, end_time, totalHours, hourly_rate,
      subtotal, platformFee, totalAmount, 'confirmed', driver_notes
    ]);
    
    const booking = bookingResult.rows[0];
    
    console.log(`✅ Booking created: ${booking.booking_reference} for driveway "${title}" - $${totalAmount}`);
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        driveway_title: title,
        total_hours: totalHours,
        subtotal: subtotal,
        platform_fee: platformFee,
        total_amount: parseFloat(booking.total_amount),
        created_at: booking.created_at,
        start_time: start_time,
        end_time: end_time
      }
    });
    
  } catch (err: any) {
    console.error('❌ Booking creation error:', err.message);
    
    if (err.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Booking reference conflict. Please try again.' });
    } else if (err.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid driveway or vehicle reference' });
    } else if (err.code === '23514') { // Check constraint violation
      res.status(400).json({ error: 'Invalid booking time or pricing data' });
    } else {
      res.status(500).json({ error: 'Database error creating booking' });
    }
  }
});

// Real database bookings list
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    // Get user ID from token
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [req.user.email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Get bookings where user is either driver or host
    const bookingsResult = await pool.query(`
      SELECT 
        b.id, b.booking_reference, b.start_time, b.end_time,
        b.total_hours, b.subtotal, b.platform_fee, b.total_amount,
        b.booking_status, b.driver_notes, b.host_notes,
        b.created_at, b.confirmed_at, b.completed_at, b.cancelled_at,
        d.title as driveway_title, d.address as driveway_address,
        d.city, d.has_ev_charging,
        v.model as vehicle_model, v.display_name as vehicle_name,
        u_driver.first_name as driver_first_name, u_driver.last_name as driver_last_name,
        u_host.first_name as host_first_name, u_host.last_name as host_last_name,
        CASE 
          WHEN b.driver_id = $1 THEN 'driver'
          WHEN b.host_id = $1 THEN 'host'
          ELSE 'unknown'
        END as user_role
      FROM bookings b
      JOIN driveways d ON b.driveway_id = d.id
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users u_driver ON b.driver_id = u_driver.id
      JOIN users u_host ON b.host_id = u_host.id
      WHERE b.driver_id = $1 OR b.host_id = $1
      ORDER BY b.created_at DESC
      LIMIT 50
    `, [userId]);
    
    const bookings = bookingsResult.rows.map(row => ({
      id: row.id,
      booking_reference: row.booking_reference,
      start_time: row.start_time,
      end_time: row.end_time,
      total_hours: parseFloat(row.total_hours),
      subtotal: parseFloat(row.subtotal),
      platform_fee: parseFloat(row.platform_fee),
      total_amount: parseFloat(row.total_amount),
      booking_status: row.booking_status,
      driver_notes: row.driver_notes,
      host_notes: row.host_notes,
      created_at: row.created_at,
      confirmed_at: row.confirmed_at,
      completed_at: row.completed_at,
      cancelled_at: row.cancelled_at,
      user_role: row.user_role,
      driveway: {
        title: row.driveway_title,
        address: row.driveway_address,
        city: row.city,
        has_ev_charging: row.has_ev_charging
      },
      vehicle: {
        model: row.vehicle_model,
        display_name: row.vehicle_name
      },
      driver_name: `${row.driver_first_name} ${row.driver_last_name}`,
      host_name: `${row.host_first_name} ${row.host_last_name}`
    }));
    
    console.log(`Found ${bookings.length} bookings for user: ${req.user.email}`);
    res.json({ bookings, count: bookings.length });
    
  } catch (err: any) {
    console.error('Bookings query error:', err.message);
    res.status(500).json({ error: 'Database error fetching bookings' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Driveway Hub API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URLs: http://localhost:3001`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down server...');
  await pool.end();
  await redisClient.quit();
  process.exit(0);
});