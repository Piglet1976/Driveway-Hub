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
  const { driveway_id, start_time, end_time } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM create_booking($1, $2, $3, $4)',
      [req.user.email, driveway_id, start_time, end_time]
    );
    res.status(201).json({ message: 'Booking created', booking: result.rows[0] });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create booking', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));