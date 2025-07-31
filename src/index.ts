import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

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

// Mock login
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const mockUser = {
    id: 'mock-uuid-123',
    first_name: 'Demo',
    last_name: 'User',
    email: email || 'hello@driveway-hub.app',
  };
  const token = jwt.sign({ email: mockUser.email, id: mockUser.id }, JWT_SECRET, { expiresIn: '24h' });
  console.log('Mock JWT for testing:', token);
  res.json({ token, user: mockUser });
});

// Mock driveways
app.get('/api/driveways', authenticateToken, (req, res) => {
  res.json({
    driveways: [
      {
        id: 'driveway-1',
        title: 'Cozy Downtown Driveway',
        description: 'Spacious and secure',
        latitude: 37.7749,
        longitude: -122.4194,
        hourly_rate: 5.0,
        daily_rate: 30.0,
        available: true,
        host_name: 'John Doe',
        host_email: 'john@doe.com',
      },
    ],
    count: 1,
  });
});

// Mock profile
app.get('/api/users/profile', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: 'mock-uuid-123',
      first_name: 'Demo',
      last_name: 'User',
      email: req.user.email,
      user_type: 'driver',
      created_at: new Date().toISOString(),
    },
  });
});

// Mock vehicles
app.get('/api/users/vehicles', authenticateToken, (req, res) => {
  res.json({
    vehicles: [
      {
        id: 'vehicle-1',
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        license_plate: 'ABC123',
      },
    ],
    count: 1,
  });
});

// Mock booking create
app.post('/api/bookings/create', authenticateToken, (req, res) => {
  res.status(201).json({
    message: 'Booking created successfully',
    booking: {
      booking_id: 'booking-1',
      booking_reference: 'REF123',
      total_amount: 30.0,
      platform_fee: 5.0,
      host_payout: 25.0,
    },
  });
});

// Tesla OAuth
const getTeslaAccessToken = async (code: string) => {
  try {
    const response = await axios.post('https://auth.tesla.com/oauth2/v3/token', {
      grant_type: 'authorization_code',
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      code,
      redirect_uri: 'http://localhost:3001/callback',
    });
    return response.data.access_token;
  } catch (err: any) {
    console.error('❌ Tesla token error:', err.message);
    throw err;
  }
};

app.get('/api/tesla/auth', authenticateToken, async (req, res) => {
  try {
    // For initial testing, use a mock code (replace with real code from OAuth flow later)
    const accessToken = await getTeslaAccessToken('mock_code_123');
    const vehicles = await axios.get('https://owner-api.teslamotors.com/api/1/vehicles', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json({ vehicles: vehicles.data.response });
  } catch (err: any) {
    console.error('❌ Tesla API error:', err.message);
    res.status(500).json({ error: 'Tesla API failure', details: err.message });
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