// src/repositories/DrivewayRepository.ts
import { Pool } from 'pg';
import { Driveway } from '../types';

export class DrivewayRepository {
  private static pool: Pool;

  static initialize(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Find driveway by ID
   */
  static async findById(id: string): Promise<Driveway | null> {
    const result = await this.pool.query(
      `SELECT d.*, 
              u.first_name as host_first_name,
              u.email as host_email,
              u.phone as host_phone
       FROM driveways d
       JOIN users u ON d.host_id = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows[0]) {
      const driveway = result.rows[0];
      driveway.coordinates = {
        lat: parseFloat(driveway.latitude),
        lng: parseFloat(driveway.longitude)
      };
      return driveway;
    }

    return null;
  }

  /**
   * Search driveways by location and criteria
   */
  static async searchAvailable(params: {
    latitude: number;
    longitude: number;
    radius_miles?: number;
    start_time?: Date;
    end_time?: Date;
    vehicle_length?: number;
    vehicle_width?: number;
    vehicle_height?: number;
    has_ev_charging?: boolean;
  }) {
    // Use the stored procedure we created earlier
    const result = await this.pool.query(
      `SELECT * FROM search_available_driveways($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.latitude,
        params.longitude,
        params.radius_miles || 5,
        params.start_time,
        params.end_time,
        params.vehicle_length,
        params.vehicle_width,
        params.vehicle_height
      ]
    );

    return result.rows.map(row => ({
      ...row,
      coordinates: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      }
    }));
  }

  /**
   * Get driveways owned by host
   */
  static async findByHostId(host_id: string): Promise<Driveway[]> {
    const result = await this.pool.query(
      `SELECT * FROM driveways 
       WHERE host_id = $1 
       ORDER BY created_at DESC`,
      [host_id]
    );

    return result.rows.map(row => ({
      ...row,
      coordinates: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      }
    }));
  }

  /**
   * Create new driveway
   */
  static async create(drivewayData: Partial<Driveway>): Promise<Driveway> {
    const result = await this.pool.query(
      `INSERT INTO driveways (
         host_id, title, description, address, city, state, zip_code,
         latitude, longitude, driveway_type, is_covered,
         max_vehicle_length, max_vehicle_width, max_vehicle_height,
         hourly_rate, daily_rate, weekly_rate, monthly_rate,
         has_ev_charging, charging_connector_type,
         has_security_camera, has_lighting,
         access_instructions, special_instructions
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24
       ) RETURNING *`,
      [
        drivewayData.host_id,
        drivewayData.title,
        drivewayData.description,
        drivewayData.address,
        drivewayData.city,
        drivewayData.state,
        drivewayData.zip_code,
        drivewayData.latitude,
        drivewayData.longitude,
        drivewayData.driveway_type,
        drivewayData.is_covered,
        drivewayData.max_vehicle_length,
        drivewayData.max_vehicle_width,
        drivewayData.max_vehicle_height,
        drivewayData.hourly_rate,
        drivewayData.daily_rate,
        drivewayData.weekly_rate,
        drivewayData.monthly_rate,
        drivewayData.has_ev_charging,
        drivewayData.charging_connector_type,
        drivewayData.has_security_camera,
        drivewayData.has_lighting,
        drivewayData.access_instructions,
        drivewayData.special_instructions
      ]
    );

    const driveway = result.rows[0];
    driveway.coordinates = {
      lat: parseFloat(driveway.latitude),
      lng: parseFloat(driveway.longitude)
    };

    return driveway;
  }

  /**
   * Update driveway
   */
  static async update(id: string, updates: Partial<Driveway>): Promise<Driveway | null> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE driveways 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(updates)];
    const result = await this.pool.query(query, values);

    if (result.rows[0]) {
      const driveway = result.rows[0];
      driveway.coordinates = {
        lat: parseFloat(driveway.latitude),
        lng: parseFloat(driveway.longitude)
      };
      return driveway;
    }

    return null;
  }

  /**
   * Delete driveway (soft delete - mark as inactive)
   */
  static async delete(id: string, host_id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE driveways 
       SET listing_status = 'inactive', updated_at = NOW()
       WHERE id = $1 AND host_id = $2 
       RETURNING id`,
      [id, host_id]
    );

    return result.rows.length > 0;
  }

  /**
   * Get nearby driveways for map display
   */
  static async findNearby(latitude: number, longitude: number, radius_miles: number = 10) {
    const result = await this.pool.query(
      `SELECT id, title, latitude, longitude, hourly_rate, 
              has_ev_charging, has_security_camera,
              calculate_distance_miles($1, $2, latitude, longitude) as distance_miles
       FROM driveways 
       WHERE listing_status = 'active' 
         AND is_available = true
         AND calculate_distance_miles($1, $2, latitude, longitude) <= $3
       ORDER BY distance_miles ASC
       LIMIT 50`,
      [latitude, longitude, radius_miles]
    );

    return result.rows.map(row => ({
      ...row,
      coordinates: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      }
    }));
  }

  /**
   * Get driveway analytics for host dashboard
   */
  static async getAnalytics(driveway_id: string, days: number = 30) {
    const result = await this.pool.query(
      `SELECT 
         d.title,
         COUNT(b.id) as total_bookings,
         SUM(CASE WHEN b.booking_status = 'completed' THEN b.subtotal - b.platform_fee ELSE 0 END) as total_earnings,
         AVG(CASE WHEN b.booking_status = 'completed' THEN b.total_hours END) as avg_booking_hours,
         COUNT(CASE WHEN b.booking_status = 'completed' THEN 1 END) as completed_bookings,
         COUNT(CASE WHEN b.booking_status = 'cancelled' THEN 1 END) as cancelled_bookings,
         AVG(CASE WHEN r.review_type = 'driver_to_host' THEN r.rating END) as avg_rating
       FROM driveways d
       LEFT JOIN bookings b ON d.id = b.driveway_id 
         AND b.created_at > NOW() - INTERVAL '${days} days'
       LEFT JOIN reviews r ON b.id = r.booking_id 
         AND r.review_type = 'driver_to_host' 
         AND r.is_published = true
       WHERE d.id = $1
       GROUP BY d.id, d.title`,
      [driveway_id]
    );

    return result.rows[0] || {
      title: '',
      total_bookings: 0,
      total_earnings: 0,
      avg_booking_hours: 0,
      completed_bookings: 0,
      cancelled_bookings: 0,
      avg_rating: 0
    };
  }
}