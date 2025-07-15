// src/repositories/VehicleRepository.ts
import { Pool } from 'pg';

export class VehicleRepository {
  private static pool: Pool;

  static initialize(pool: Pool) {
    this.pool = pool;
  }

  static async findById(id: string) {
    const result = await this.pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}