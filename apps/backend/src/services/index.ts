import { UserRepository } from '../repositories';

/**
 * Example UserService pattern to demonstrate business logic isolation.
 */
export const UserService = {
  async getUserProfile(userId: string) {
    console.log(`[Service] Fetching profile logic for user: ${userId}`);
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    return user;
  },
};

export * from './auth.service';
export * from './market.service';
export * from './balance.service';
