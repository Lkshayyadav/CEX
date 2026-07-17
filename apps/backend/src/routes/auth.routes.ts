import { Router } from 'express';
import { authController } from '../controllers';
import { validateRequest } from '../validators';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Request payload validated via registerSchema Zod validator.
 */
router.post('/register', validateRequest(registerSchema), authController.register);

/**
 * POST /api/v1/auth/login
 * Request payload validated via loginSchema Zod validator.
 */
router.post('/login', validateRequest(loginSchema), authController.login);

export default router;
