// src/controllers/BookingController.ts
import { Request, Response } from 'express';
import { BookingService } from '../services/BookingService';
import { UserService } from '../services/UserService';

export class BookingController {
  /**
   * Creates a new booking
   * POST /api/bookings/create
   */
  static async createBooking(req: Request, res: Response) {
    try {
      const { driveway_id, vehicle_id, start_time, end_time, driver_notes } = req.body;
      
      // Get authenticated user from JWT token
      const user = await UserService.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND' 
        });
      }

      // Create booking through service layer
      const booking = await BookingService.createBooking({
        driver_id: user.id,
        vehicle_id,
        driveway_id,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        driver_notes
      });

      return res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          booking_id: booking.id,
          booking_reference: booking.reference,
          total_amount: booking.total_amount,
          host_id: booking.host_id,
          estimated_earnings: booking.host_earnings
        }
      });

    } catch (error) {
      console.error('BookingController.createBooking error:', error);
      
      // Handle known business logic errors
      if (error instanceof Error) {
        switch (error.message) {
          case 'DRIVEWAY_NOT_AVAILABLE':
            return res.status(409).json({ 
              error: 'Driveway is not available for the selected time',
              code: 'DRIVEWAY_UNAVAILABLE'
            });
          case 'VEHICLE_TOO_LARGE':
            return res.status(400).json({ 
              error: 'Vehicle does not fit in selected driveway',
              code: 'VEHICLE_SIZE_MISMATCH'
            });
          case 'BOOKING_CONFLICT':
            return res.status(409).json({ 
              error: 'Time slot conflicts with existing booking',
              code: 'TIME_CONFLICT'
            });
        }
      }

      return res.status(500).json({
        error: 'Failed to create booking',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user's bookings
   * GET /api/bookings
   */
  static async getUserBookings(req: Request, res: Response) {
    try {
      const user = await UserService.getUserByEmail(req.user.email);
      const bookings = await BookingService.getUserBookings(user.id);

      return res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  /**
   * Cancel a booking
   * PUT /api/bookings/:id/cancel
   */
  static async cancelBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserByEmail(req.user.email);
      
      const result = await BookingService.cancelBooking(id, user.id);
      
      return res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: result
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to cancel booking' });
    }
  }
}