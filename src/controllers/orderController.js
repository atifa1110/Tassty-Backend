import { OrderModel } from '../models/orderModel.js'
import { UserModel } from '../models/userModel.js';
import { RestaurantModel } from '../models/restaurantModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { sendOrderStatusNotification } from '../utils/NotificationService.js';
import { createInvoice, getPaymentChannels } from '../utils/xendit.js';
import { formatNotesAndOptions } from '../utils/openTimeHandler.js';
import stripe from '../config/stripeService.js';
import { ChatModel } from '../models/chatModel.js';

// Fungsi Helper untuk membuat 10 digit angka acak
const generateOrderNumber = () => {
    const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    return `T-${randomNumber}`;
};

const generateExternalNumber = () => {
    const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    return `Order-${randomNumber}`;
};

export const OrderController = {
    createOrder: async (req, res) => {
        try {
            const user_id = req.userId;
            const {
                restaurant_id,
                voucher_id,
                address_id,
                total_price,
                delivery_fee,
                discount = 0,
                total_order,
                items
            } = req.body;

            if (!user_id || !restaurant_id || !address_id || total_price === undefined || total_order === undefined || delivery_fee === undefined) {
                return ResponseHandler.error(res, 400, 'Missing required fields for order creation.');
            }

            // Validasi: Pastikan ada item
            if (!items || !Array.isArray(items) || items.length === 0) {
                return ResponseHandler.error(res, 400, 'Order must contain items.');
            }

            const orderPayload = {
                order_number: generateOrderNumber(),
                user_id: user_id,
                restaurant_id: restaurant_id,
                voucher_id: voucher_id,
                delivery_address_id: address_id,
                status: 'PENDING_PAYMENT',
                payment_status: 'PENDING',
                total_price: total_price,
                delivery_fee: delivery_fee,
                discount: discount,
                final_amount: total_order
            };

            const newOrderResult = await OrderModel.createOrders([orderPayload]);
            if (!newOrderResult || newOrderResult.length === 0) {
                throw new Error("Failed to insert the main order.");
            }
            const newOrder = newOrderResult[0];
            const orderId = newOrder.id;

            const orderItemsPayload = items.map(item => ({
                order_id: orderId,
                menu_id: item.menu_id,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes || null,
                options: item.options || null
            }));

            await OrderModel.createOrderItems(orderItemsPayload);

            return ResponseHandler.success(res, 201, 'Order created successfully', {
                order_id: orderId
            });
        } catch (error) {
            console.error('Error creating order:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    fetchAvailablePayment: async (req, res) => {
        try {
            const invoiceData = await getPaymentChannels();
            return ResponseHandler.success(res, 200, 'Payment channel fetch successfully', invoiceData);

        } catch (error) {
            console.error('❌ Error in fetchInvoice controller:', error);
            return ResponseHandler.error(res, error.response?.status || 500, error.response?.data?.message || error.message);
        }
    },

    invoiceOrder: async (req, res) => {
        try {
            const userId = req.userId;
            const orderId = req.params.orderId;
            const { payment_method } = req.body;

            if (!payment_method) {
                return ResponseHandler.error(res, 400, 'Missing required fields for payment order');
            }

            // 1. Ambil order
            const order = await OrderModel.getOrderById(orderId);
            if (!order) {
                return ResponseHandler.error(res, 404, `Order ${orderId} not found`);
            }

            const user = await UserModel.getUserProfile(userId);

            const invoiceData = {
                external_id: generateExternalNumber(),
                amount: Number(order.final_amount) || 1000,
                description: `Payment for order #${order.order_number}`,
                currency: 'IDR',
                invoice_duration: 600,
                reminder_time: 1,
                payer_email: user.email,
                payment_methods: [payment_method], // optional di sandbox
            };

            // 1️⃣ Buat invoice
            const invoiceRes = await createInvoice(invoiceData);
            if (!invoiceRes || !invoiceRes.id) {
                return ResponseHandler.error(res, 500, "Failed to create invoice");
            }

            // 3. Simpan invoice_id & payment_status = PENDING
            await OrderModel.updateOrderStatus(orderId, {
                invoice_id: invoiceRes.id,
                invoice_url: invoiceRes.invoice_url,
                payment_method: payment_method
            });

            // 4. Kirim link invoice untuk frontend redirect
            return ResponseHandler.success(res, 200, "Invoice created", {
                orderId,
                invoice_id: invoiceRes.id,
                invoice_url: invoiceRes.invoice_url
            });

        } catch (error) {
            console.error("Error creating invoice:", error);
            return ResponseHandler.error(res, 500, error.message);
        }
    },

    retryPayment: async (req, res) => {
        try {
            const userId = req.userId;
            const orderId = req.params.orderId;
            const { payment_method } = req.body;

            // 1. Ambil order
            const order = await OrderModel.getOrderById(orderId);
            if (!order) {
                return ResponseHandler.error(res, 404, "Order not found");
            }

            const user = await UserModel.getUserProfile(userId);

            //  Hanya boleh bayar ulang jika expired, cancelled, atau failed
            if (!["EXPIRED", "FAILED"].includes(order.payment_status)) {
                return ResponseHandler.error(res, 400, "Order is not eligible for retry payment");
            }

            // 3. Buat invoice baru
            const invoiceData = {
                external_id: generateExternalNumber(),
                amount: Number(order.final_amount) || 1000,
                description: `Payment for order #${order.order_number}`,
                currency: 'IDR',
                invoice_duration: 600,
                reminder_time: 1,
                payer_email: user.email,
                payment_methods: [payment_method], // optional di sandbox
            };

            const invoiceRes = await createInvoice(invoiceData);

            // 4. Update order dengan invoice baru
            await OrderModel.updateOrderStatus(orderId, {
                invoice_id: invoiceRes.id,
                invoice_url: invoiceRes.invoice_url,
                payment_method: payment_method,
                payment_status: "PENDING",
                status: "PENDING_PAYMENT"
            });

            // 5. Return invoice URL untuk FE
            return ResponseHandler.success(res, 200, "Invoice regenerated", {
                invoice_url: invoiceRes.invoice_url,
                invoice_id: invoiceRes.id
            });

        } catch (err) {
            console.error("Error retrying payment:", err);
            return ResponseHandler.error(res, 500, err.message);
        }
    },

    acceptOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const updates = { status: 'PREPARING' };
            const updatedOrder = await OrderModel.updateOrderStatus(orderId, updates);

            if (!updatedOrder) {
                return ResponseHandler.error(res, 404, `Order with ID ${orderId} not found.`);
            }

            try {
                await ChatModel.sendOrderStatusNotification(orderId, 'PREPARING');
                console.log(`[Notification] Sent PREPARING for order ${orderId}`);
            } catch (chatError) {
                console.error('Chat Notification Error:', chatError.message);
            }

            return ResponseHandler.success(res, 200, 'Order accepted by restaurant and is now preparing.', updatedOrder);
        } catch (error) {
            console.error('Error accepting order:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    pickupOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const updates = { status: 'ON_DELIVERY' };
            const updatedOrder = await OrderModel.updateOrderStatus(orderId, updates);

            if (!updatedOrder) {
                return ResponseHandler.error(res, 404, `Order with ID ${orderId} not found.`);
            }

            try {
                await ChatModel.sendOrderStatusNotification(orderId, 'ON_DELIVERY');
                console.log(`[Notification] Sent ON DELIVERY for order ${orderId}`);
            } catch (chatError) {
                console.error('Chat Notification Error:', chatError.message);
            }

            // 🌟 Client sekarang tahu Driver sedang dalam perjalanan
            return ResponseHandler.success(res, 200, 'Order picked up by driver and is now on delivery.', updatedOrder);

        } catch (error) {
            console.error('Error processing pickup:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    completeOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            // 🚨 Optional: Cek payment_method dari database untuk menentukan payment_status

            const updates = { status: 'COMPLETED' };
            const updatedOrder = await OrderModel.updateOrderStatus(orderId, updates);

            if (!updatedOrder) {
                return ResponseHandler.error(res, 404, `Order with ID ${orderId} not found.`);
            }

            try {
                await ChatModel.sendOrderStatusNotification(orderId, 'COMPLETED');
                console.log(`[Notification] Sent COMPLETED for order ${orderId}`);
            } catch (chatError) {
                console.error('Chat Notification Error:', chatError.message);
            }

            return ResponseHandler.success(res, 200, 'Order successfully completed.', updatedOrder);
        } catch (error) {
            console.error('Error completing order:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    cancelOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            // 🚨 Optional: Cek payment_method dari database untuk menentukan payment_status

            const updates = { status: 'CANCELLED' };
            const updatedOrder = await OrderModel.updateOrderStatus(orderId, updates);

            if (!updatedOrder) {
                return ResponseHandler.error(res, 404, `Order with ID ${orderId} not found.`);
            }

            if (updatedOrder.user_id) {
                await sendOrderStatusNotification(
                    updatedOrder.user_id,
                    orderId,
                    'CANCELLED'
                );
            }

            return ResponseHandler.success(res, 200, 'Order successfully completed.', updatedOrder);
        } catch (error) {
            console.error('Error completing order:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    getOrderDetails: async (req, res) => {
        try {
            const orderId = req.params.orderId;

            // Ambil data pesanan tunggal dari model
            const rawOrderData = await OrderModel.getDetailOrderById(orderId);

            if (!rawOrderData) {
                return ResponseHandler.error(res, 404, `Order with ID ${orderId} not found.`);
            }

            // Buat salinan objek data untuk dimodifikasi
            const processedOrder = { ...rawOrderData };

            // array order_items
            if (processedOrder.order_items && Array.isArray(processedOrder.order_items)) {
                processedOrder.order_items = processedOrder.order_items.map(item => {
                    const menuName = item.menu ? item.menu.name : 'Unknown Menu';
                    const menuImage = item.menu ? item.menu.image_url : 'Unknown Image';

                    return {
                        id: item.id,
                        menu_review_id: item.menu_review_id,
                        quantity: item.quantity,
                        price: item.price,
                        menu_name: menuName,
                        image_url: menuImage,
                        options: item.options,
                        notes: item.notes,
                    };
                });
            }
        
            return ResponseHandler.success(res, 200, 'Order details fetched successfully', processedOrder);

        } catch (error) {
            console.error('Error fetching order details:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    getOrderList: async (req, res) => {
        try {
            const userId = req.userId;

            const orders = await OrderModel.getListOrder(userId);

            if (!orders) {
                return ResponseHandler.error(res, 404, "You don't have any order yet.");
            }

            // Respon Sukses: Data sudah termasuk array order_items
            return ResponseHandler.success(res, 200, 'Order lists fetched successfully', orders);

        } catch (error) {
            console.error('Error fetching order details:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    getOrderSummary: async (req, res) => {
        try {
            const userId = req.userId;
            const orderId = req.params.orderId;

            const orders = await OrderModel.getOrderSummary(userId,orderId);

            if (!orders) {
                return ResponseHandler.error(res, 404, "You don't have any order yet.");
            }

            // Respon Sukses: Data sudah termasuk array order_items
            return ResponseHandler.success(res, 200, 'Order summary fetched successfully', orders);

        } catch (error) {
            console.error('Error fetching order details:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    getPendingOrder: async (req, res) => {
        try {
            const userId = req.userId;
            const orders = await OrderModel.getPendingOrder(userId);

            if (!orders) {
                return ResponseHandler.error(res, 404, "You don't have any order yet.");
            }

            return ResponseHandler.success(res, 200, 'Order lists fetched successfully', orders);
        } catch (err) {
            console.error('Error fetching order details:', err);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    invoiceCardOrder: async (req, res) => {
        try {
            const userId = req.userId;
            const orderId = req.params.orderId;
            const { payment_method } = req.body;

            if (!payment_method) {
                return ResponseHandler.error(res, 400, 'Missing required fields for payment order');
            }

            const order = await OrderModel.getOrderById(orderId);
            const user = await UserModel.getUserProfile(userId);
            const card = await UserModel.getUserCardByStripeId(payment_method);
            if (!card || card.length === 0) {
                return ResponseHandler.error(res, 400, 'Missing card id');
            }

            console.log("DEBUG CARD OBJECT:", card.id);
            console.log("DEBUG ORDER ID:", orderId);

            if (!order) {
                return ResponseHandler.error(res, 404, `Order ${orderId} not found`);
            }

            // 2. Ambil Customer ID dari database kamu (yang sudah pernah dibuat saat add card)
            // Misal di tabel user kamu simpan field 'stripe_customer_id'
            let stripeCustomerId = user.stripe_customer_id;

            // 3. Pastikan Payment Method ini adalah DEFAULT untuk invoice customer ini
            // Ini penting supaya saat invoice dibuat, Stripe tahu kartu mana yang ditarik
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: payment_method,
                },
            });

            await stripe.invoiceItems.create({
                customer: stripeCustomerId,
                amount: Math.round(order.final_amount * 100),
                currency: 'idr',
                description: `Payment for Order #${orderId}`,
            });

            // 5. Buat Invoice-nya
            const invoice = await stripe.invoices.create({
                customer: stripeCustomerId,
                collection_method: 'charge_automatically', // Otomatis tarik dari default_payment_method
                auto_advance: true, // Stripe otomatis mencoba memproses pembayaran
            });

            // 6. Finalisasi & Bayar (Pay)
            // Langkah ini akan mengeksekusi penarikan saldo dari kartu user
            const paidInvoice = await stripe.invoices.pay(invoice.id);
            const randomDriver = await UserModel.getRandomDrivers();
            const assignedDriverId = randomDriver ? randomDriver.id : null;

            // 7. Update status order di Database kamu
            await OrderModel.updateOrderById(orderId, {
                invoice_id: paidInvoice.id,
                invoice_url: paidInvoice.hosted_invoice_url,
                payment_method_id: card.id,
                payment_status: 'PAID',
                status: 'PLACED',
                driver_id: assignedDriverId
            });

            return ResponseHandler.success(res, 200, 'Payment successful', {
                invoice_id: paidInvoice.id,
                status: paidInvoice.status,
                receipt_url: paidInvoice.hosted_invoice_url
            });
        } catch (err) {
            console.error('Stripe Error:', err);

            if (err.type === 'StripeCardError') {
                return ResponseHandler.error(res, 402, "Payment Invalid");
            }

            return ResponseHandler.error(res, 500, 'Internal Server Error', err.message);
        }
    }
};

