// src/repositories/BookingRepository.ts
import { Pool } from 'pg';

export interface BookingData {
  driver_id: string;
  vehicle_id: string;
  driveway_id: string;
  host_id: string;
  start_time: Date;
  end_time: Date;
  driver_notes?: string;
  pricing: {
    hourly_rate: number;
    total_hours: number;
    subtotal: number;
    platform_fee: number;
    total_amount: number;
    host_earnings: number;
  };
}

export class BookingRepository {
  private static pool: Pool;

  static initialize(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new booking using the stored procedure
   */
  static async create(data: BookingData) {
    const result = await this.pool.query(
      'SELECT * FROM create_booking($1, $2, $3, $4, $5, $6)',
      [
        data.driver_id,
        data.vehicle_id,
        data.driveway_id,
        data.start_time,
        data.end_time,
        data.driver_notes
      ]
    );

    return {
      id: result.rows[0].booking_id,
      reference: result.rows[0].booking_reference,
      host_id: result.rows[0].host_id,
      ...data.pricing
    };
  }

  /**
   * Check for booking time conflicts
   */
  static async checkTimeConflict(
    driveway_id: string,
    start_time: Date,
    end_time: Date,
    exclude_booking_id?: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT check_booking_conflicts($1, $2, $3, $4) as has_conflict',
      [driveway_id, start_time, end_time, exclude_booking_id]
    );

    return result.rows[0].has_conflict;
  }

  /**
   * Find booking by ID
   */
  static async findById(booking_id: string) {
    const result = await this.pool.query(
      `SELECT b.*, d.title as driveway_title, d.address as driveway_address,
              u.first_name as driver_name, v.display_name as vehicle_name
       FROM bookings b
       JOIN driveways d ON b.driveway_id = d.id
       JOIN users u ON b.driver_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1`,
      [booking_id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find all bookings for a user (both as driver and host)
   */
  static async findByUserId(user_id: string) {
    const result = await this.pool.query(
      `SELECT b.*, d.title as driveway_title, d.address as driveway_address,
              'driver' as user_role
       FROM bookings b
       JOIN driveways d ON b.driveway_id = d.id
       WHERE b.driver_id = $1
       
       UNION ALL
       
       SELECT b.*, d.title as driveway_title, d.address as driveway_address,
              'host' as user_role
       FROM bookings b
       JOIN driveways d ON b.driveway_id = d.id
       WHERE b.host_id = $1
       
       ORDER BY start_time DESC`,
      [user_id]
    );

    return result.rows;
  }

  /**
   * Find upcoming bookings for Tesla automation
   */
  static async findUpcoming(before_time: Date) {
    const result = await this.pool.query(
      `SELECT b.*, v.tesla_vehicle_id, d.latitude, d.longitude, d.access_instructions
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN driveways d ON b.driveway_id = d.id
       WHERE b.start_time <= $1 
         AND b.start_time > NOW()
         AND b.booking_status IN ('confirmed', 'pending')
         AND b.tesla_navigation_sent = false
       ORDER BY b.start_time ASC`,
      [before_time]
    );

    return result.rows;
  }

  /**
   * Update booking status
   */
  static async updateStatus(booking_id: string, status: string) {
    const timestamp_field = status === 'active' ? 'arrival_detected_at' :
                           status === 'completed' ? 'departure_detected_at' :
                           status === 'confirmed' ? 'confirmed_at' :
                           status === 'cancelled' ? 'cancelled_at' : null;

    let query = 'UPDATE bookings SET booking_status = $1, updated_at = NOW()';
    let params = [status, booking_id];

    if (timestamp_field) {
      query += `, ${timestamp_field} = NOW()`;
    }

    query += ' WHERE id = $2 RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Cancel a booking
   */
  static async cancel(booking_id: string) {
    return await this.updateStatus(booking_id, 'cancelled');
  }

  /**
   * Log Tesla-related events
   */
  static async logTeslaEvent(booking_id: string, event_type: string, data?: any) {
    const updates: any = { updated_at: 'NOW()' };

    switch (event_type) {
      case 'navigation_sent':
        updates.tesla_navigation_sent = true;
        break;
      case 'arrival_detected':
        updates.arrival_detected_at = 'NOW()';
        break;
      case 'departure_detected':
        updates.departure_detected_at = 'NOW()';
        break;
      case 'auto_park_attempted':
        updates.auto_park_attempted = true;
        if (data?.success) {
          updates.auto_park_successful = true;
        }
        break;
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `UPDATE bookings SET ${setClause} WHERE id = $1 RETURNING *`;
    const params = [booking_id, ...Object.values(updates)];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get booking analytics for host dashboard
   */
  static async getHostAnalytics(host_id: string, days: number = 30) {
    const result = await this.pool.query(
      `SELECT 
         COUNT(*) as total_bookings,
         SUM(subtotal - platform_fee) as total_earnings,
         AVG(subtotal - platform_fee) as avg_booking_value,
         COUNT(CASE WHEN booking_status = 'completed' THEN 1 END) as completed_bookings,
         COUNT(CASE WHEN booking_status = 'cancelled' THEN 1 END) as cancelled_bookings
       FROM bookings 
       WHERE host_id = $1 
         AND created_at > NOW() - INTERVAL '${days} days'`,
      [host_id]
    );

    return result.rows[0];
  }

  /**
   * Get platform analytics for admin dashboard
   */
  static async getPlatformAnalytics(days: number = 30) {
    const result = await this.pool.query(
      `SELECT 
         COUNT(*) as total_bookings,
         SUM(total_amount) as total_revenue,
         SUM(platform_fee) as platform_revenue,
         COUNT(DISTINCT driver_id) as unique_drivers,
         COUNT(DISTINCT host_id) as unique_hosts,
         AVG(total_amount) as avg_booking_value
       FROM bookings 
       WHERE created_at > NOW() - INTERVAL '${days} days'`
    );

    return result.rows[0];
  }
}