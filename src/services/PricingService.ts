// src/services/PricingService.ts
export class PricingService {
  static calculateBookingPrice(params: any) {
    const hours = (params.end_time - params.start_time) / (1000 * 60 * 60);
    const subtotal = params.hourly_rate * hours;
    const platformFee = subtotal * 0.15;
    
    return {
      hourly_rate: params.hourly_rate,
      total_hours: hours,
      subtotal,
      platform_fee: platformFee,
      total_amount: subtotal + platformFee,
      host_earnings: subtotal - platformFee
    };
  }
}