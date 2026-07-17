import { Router } from 'express';
import { orderController } from '../controllers';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest, validateRequestParams } from '../validators';
import { createOrderSchema, getOrderByIdSchema } from '../validators/order.validator';

const router = Router();

// Apply JWT authentication requirement for all order routes
router.use(requireAuth);

/**
 * POST /api/v1/orders
 * Creates a new order (BUY or SELL).
 */
router.post('/', validateRequest(createOrderSchema), orderController.createOrder);

/**
 * GET /api/v1/orders
 * Returns all orders for the authenticated user.
 */
router.get('/', orderController.getOrders);

/**
 * GET /api/v1/orders/:id
 * Returns a single order for the authenticated user.
 */
router.get('/:id', validateRequestParams(getOrderByIdSchema), orderController.getOrderById);

export default router;
