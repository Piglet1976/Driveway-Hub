// src/services/UserService.ts
import { UserRepository } from '../repositories/UserRepository';

export class UserService {
  static async getUserByEmail(email: string) {
    return await UserRepository.findByEmail(email);
  }

  static async getUserById(id: string) {
    return await UserRepository.findById(id);
  }
}