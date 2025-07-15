import express from 'express';
import { Pool } from 'pg';
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
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Middleware to verify JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// POST /api/bookings/create endpoint
app.post('/api/bookings/create', authenticateToken, async (req, res) => {
  const { driveway_id, vehicle_id, start_time, end_time, driver_notes } = req.body;
  
  try {
    console.log('Token email:', req.user.email); // Debug line
    
    // Get the user's UUID from their email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [req.user.email]
    );
    
    console.log('Database query result:', userResult.rows); // Debug line
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        debug: { searchedEmail: req.user.email } // Debug info
      });
    }
    
    const driver_id = userResult.rows[0].id;
    
    // Call the create_booking function with correct parameters
    const result = await pool.query(
      'SELECT * FROM create_booking($1, $2, $3, $4, $5, $6)',
      [driver_id, vehicle_id, driveway_id, start_time, end_time, driver_notes || null]
    );
    
    res.status(201).json({ 
      message: 'Booking created successfully', 
      booking: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));