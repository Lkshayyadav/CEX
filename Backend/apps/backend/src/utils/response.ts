import { Response } from 'express';

/**
 * Custom application-specific error class that propagates custom HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface SuccessResponse<T> {
  success: true;
  message?: string;
  data?: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    details?: any;
  };
}

/**
 * Sends a standardized JSON success response.
 */
export const sendSuccessResponse = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): void => {
  const responseBody: SuccessResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
  };
  res.status(statusCode).json(responseBody);
};

/**
 * Sends a standardized JSON error response.
 */
export const sendErrorResponse = (
  res: Response,
  message: string,
  statusCode = 500,
  details?: any
): void => {
  const responseBody: ErrorResponse = {
    success: false,
    error: {
      message,
      ...(details !== undefined && { details }),
    },
  };
  res.status(statusCode).json(responseBody);
};
