import { Pool } from 'pg';
import crypto from 'crypto';

interface TeslaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface TeslaVehicle {
  id: string;
  vehicle_id: number;
  vin: string;
  display_name: string;
  color: string;
  access_type: string;
  tokens: string[];
  state: string;
  in_service: boolean;
  id_s: string;
  calendar_enabled: boolean;
  api_version: number;
}

interface TeslaVehicleData {
  id: string;
  user_id: number;
  vehicle_id: number;
  vin: string;
  display_name: string;
  color: string;
  charge_state: {
    battery_level: number;
    battery_range: number;
    charge_port_door_open: boolean;
    charging_state: string;
    charge_limit_soc: number;
    minutes_to_full_charge: number;
    time_to_full_charge: number;
  };
  climate_state: {
    inside_temp: number;
    outside_temp: number;
    is_climate_on: boolean;
    is_preconditioning: boolean;
  };
  drive_state: {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    power: number;
    shift_state: string;
  };
  vehicle_state: {
    car_version: string;
    locked: boolean;
    odometer: number;
    sentry_mode: boolean;
    valet_mode: boolean;
    is_user_present: boolean;
  };
}

export class TeslaService {
  private pool: Pool;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scope: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.clientId = process.env.TESLA_CLIENT_ID || '';
    this.clientSecret = process.env.TESLA_CLIENT_SECRET || '';
    this.redirectUri = process.env.TESLA_OAUTH_REDIRECT_URI || '';
    this.scope = process.env.TESLA_OAUTH_SCOPE || 'openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds';
  }

  async generateAuthUrl(userId: string): Promise<string> {
    const state = this.generateState(userId);
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Store the code verifier for later use in token exchange
    await this.storeCodeVerifier(userId, codeVerifier);
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;
  }

  private generateState(userId: string): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    return Buffer.from(`${userId}:${timestamp}:${random}`).toString('base64url');
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  async storeCodeVerifier(userId: string, codeVerifier: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET tesla_code_verifier = $1 WHERE id = $2',
      [codeVerifier, userId]
    );
  }

  async getCodeVerifier(userId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT tesla_code_verifier FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.tesla_code_verifier || null;
  }

  parseState(state: string): { userId: string; timestamp: string; random: string } | null {
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      const [userId, timestamp, random] = decoded.split(':');
      return { userId, timestamp, random };
    } catch {
      return null;
    }
  }

  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TeslaTokenResponse> {
    const response = await fetch('https://auth.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tesla token exchange failed: ${error}`);
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<TeslaTokenResponse> {
    const response = await fetch('https://auth.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tesla token refresh failed: ${error}`);
    }

    return response.json();
  }

  async storeTokens(userId: string, tokens: TeslaTokenResponse): Promise<void> {
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
    
    await this.pool.query(`
      UPDATE users SET 
        tesla_access_token = $1,
        tesla_refresh_token = $2,
        tesla_token_expires_at = $3,
        tesla_token_scope = $4
      WHERE id = $5
    `, [
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      tokens.scope,
      userId
    ]);
  }

  async getValidAccessToken(userId: string): Promise<string | null> {
    const result = await this.pool.query(`
      SELECT tesla_access_token, tesla_refresh_token, tesla_token_expires_at 
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const { tesla_access_token, tesla_refresh_token, tesla_token_expires_at } = result.rows[0];

    if (!tesla_access_token) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(tesla_token_expires_at);

    if (now < expiresAt) {
      return tesla_access_token;
    }

    if (!tesla_refresh_token) {
      return null;
    }

    try {
      const newTokens = await this.refreshAccessToken(tesla_refresh_token);
      await this.storeTokens(userId, newTokens);
      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh Tesla token:', error);
      return null;
    }
  }

  async getVehicles(accessToken: string): Promise<TeslaVehicle[]> {
    const response = await fetch('https://fleet-api.prd.na.tesla.com/api/1/vehicles', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch vehicles: ${error}`);
    }

    const data = await response.json();
    return data.response || [];
  }

  async getVehicleData(accessToken: string, vehicleId: string): Promise<TeslaVehicleData> {
    const response = await fetch(`https://fleet-api.prd.na.tesla.com/api/1/vehicles/${vehicleId}/vehicle_data`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch vehicle data: ${error}`);
    }

    const data = await response.json();
    return data.response;
  }

  async wakeUpVehicle(accessToken: string, vehicleId: string): Promise<boolean> {
    const response = await fetch(`https://fleet-api.prd.na.tesla.com/api/1/vehicles/${vehicleId}/wake_up`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.response?.state === 'online';
  }

  async sendCommand(accessToken: string, vehicleId: string, command: string, body?: any): Promise<any> {
    const response = await fetch(`https://fleet-api.prd.na.tesla.com/api/1/vehicles/${vehicleId}/command/${command}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Command failed: ${error}`);
    }

    return response.json();
  }

  async syncVehiclesToDatabase(userId: string, vehicles: TeslaVehicle[]): Promise<void> {
    for (const vehicle of vehicles) {
      await this.pool.query(`
        INSERT INTO vehicles (
          user_id, tesla_vehicle_id, vin, display_name, 
          model, year, color, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tesla_vehicle_id) 
        DO UPDATE SET 
          display_name = EXCLUDED.display_name,
          color = EXCLUDED.color,
          is_active = EXCLUDED.is_active,
          last_seen_at = CURRENT_TIMESTAMP
      `, [
        userId,
        vehicle.vehicle_id,
        vehicle.vin,
        vehicle.display_name,
        this.extractModel(vehicle),
        this.extractYear(vehicle),
        vehicle.color,
        true
      ]);
    }
  }

  private extractModel(vehicle: TeslaVehicle): string {
    const vinDecoder: { [key: string]: string } = {
      '3': 'Model 3',
      'Y': 'Model Y',
      'S': 'Model S',
      'X': 'Model X'
    };
    return vinDecoder[vehicle.vin[3]] || 'Unknown';
  }

  private extractYear(vehicle: TeslaVehicle): number {
    const yearCode = vehicle.vin[9];
    const yearMap: { [key: string]: number } = {
      'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
      'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025
    };
    return yearMap[yearCode] || new Date().getFullYear();
  }
}