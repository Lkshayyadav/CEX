import { Request, Response, NextFunction } from 'express';
import { authService } from '../services';
import { sendSuccessResponse } from '../utils';
import { HTTP_STATUS, AUTH_MESSAGES } from '../constants';

/**
 * Authentication Controller
 * Orchestrates Express HTTP requests and delegates to the Auth Service.
 */
export const authController = {
  /**
   * Register a new user.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.register(req.body);
      sendSuccessResponse(res, user, AUTH_MESSAGES.REGISTER_SUCCESS, HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify login credentials and return accessToken.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.login(req.body);
      sendSuccessResponse(res, data, AUTH_MESSAGES.LOGIN_SUCCESS, HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },
};
