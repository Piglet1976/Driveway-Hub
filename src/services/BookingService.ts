// src/services/BookingService.ts
import { BookingRepository } from '../repositories/BookingRepository';
import { DrivewayRepository } from '../repositories/DrivewayRepository';
import { VehicleRepository } from '../repositories/VehicleRepository';
import { PricingService } from './PricingService';
import { TeslaService } from './TeslaService';
import { EmailService } from './EmailService';

export interface CreateBookingData {
  driver_id: string;
  vehicle_id: string;
  driveway_id: string;
  start_time: Date;
  end_time: Date;
  driver_notes?: string;
}

export interface BookingResult {
  id: string;
  reference: string;
  total_amount: number;
  host_id: string;
  host_earnings: number;
  platform_fee: number;
}

export class BookingService {
  /**
   * Creates a new booking with full business logic validation
   */
  static async createBooking(data: CreateBookingData): Promise<BookingResult> {
    // 1. Validate driveway availability
    const driveway = await DrivewayRepository.findById(data.driveway_id);
    if (!driveway || !driveway.is_available) {
      throw new Error('DRIVEWAY_NOT_AVAILABLE');
    }

    // 2. Check vehicle compatibility
    const vehicle = await VehicleRepository.findById(data.vehicle_id);
    if (!this.vehicleFitsDriveway(vehicle, driveway)) {
      throw new Error('VEHICLE_TOO_LARGE');
    }

    // 3. Check for booking conflicts
    const hasConflict = await BookingRepository.checkTimeConflict(
      data.driveway_id,
      data.start_time,
      data.end_time
    );
    if (hasConflict) {
      throw new Error('BOOKING_CONFLICT');
    }

    // 4. Calculate pricing
    const pricing = PricingService.calculateBookingPrice({
      hourly_rate: driveway.hourly_rate,
      start_time: data.start_time,
      end_time: data.end_time,
      has_ev_charging: driveway.has_ev_charging
    });

    // 5. Create the booking
    const booking = await BookingRepository.create({
      ...data,
      host_id: driveway.host_id,
      pricing
    });

    // 6. Send Tesla navigation (async, don't wait)
    TeslaService.sendNavigationToVehicle(data.vehicle_id, driveway.coordinates)
      .catch(error => console.warn('Tesla navigation failed:', error));

    // 7. Send confirmation emails (async)
    EmailService.sendBookingConfirmation(booking)
      .catch(error => console.warn('Email failed:', error));

    return {
      id: booking.id,
      reference: booking.reference,
      total_amount: pricing.total_amount,
      host_id: driveway.host_id,
      host_earnings: pricing.host_earnings,
      platform_fee: pricing.platform_fee
    };
  }

  /**
   * Get all bookings for a user
   */
  static async getUserBookings(user_id: string) {
    return await BookingRepository.findByUserId(user_id);
  }

  /**
   * Cancel a booking with business rules
   */
  static async cancelBooking(booking_id: string, user_id: string) {
    const booking = await BookingRepository.findById(booking_id);
    
    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.driver_id !== user_id) {
      throw new Error('UNAUTHORIZED');
    }

    // Check cancellation policy (24 hours before)
    const hoursBefore = (booking.start_time.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursBefore < 24) {
      throw new Error('CANCELLATION_TOO_LATE');
    }

    return await BookingRepository.cancel(booking_id);
  }

  /**
   * Private helper: Check if vehicle fits in driveway
   */
  private static vehicleFitsDriveway(vehicle: any, driveway: any): boolean {
    return vehicle.length_inches <= driveway.max_vehicle_length &&
           vehicle.width_inches <= driveway.max_vehicle_width &&
           (!driveway.max_vehicle_height || vehicle.height_inches <= driveway.max_vehicle_height);
  }

  /**
   * Get upcoming bookings for Tesla automation
   */
  static async getUpcomingBookings(within_hours: number = 2) {
    const cutoff = new Date(Date.now() + within_hours * 60 * 60 * 1000);
    return await BookingRepository.findUpcoming(cutoff);
  }

  /**
   * Mark booking as active when driver arrives
   */
  static async markArrival(booking_id: string, tesla_vehicle_id: string) {
    // Update booking status
    await BookingRepository.updateStatus(booking_id, 'active');
    
    // Log Tesla arrival
    await BookingRepository.logTeslaEvent(booking_id, 'arrival_detected');
    
    // Attempt auto-park if supported
    const parkingResult = await TeslaService.attemptAutoPark(tesla_vehicle_id);
    await BookingRepository.logTeslaEvent(booking_id, 'auto_park_attempted', parkingResult);
    
    return parkingResult;
  }
}