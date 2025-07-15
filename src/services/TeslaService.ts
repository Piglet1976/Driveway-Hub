// src/services/TeslaService.ts
export class TeslaService {
  static async sendNavigationToVehicle(vehicleId: string, coordinates: any) {
    console.log(`Tesla navigation sent to vehicle ${vehicleId}`);
    return { success: true };
  }

  static async attemptAutoPark(vehicleId: string) {
    console.log(`Tesla auto-park attempted for vehicle ${vehicleId}`);
    return { success: true };
  }
}

// src/services/EmailService.ts
export class EmailService {
  static async sendBookingConfirmation(booking: any) {
    console.log(`Email confirmation sent for booking ${booking.id}`);
    return { success: true };
  }
}