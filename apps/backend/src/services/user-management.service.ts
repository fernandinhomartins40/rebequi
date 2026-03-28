import { Prisma, UserRole } from '@prisma/client';
import type { CreateManagedUserInput, ManagedUserFiltersInput, UpdateManagedUserInput } from '@rebequi/shared/schemas';
import { normalizeWhatsapp } from '@rebequi/shared/utils';
import { UserRepository } from '../repositories/user.repository.js';
import { ConflictError, NotFoundError } from '../utils/errors.util.js';
import { hashPassword } from '../utils/hash.util.js';

const INTERNAL_USER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CATALOG_MANAGER,
  UserRole.MARKETING,
  UserRole.SALES,
];

type PersistedUser = {
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
};

export class UserManagementService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async listManagedUsers(filters: ManagedUserFiltersInput) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const search = filters.search?.trim();

    const where: Prisma.UserWhereInput = {
      role: {
        in: INTERNAL_USER_ROLES,
      },
    };

    if (!filters.includeInactive) {
      where.isActive = true;
    }

    if (filters.role && filters.role !== 'all') {
      where.role = filters.role as UserRole;
    }

    if (search) {
      const normalizedWhatsappSearch = normalizeWhatsapp(search);
      const searchConditions: Prisma.UserWhereInput[] = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search.toLowerCase(),
            mode: 'insensitive',
          },
        },
      ];

      if (normalizedWhatsappSearch) {
        searchConditions.push({
          whatsapp: {
            contains: normalizedWhatsappSearch,
          },
        });
      }

      where.OR = searchConditions;
    }

    const [users, total] = await Promise.all([
      this.userRepository.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.userRepository.count(where),
    ]);

    return {
      users: users.map((user) => this.serializeUser(user)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async createManagedUser(data: CreateManagedUserInput) {
    const email = data.email.trim().toLowerCase();
    const whatsapp = data.whatsapp ? normalizeWhatsapp(data.whatsapp) : undefined;

    await this.ensureEmailAvailable(email);
    await this.ensureWhatsappAvailable(whatsapp);

    const password = await hashPassword(data.password);

    const user = await this.userRepository.create({
      email,
      name: data.name.trim(),
      password,
      whatsapp,
      role: data.role as UserRole,
      isActive: data.isActive ?? true,
      isProvisional: false,
      mustChangePassword: data.mustChangePassword ?? true,
    });

    return this.serializeUser(user);
  }

  async updateManagedUser(actorUserId: string, userId: string, data: UpdateManagedUserInput) {
    const currentUser = await this.userRepository.findById(userId);

    if (!currentUser || !INTERNAL_USER_ROLES.includes(currentUser.role)) {
      throw new NotFoundError('Usuario interno nao encontrado');
    }

    if (actorUserId === userId) {
      if (data.isActive === false) {
        throw new ConflictError('Nao e permitido desativar o proprio usuario');
      }

      if (data.role && data.role !== currentUser.role) {
        throw new ConflictError('Nao e permitido alterar o proprio papel de acesso');
      }
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      await this.ensureEmailAvailable(email, userId);
      updateData.email = email;
    }

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.whatsapp !== undefined) {
      const whatsapp = data.whatsapp ? normalizeWhatsapp(data.whatsapp) : null;
      await this.ensureWhatsappAvailable(whatsapp ?? undefined, userId);
      updateData.whatsapp = whatsapp;
    }

    if (data.password) {
      updateData.password = await hashPassword(data.password);
      updateData.isProvisional = false;
    }

    if (data.role) {
      updateData.role = data.role as UserRole;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.mustChangePassword !== undefined) {
      updateData.mustChangePassword = data.mustChangePassword;
    }

    const updatedUser = await this.userRepository.update(userId, updateData);
    return this.serializeUser(updatedUser);
  }

  private async ensureEmailAvailable(email: string, excludeUserId?: string) {
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser && existingUser.id !== excludeUserId) {
      throw new ConflictError('Ja existe um usuario com este e-mail');
    }
  }

  private async ensureWhatsappAvailable(whatsapp?: string, excludeUserId?: string) {
    if (!whatsapp) {
      return;
    }

    const existingUser = await this.userRepository.findByWhatsapp(whatsapp);

    if (existingUser && existingUser.id !== excludeUserId) {
      throw new ConflictError('Ja existe um usuario com este WhatsApp');
    }
  }

  private serializeUser(user: PersistedUser) {
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
