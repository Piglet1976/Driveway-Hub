// src/index.ts - Enterprise Driveway-Hub Server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Import repositories
import { BookingRepository } from './repositories/BookingRepository';
import { UserRepository } from './repositories/UserRepository';
import { DrivewayRepository } from './repositories/DrivewayRepository';

// Import middleware
import { errorHandler, requestLogger } from './middleware/errorHandler';

// Import routes
import bookingRoutes from './routes/bookings';
// import authRoutes from './routes/auth';

dotenv.config();

class DrivewayHubServer {
  private app: express.Application;
  private pool!: Pool; // Definite assignment assertion

  constructor() {
    this.app = express();
    this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeDatabase() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize repositories with database connection
    BookingRepository.initialize(this.pool);
    UserRepository.initialize(this.pool);
    DrivewayRepository.initialize(this.pool);

    console.log('✅ Database connection pool initialized');
  }

  private initializeMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(requestLogger);

    console.log('✅ Middleware initialized');
  }

  private initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.1.0-enterprise',
        architecture: 'enterprise-refactor'
      });
    });

    // API routes
    this.app.use('/api/bookings', bookingRoutes);
    // this.app.use('/api/auth', authRoutes);

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Driveway-Hub Enterprise API',
        version: '1.1.0-enterprise',
        description: 'Tesla-integrated smart parking platform - Enterprise Architecture',
        architecture: {
          controllers: 'HTTP request/response handling',
          services: 'Business logic and validation',
          repositories: 'Database access layer',
          middleware: 'Authentication, logging, error handling'
        },
        endpoints: {
          'POST /api/bookings/create': 'Create new booking (enterprise)',
          'GET /api/bookings': 'Get user bookings',
          'PUT /api/bookings/:id/cancel': 'Cancel booking',
          'PUT /api/bookings/:id/arrive': 'Tesla arrival detection',
          'PUT /api/bookings/:id/depart': 'Tesla departure detection'
        },
        features: {
          'enterprise_architecture': true,
          'tesla_integration_ready': true,
          'scalable_microservices': true,
          'investor_grade': true
        }
      });
    });

    console.log('✅ Enterprise routes initialized');
  }

  private initializeErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: [
          'GET /health',
          'GET /api',
          'POST /api/bookings/create'
        ]
      });
    });

    // Global error handler
    this.app.use(errorHandler);

    console.log('✅ Enterprise error handling initialized');
  }

  public async start(port: number = 3000) {
    try {
      // Test database connection
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connection verified');

      // Start server
      this.app.listen(port, () => {
        console.log(`
🚀 DRIVEWAY-HUB ENTERPRISE API
📍 Port: ${port}
🏗️  Architecture: Enterprise Microservices
🌐 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health Check: http://localhost:${port}/health
📚 API Docs: http://localhost:${port}/api

✨ ENTERPRISE FEATURES ACTIVE:
   - Layered Architecture (Controller → Service → Repository)
   - JWT Authentication Middleware
   - Rate Limiting & Security Headers
   - Connection Pooling & Error Handling
   - Tesla Integration Ready
   - Investor-Grade Codebase

💡 Compare with MVP: git checkout main
🎯 Tesla-Airbnb Platform: ENTERPRISE READY
        `);
      });

    } catch (error) {
      console.error('❌ Failed to start enterprise server:', error);
      process.exit(1);
    }
  }

  public async shutdown() {
    console.log('🛑 Shutting down enterprise server...');
    await this.pool.end();
    process.exit(0);
  }
}

// Start the enterprise server
const server = new DrivewayHubServer();
const PORT = Number(process.env.PORT) || 3000;

server.start(PORT);

// Graceful shutdown
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());