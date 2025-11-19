/**
 * Validation Middleware
 * Validate request body, params, and query using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.util.js';

export function validate(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(new ValidationError('Validation failed'));
      }
    }
  };
}

/**
 * Validate request body only
 */
export function validateBody(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(new ValidationError('Validation failed'));
      }
    }
  };
}

/**
 * Validate request params only
 */
export function validateParams(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(new ValidationError('Validation failed'));
      }
    }
  };
}

/**
 * Validate request query only
 */
export function validateQuery(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(new ValidationError('Validation failed'));
      }
    }
  };
}
