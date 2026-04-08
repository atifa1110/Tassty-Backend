import express from 'express';
import { OrderController } from '../controllers/orderController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const authMiddleware = new AuthMiddleware();

/* ============================
   📌 ORDER LIST & CREATE
============================ */
router.post('/', authMiddleware.authenticate, OrderController.createOrder);
router.get('/list', authMiddleware.authenticate, OrderController.getOrderList);

/* ============================
   📌 PAYMENT (Invoice + Channels)
============================ */
router.get('/payment_channels', authMiddleware.authenticate, OrderController.fetchAvailablePayment);
// Tambahkan / sebelum stripe dan / sebelum invoice
router.post('/:orderId/payments/xendit', authMiddleware.authenticate, OrderController.invoiceOrder);
router.post('/:orderId/payments/stripe', authMiddleware.authenticate, OrderController.invoiceCardOrder);
// Retry invoice
router.put('/:orderId/retry-payment', authMiddleware.authenticate, OrderController.retryPayment);

/* ============================›
   📌 ORDER STATUS ACTIONS
============================ */
router.put('/:orderId/accept', authMiddleware.authenticate, OrderController.acceptOrder);
router.put('/:orderId/pickup', authMiddleware.authenticate, OrderController.pickupOrder);
router.put('/:orderId/complete', authMiddleware.authenticate, OrderController.completeOrder);
router.put('/:orderId/cancel', authMiddleware.authenticate, OrderController.cancelOrder);


router.get('/pending', authMiddleware.authenticate, OrderController.getPendingOrder);

/* ============================
   📌 ORDER DETAILS (MUST BE LAST!)
============================ */
router.get('/:orderId', authMiddleware.authenticate, OrderController.getOrderDetails);
router.get('/:orderId/summary', authMiddleware.authenticate, OrderController.getOrderSummary);
export default router;
