import { Router } from 'express';
import { statusCheckController } from '../controllers';

const router = Router();

// Health/Status check endpoint
router.get('/health', statusCheckController);

// Placeholder for other sub-routes (e.g., auth, users, transactions)
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);

export default router;
