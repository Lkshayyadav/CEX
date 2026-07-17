import { User } from '@prisma/client';
import { prisma } from '../lib';

/**
 * Authentication Repository
 * Houses all direct database query operations relating to users.
 */
export const authRepository = {
  /**
   * Find a user by email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * Find a user by username.
   */
  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  },

  /**
   * Find a user by their ID.
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  /**
   * Create a new user record.
   */
  async createUser(data: { email: string; username: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
      },
    });
  },
};
