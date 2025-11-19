/**
 * Shared Constants
 * Application-wide constants used across frontend and backend
 */

export const APP_NAME = 'Rebequi';
export const APP_DESCRIPTION = 'E-commerce de Material de Construção';

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// Product constraints
export const MIN_PRODUCT_PRICE = 0.01;
export const MAX_PRODUCT_NAME_LENGTH = 255;
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 5000;
export const MAX_PRODUCT_IMAGES = 10;

// Category constraints
export const MAX_CATEGORY_NAME_LENGTH = 100;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 500;

// User constraints
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;
export const MAX_NAME_LENGTH = 255;

// File upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// API Response codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Não autorizado',
  FORBIDDEN: 'Acesso negado',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Erro de validação',
  INTERNAL_ERROR: 'Erro interno do servidor',
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  EMAIL_ALREADY_EXISTS: 'Email já cadastrado',
  PRODUCT_NOT_FOUND: 'Produto não encontrado',
  CATEGORY_NOT_FOUND: 'Categoria não encontrada',
  INSUFFICIENT_STOCK: 'Estoque insuficiente',
} as const;
