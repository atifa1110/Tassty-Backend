import express from 'express';
import { OrderController } from '../controllers/orderController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { createOrderSchema, orderSchema, paymentSchema, paymentXenditSchema } from '../validators/orderValidator.js';

const router = express.Router();
const authMiddleware = new AuthMiddleware();

// Create a new order
router.post('/', validate(createOrderSchema), authMiddleware.authenticate, OrderController.createOrder);
// Get order list
router.get('/', authMiddleware.authenticate, OrderController.getOrderList);
// Get order list pending payment
router.get('/pending', authMiddleware.authenticate, OrderController.getPendingOrder);

// Get available payment list in xendit
router.get('/payment_channels', authMiddleware.authenticate, OrderController.fetchAvailablePayment);
//  Payment method with  xendit
router.post('/:orderId/payments/xendit', validate(paymentXenditSchema) , authMiddleware.authenticate, OrderController.invoiceOrder);
// Payment method with stripe
router.post('/:orderId/payments/stripe', validate(paymentSchema) , authMiddleware.authenticate, OrderController.invoiceCardOrder);
// Retry invoice
router.put('/:orderId/retry-payment', validate(paymentXenditSchema), authMiddleware.authenticate, OrderController.retryPayment);

// Update order preparing status
router.put('/:orderId/accept', validate(orderSchema), authMiddleware.authenticate, OrderController.acceptOrder);
// Update order delivery status
router.put('/:orderId/pickup', validate(orderSchema), authMiddleware.authenticate, OrderController.pickupOrder);
// Update order complete status
router.put('/:orderId/complete', validate(orderSchema), authMiddleware.authenticate, OrderController.completeOrder);
// Update order cancel status
router.put('/:orderId/cancel', validate(orderSchema), authMiddleware.authenticate, OrderController.cancelOrder);

// Get order detail
router.get('/:orderId', validate(orderSchema) ,authMiddleware.authenticate, OrderController.getOrderDetails);
// Get order summary
router.get('/:orderId/summary',validate(orderSchema) , authMiddleware.authenticate, OrderController.getOrderSummary);
// Get order route
router.get('/:orderId/route', validate(orderSchema), authMiddleware.authenticate, OrderController.getOrderRoute);

export default router;
