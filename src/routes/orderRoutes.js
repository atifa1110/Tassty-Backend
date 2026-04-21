import express from 'express';
import { OrderController } from '../controllers/orderController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { createOrderSchema, orderSchema, paymentSchema, paymentXenditSchema } from '../validators/orderValidator.js';

const router = express.Router();
const authMiddleware = new AuthMiddleware();

// Create a new order
router.post('/', authMiddleware.authenticate, authMiddleware.authorize('USER', 'ADMIN'), validate(createOrderSchema), OrderController.createOrder);
// Get order list
router.get('/', authMiddleware.authenticate, OrderController.getOrderList);
// Get order list pending payment
router.get('/pending', authMiddleware.authenticate, OrderController.getPendingOrder);

// Get available payment list in xendit
router.get('/payment_channels', authMiddleware.authenticate, OrderController.fetchAvailablePayment);
//  Payment method with  xendit
router.post('/:orderId/payments/xendit', authMiddleware.authenticate, authMiddleware.authorize("USER",'ADMIN'), validate(paymentXenditSchema), OrderController.invoiceOrder);
// Payment method with stripe
router.post('/:orderId/payments/stripe', authMiddleware.authenticate, authMiddleware.authorize("USER",'ADMIN'), validate(paymentSchema), OrderController.invoiceCardOrder);
// Retry invoice
router.put('/:orderId/retry-payment', authMiddleware.authenticate, authMiddleware.authorize("USER",'ADMIN'),  validate(paymentXenditSchema), OrderController.retryPayment);

// Update order preparing status
router.put('/:orderId/accept', authMiddleware.authenticate, authMiddleware.authorize("ADMIN"), validate(orderSchema), OrderController.acceptOrder);
// Update order delivery status
router.put('/:orderId/pickup', authMiddleware.authenticate, authMiddleware.authorize("DRIVER",'ADMIN'), validate(orderSchema), OrderController.pickupOrder);
// Update order complete status
router.put('/:orderId/complete', authMiddleware.authenticate, validate(orderSchema), authMiddleware.authorize("DRIVER",'ADMIN'),OrderController.completeOrder);
// Update order cancel status
router.put('/:orderId/cancel', authMiddleware.authenticate, validate(orderSchema), OrderController.cancelOrder);

// Get order detail
router.get('/:orderId', authMiddleware.authenticate, validate(orderSchema) ,OrderController.getOrderDetails);
// Get order summary
router.get('/:orderId/summary', authMiddleware.authenticate, validate(orderSchema) , OrderController.getOrderSummary);
// Get order route
router.get('/:orderId/route', authMiddleware.authenticate, validate(orderSchema) , OrderController.getOrderRoute);

export default router;
