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
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// DTOs (Data Transfer Objects)
export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface CreateUserDTO {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}
