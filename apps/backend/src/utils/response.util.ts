/**
 * Response Utilities
 * Standardized API response formats
 */

import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Success response
 */
export function successResponse<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
}

/**
 * Error response
 */
export function errorResponse(
  res: Response,
  error: string,
  statusCode: number = 500
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
}

/**
 * Paginated response
 */
export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  };

  // Add pagination headers
  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page', page);
  res.setHeader('X-Per-Page', limit);
  res.setHeader('X-Total-Pages', Math.ceil(total / limit));

  return res.status(200).json(response);
}
