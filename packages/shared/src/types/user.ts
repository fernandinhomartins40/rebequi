/**
 * User Types
 * These types define the shape of user data from the API
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export interface User {
  id: string;
  identifier: string;
  email?: string;
  name: string;
  whatsapp?: string;
  role: UserRole;
  isActive: boolean;
  isProvisional: boolean;
  mustChangePassword: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// DTOs (Data Transfer Objects)
export interface LoginDTO {
  identifier: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  whatsapp: string;
}

export interface ProvisionalCredentials {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  provisionalCredentials?: ProvisionalCredentials;
}

export interface UpdateAdminCredentialsDTO {
  currentEmail: string;
  currentPassword: string;
  newEmail: string;
  newPassword: string;
}

export interface CreateUserDTO {
  email: string;
  name: string;
  password: string;
  whatsapp?: string;
  role?: UserRole;
  isProvisional?: boolean;
  mustChangePassword?: boolean;
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  password?: string;
  whatsapp?: string;
  role?: UserRole;
  isActive?: boolean;
  isProvisional?: boolean;
  mustChangePassword?: boolean;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}
