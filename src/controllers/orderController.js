import { OrderModel } from '../models/orderModel.js'
import { UserModel } from '../models/userModel.js';
import { RestaurantModel } from '../models/restaurantModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { sendOrderStatusNotification } from '../utils/NotificationService.js';
import { createInvoice, getPaymentChannels } from '../utils/xendit.js';
import { ChatModel } from '../models/chatModel.js';
import { startDriverSimulation } from '../config/supabaseClient.js';
import { processPayment } from '../config/stripeService.js';
import { getPolylineData } from '../utils/mapsHelper.js';
import polyline from '@mapbox/polyline';
import { MenuModel } from '../models/menuModel.js';
import { VoucherModel } from '../models/voucherModel.js';
import { VoucherHelper } from '../utils/voucherHelper.js';
import { PriceHelper } from '../utils/priceHelper.js';
import { FormatHelper } from '../utils/formatHelper.js';

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
                total_order,
                items
            } = req.body;

            const calculatedDeliveryFee = await OrderModel.getDeliveryFee(restaurant_id, address_id);

            const menuIds = items.map(item => item.menu_id);
            const dbMenus = await MenuModel.getMenusByIds(menuIds);

            let calculatedSubtotal = 0;
            const processedItems = [];
            for (const item of items) {
                // Cari info menu
                const menuInfo = dbMenus.find(m => m.id === item.menu_id);
                if (!menuInfo) {
                    return ResponseHandler.error(res, 404, `Menu ${item.menu_id} tidak ditemukan`);
                }

                // Ambil data options dari DB berdasarkan ID
                const selectedOptions = await MenuModel.getOptionsWithGroups(item.option_ids);
                // Hitung Subtotal (Harga Menu + Topping) * Quantity
                const basePrice = PriceHelper.calculateBasePrice(menuInfo);
                const pricePerItem = PriceHelper.calculateItemPrice(basePrice, selectedOptions);
                calculatedSubtotal += pricePerItem * item.quantity;

                const optionDetailText = FormatHelper.formatSelectedOptions(selectedOptions);

                processedItems.push({
                    menu_id: item.menu_id,
                    quantity: item.quantity,
                    price_at_order: pricePerItem,
                    notes: item.notes || null,
                    options: optionDetailText
                });
            }

            // 3. Hitung Voucher
            let calculatedDiscount = 0;
            if (voucher_id) {
                const voucher = await VoucherModel.getVoucherById(voucher_id);
                calculatedDiscount = VoucherHelper.calculateDiscount(voucher, calculatedSubtotal, calculatedDeliveryFee);
            }

            const finalAmountFromServer = calculatedSubtotal + calculatedDeliveryFee - calculatedDiscount;
            if (finalAmountFromServer !== Number(total_order)) {
                return ResponseHandler.error(res, 409, "Prices have updated. Please check your order again.");
            }

            const orderPayload = {
                order_number: generateOrderNumber(),
                user_id: user_id,
                restaurant_id: restaurant_id,
                voucher_id: voucher_id || null,
                delivery_address_id: address_id,
                status: 'PENDING_PAYMENT',
                payment_status: 'PENDING',
                total_price: calculatedSubtotal,
                delivery_fee: calculatedDeliveryFee,
                discount: calculatedDiscount,
                final_amount: finalAmountFromServer
            };

            const newOrderResult = await OrderModel.createOrders([orderPayload]);
            if (!newOrderResult || newOrderResult.length === 0) throw new Error("Gagal menyimpan order.");

            const orderId = newOrderResult[0].id;

            // 8. Siapkan & Insert Order Items (Detail Pesanan)
            const orderItemsPayload = processedItems.map(item => ({
                order_id: orderId,
                menu_id: item.menu_id,
                quantity: item.quantity,
                price: item.price_at_order,
                notes: item.notes,
                options: item.options
            }));

            await OrderModel.createOrderItems(orderItemsPayload);

            return ResponseHandler.success(res, 201, 'Pesanan berhasil dibuat', {
                order_id: orderId,
                final_amount: finalAmountFromServer
            });
        } catch (error) {
            console.error('Error creating order:', error);

            // Jika error datang dari lemparan manual (seperti di VoucherHelper)
            if (error instanceof Error && error.message.includes('Minimal pembelian')) {
                return ResponseHandler.error(res, 400, error.message);
            }
            return ResponseHandler.error(res, 500, 'Internal Server Error');
        }
    },


    fetchAvailablePayment: async (req, res) => {
        try {
            const invoiceData = await getPaymentChannels();
            return ResponseHandler.success(res, 200, 'Payment channel fetch successfully', invoiceData);

        } catch (error) {
            console.error('Error in fetch Invoice controller:', error);
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

            // Buat invoice
            const invoiceRes = await createInvoice(invoiceData);
            if (!invoiceRes || !invoiceRes.id) {
                return ResponseHandler.error(res, 500, "Failed to create invoice");
            }

            // 3. Simpan invoice_id & payment_status = PENDING
            await OrderModel.updateOrderById(orderId, {
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
            await OrderModel.updateOrderById(orderId, {
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
            const updates = {
                status: 'PREPARING'
            };
            const updatedOrder = await OrderModel.updateOrderById(orderId, updates);

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
            const order = await OrderModel.getOrderById(orderId);
            const updates = {
                status: 'ON_DELIVERY',
                driver_start_time: new Date().toISOString()
            };
            const updatedOrder = await OrderModel.updateOrderById(orderId, updates);

            if (updatedOrder) {
                const points = polyline.decode(order.polyline_data);
                const totalSteps = points.length;
                await startDriverSimulation(orderId, totalSteps);
            } else {
                return ResponseHandler.error(res, 404, `Order dengan ID ${orderId} tidak ditemukan di database.`);
            }

            try {
                await ChatModel.sendOrderStatusNotification(orderId, 'ON_DELIVERY');
                console.log(`[Notification] Sent ON DELIVERY for order ${orderId}`);
            } catch (chatError) {
                console.error('Chat Notification Error:', chatError.message);
            }

            return ResponseHandler.success(res, 200, 'Order picked up by driver and is now on delivery.', updatedOrder);

        } catch (error) {
            console.error('Error delivering order:', error);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
        }
    },

    completeOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const updates = {
                status: 'COMPLETED',
                driver_start_time: null
            };
            const updatedOrder = await OrderModel.updateOrderById(orderId, updates);

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
            const updates = { status: 'CANCELLED' };
            const updatedOrder = await OrderModel.updateOrderById(orderId, updates);

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
            console.error('Error cancel order:', error);
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

            const orders = await OrderModel.getOrderSummary(userId, orderId);

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
            const { stripe_pm_id } = req.body;

            const order = await OrderModel.getOrderById(orderId);
            const user = await UserModel.getUserProfile(userId);
            const card = await UserModel.getUserCardByStripeId(stripe_pm_id);
            const restaurant = await RestaurantModel.getRestaurantById(order.restaurant_id);
            const address = await UserModel.getAddressById(order.user_id, order.delivery_address_id);

            if (!card || card.length === 0) {
                return ResponseHandler.error(res, 400, 'Missing card id');
            }

            //console.log("DEBUG CARD OBJECT:", card.id);
            //console.log("DEBUG ORDER ID:", orderId);

            if (!order) {
                return ResponseHandler.error(res, 404, `Order ${orderId} not found`);
            }

            const routeData = await getPolylineData(
                { lat: restaurant.latitude, lng: restaurant.longitude },
                { lat: address.latitude, lng: address.longitude }
            );

            const paidInvoice = await processPayment(
                user.stripe_customer_id,
                stripe_pm_id,
                order.final_amount
            );

            const randomDriver = await UserModel.getRandomDrivers();
            const assignedDriverId = randomDriver ? randomDriver.id : null;

            await OrderModel.updateOrderById(orderId, {
                invoice_id: paidInvoice.id,
                invoice_url: paidInvoice.hosted_invoice_url,
                payment_method_id: card.id,
                payment_status: 'PAID',
                status: 'PLACED',
                polyline_data: routeData.points,
                distance: routeData.distance,
                duration: routeData.duration,
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
    },

    getOrderRoute: async (req, res) => {
        try {
            const { orderId } = req.params;
            const order = await OrderModel.getOrderById(orderId);

            if (!order) {
                return ResponseHandler.error(res, 404, 'Order tidak ditemukan');
            }
            return ResponseHandler.success(res, 200, 'Berhasil mendapatkan rute', {
                distance: order.distance,
                duration: order.duration,
                polylinePoints: order.polyline_data,
                status: order.status
            });
        } catch (error) {
            console.error("Route Error:", error);
            return ResponseHandler.error(res, 500, 'Internal Server Error');
        }
    }
};