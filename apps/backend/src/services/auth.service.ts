/**
 * Authentication Service
 * Business logic for authentication and authorization
 */

import { UserRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateAdminCredentialsInput,
} from '@rebequi/shared/schemas';
import { isValidWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
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
      throw new ConflictError('Já existe um acesso vinculado a este WhatsApp');
    }

    const provisionalPassword = randomBytes(12).toString('base64url');
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

  async ensureCustomerForLead(params: { name: string; whatsapp: string; authenticatedUserId?: string }) {
    const normalizedWhatsapp = normalizeWhatsapp(params.whatsapp);

    if (!isValidWhatsapp(normalizedWhatsapp)) {
      throw new UnauthorizedError('WhatsApp inválido');
    }

    const existingUser = await this.userRepository.findByIdentifier(normalizedWhatsapp);
    if (existingUser) {
      if (existingUser.role !== UserRole.CUSTOMER) {
        throw new ConflictError('Já existe um usuário administrativo vinculado a este identificador');
      }

      if (!existingUser.isActive) {
        throw new UnauthorizedError('Esta conta está desativada. Entre em contato com a loja.');
      }
      if (existingUser.id !== params.authenticatedUserId) {
        throw new ConflictError('Entre na sua conta para enviar a lista. Seu rascunho será preservado.', 'LOGIN_REQUIRED');
      }

      return {
        user: existingUser,
        created: false,
        provisionalCredentials: undefined,
      };
    }

    const provisionalPassword = randomBytes(12).toString('base64url');
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
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Conta desativada');
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    return this.createSessionForUser(user.id);
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    const canSetInitialPassword = user.role === UserRole.CUSTOMER && user.isProvisional && user.mustChangePassword;
    if (!canSetInitialPassword && (!data.currentPassword || !await comparePassword(data.currentPassword, user.password))) {
      throw new UnauthorizedError('Senha atual inválida');
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
