/**
 * Authentication Service
 * Business logic for authentication and authorization
 */

import { UserRole } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.util.js';
import { generateToken, JwtPayload } from '../utils/jwt.util.js';
import { UnauthorizedError, ConflictError } from '../utils/errors.util.js';
import type { LoginInput, RegisterInput } from '@rebequi/shared/schemas';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register new user
   */
  async register(data: RegisterInput) {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
    });

    // Generate token
    const token = this.generateUserToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginInput) {
    // Find user by email
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token
    const token = this.generateUserToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Generate JWT token for user
   */
  private generateUserToken(userId: string, email: string, role: string): string {
    const payload: JwtPayload = {
      userId,
      email,
      role,
    };
    return generateToken(payload);
  }
}
