import { authRepository } from '../repositories';
import { hashPassword, comparePassword, generateAccessToken, AppError } from '../utils';
import { HTTP_STATUS, AUTH_MESSAGES } from '../constants';
import { RegisterInput, LoginInput } from '../validators';
import { JWTPayload, LoginResponseData } from '../types';
import { User } from '@prisma/client';

/**
 * Authentication Service
 * Implements the business logic layer for register and login tasks.
 */
export const authService = {
  /**
   * Register a new user.
   */
  async register(input: RegisterInput): Promise<Omit<User, 'passwordHash'>> {
    // 1. Verify email uniqueness
    const existingEmail = await authRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new AppError(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // 2. Verify username uniqueness
    const existingUsername = await authRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new AppError(AUTH_MESSAGES.USERNAME_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // 3. Hash the password using bcrypt utility
    const passwordHash = await hashPassword(input.password);

    // 4. Save user via the repository layer
    const user = await authRepository.createUser({
      email: input.email,
      username: input.username,
      passwordHash,
    });

    // 5. Exclude passwordHash from returned object
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  /**
   * Log in user and generate JWT token.
   */
  async login(input: LoginInput): Promise<LoginResponseData> {
    let user: User | null = null;

    // Detect if identifier is email or username
    if (input.identifier.includes('@')) {
      user = await authRepository.findByEmail(input.identifier);
    } else {
      user = await authRepository.findByUsername(input.identifier);
    }

    // Fail if user not found
    if (!user) {
      throw new AppError(AUTH_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Validate the plaintext password against the stored bcrypt hash
    const passwordMatches = await comparePassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError(AUTH_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Construct the payload and generate token
    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: 'USER', // Default role on public sign up
    };

    const accessToken = generateAccessToken(jwtPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: 'USER',
      },
      accessToken,
    };
  },
};
