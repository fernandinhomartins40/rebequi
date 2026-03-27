/**
 * Authentication Service
 * Business logic for authentication and authorization
 */

import { UserRole } from '@prisma/client';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateAdminCredentialsInput,
} from '@rebequi/shared/schemas';
import { buildProvisionalPassword, isValidWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
import { UserRepository } from '../repositories/user.repository.js';
import { UnauthorizedError, ConflictError } from '../utils/errors.util.js';
import { comparePassword, hashPassword } from '../utils/hash.util.js';
import { generateToken, JwtPayload } from '../utils/jwt.util.js';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register new customer using the quick WhatsApp flow.
   */
  async register(data: RegisterInput) {
    const normalizedWhatsapp = normalizeWhatsapp(data.whatsapp);
    const existingUser = await this.userRepository.findByIdentifier(normalizedWhatsapp);

    if (existingUser) {
      throw new ConflictError('Ja existe um acesso vinculado a este WhatsApp');
    }

    const provisionalPassword = buildProvisionalPassword(data.name);
    const hashedPassword = await hashPassword(provisionalPassword);

    const user = await this.userRepository.create({
      email: normalizedWhatsapp,
      name: data.name,
      whatsapp: normalizedWhatsapp,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
      isProvisional: true,
      mustChangePassword: true,
      isActive: true,
    });

    const token = this.generateUserToken(user.id, user.email, user.role);

    return {
      user: this.serializeUser(user),
      token,
      provisionalCredentials: {
        identifier: normalizedWhatsapp,
        password: provisionalPassword,
      },
    };
  }

  async ensureCustomerForLead(params: { name: string; whatsapp: string }) {
    const normalizedWhatsapp = normalizeWhatsapp(params.whatsapp);

    if (!isValidWhatsapp(normalizedWhatsapp)) {
      throw new UnauthorizedError('WhatsApp invalido');
    }

    const existingUser = await this.userRepository.findByIdentifier(normalizedWhatsapp);
    if (existingUser) {
      if (existingUser.role !== UserRole.CUSTOMER) {
        throw new ConflictError('Ja existe um usuario administrativo vinculado a este identificador');
      }

      const activeUser = existingUser.isActive
        ? existingUser
        : await this.userRepository.update(existingUser.id, { isActive: true });

      return {
        user: activeUser,
        created: false,
        provisionalCredentials: activeUser.isProvisional
          ? {
              identifier: normalizedWhatsapp,
              password: buildProvisionalPassword(activeUser.name),
            }
          : undefined,
      };
    }

    const provisionalPassword = buildProvisionalPassword(params.name);
    const hashedPassword = await hashPassword(provisionalPassword);
    const user = await this.userRepository.create({
      email: normalizedWhatsapp,
      name: params.name,
      whatsapp: normalizedWhatsapp,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
      isProvisional: true,
      mustChangePassword: true,
      isActive: true,
    });

    return {
      user,
      created: true,
      provisionalCredentials: {
        identifier: normalizedWhatsapp,
        password: provisionalPassword,
      },
    };
  }

  /**
   * Update default admin credentials (email/password) using current admin login
   */
  async updateAdminCredentials(data: UpdateAdminCredentialsInput) {
    const user = await this.userRepository.findByEmail(data.currentEmail);
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedError('Admin not found');
    }

    const isPasswordValid = await comparePassword(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const hashedPassword = await hashPassword(data.newPassword);
    const updatedUser = await this.userRepository.update(user.id, {
      email: data.newEmail,
      password: hashedPassword,
    });

    const token = this.generateUserToken(updatedUser.id, updatedUser.email, updatedUser.role);

    return {
      user: this.serializeUser(updatedUser),
      token,
    };
  }

  /**
   * Login user by email or WhatsApp.
   */
  async login(data: LoginInput) {
    const normalizedIdentifier = this.normalizeIdentifier(data.identifier);
    const user = await this.userRepository.findByIdentifier(normalizedIdentifier);
    if (!user) {
      throw new UnauthorizedError('Credenciais invalidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Conta desativada');
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciais invalidas');
    }

    return this.createSessionForUser(user.id);
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuario nao encontrado');
    }

    const isPasswordValid = await comparePassword(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Senha atual invalida');
    }

    const hashedPassword = await hashPassword(data.newPassword);
    const updatedUser = await this.userRepository.update(user.id, {
      password: hashedPassword,
      isProvisional: false,
      mustChangePassword: false,
    });

    const token = this.generateUserToken(updatedUser.id, updatedUser.email, updatedUser.role);

    return {
      user: this.serializeUser(updatedUser),
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

    return this.serializeUser(user);
  }

  async createSessionForUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const token = this.generateUserToken(user.id, user.email, user.role);

    return {
      user: this.serializeUser(user),
      token,
    };
  }

  private normalizeIdentifier(identifier: string) {
    const trimmed = identifier.trim();

    if (trimmed.includes('@')) {
      return trimmed.toLowerCase();
    }

    const normalized = normalizeWhatsapp(trimmed);
    return normalized || trimmed;
  }

  /**
   * Generate JWT token for user
   */
  private generateUserToken(userId: string, identifier: string, role: string): string {
    const payload: JwtPayload = {
      userId,
      identifier,
      role,
    };
    return generateToken(payload);
  }

  private serializeUser(user: {
    id: string;
    email: string;
    name: string;
    whatsapp: string | null;
    role: UserRole;
    isActive: boolean;
    isProvisional: boolean;
    mustChangePassword: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      identifier: user.email,
      email: user.email.includes('@') ? user.email : undefined,
      name: user.name,
      whatsapp: user.whatsapp ?? (user.email.includes('@') ? undefined : user.email),
      role: user.role,
      isActive: user.isActive,
      isProvisional: user.isProvisional,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
