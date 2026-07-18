import { Router } from 'express';
import { balanceController } from '../controllers';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest, validateRequestParams } from '../validators';
import { getBalanceByAssetSchema, depositSchema } from '../validators/balance.validator';

const router = Router();

// Apply JWT authentication requirement for all balance routes
router.use(requireAuth);

/**
 * GET /api/v1/balances
 * Returns all balances for the authenticated user.
 */
router.get('/', balanceController.getBalances);

/**
 * GET /api/v1/balances/:asset
 * Returns the balance of a specific asset for the authenticated user.
 */
router.get('/:asset', validateRequestParams(getBalanceByAssetSchema), balanceController.getBalanceByAsset);

/**
 * POST /api/v1/balances/deposit
 * Simulates a deposit of funds into the user's free balance.
 */
router.post('/deposit', validateRequest(depositSchema), balanceController.deposit);

export default router;
