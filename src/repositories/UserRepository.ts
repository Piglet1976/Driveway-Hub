// src/repositories/UserRepository.ts
import { Pool } from 'pg';
import { User } from '../types';

export class UserRepository {
  private static pool: Pool;

  static initialize(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Find user by email (for JWT authentication)
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  static async create(userData: Partial<User>): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, user_type, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userData.email,
        userData.password_hash,
        userData.first_name,
        userData.last_name,
        userData.user_type,
        userData.phone
      ]
    );

    return result.rows[0];
  }

  /**
   * Update user profile
   */
  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(updates)];
    const result = await this.pool.query(query, values);

    return result.rows[0] || null;
  }

  /**
   * Verify user email
   */
  static async verifyEmail(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE users SET email_verified = true WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows.length > 0;
  }

  /**
   * Get user statistics
   */
  static async getStats(id: string) {
    const result = await this.pool.query(
      `SELECT 
         COUNT(CASE WHEN b.driver_id = $1 THEN 1 END) as bookings_as_driver,
         COUNT(CASE WHEN b.host_id = $1 THEN 1 END) as bookings_as_host,
         SUM(CASE WHEN b.host_id = $1 AND b.booking_status = 'completed' 
             THEN b.subtotal - b.platform_fee ELSE 0 END) as total_earnings,
         AVG(CASE WHEN r.reviewee_id = $1 THEN r.rating END) as avg_rating,
         COUNT(CASE WHEN r.reviewee_id = $1 THEN 1 END) as review_count
       FROM users u
       LEFT JOIN bookings b ON (b.driver_id = u.id OR b.host_id = u.id)
       LEFT JOIN reviews r ON r.reviewee_id = u.id AND r.is_published = true
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );

    return result.rows[0] || {
      bookings_as_driver: 0,
      bookings_as_host: 0,
      total_earnings: 0,
      avg_rating: 0,
      review_count: 0
    };
  }
}