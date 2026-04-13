import ResponseHandler from '../utils/responseHandler.js'
import { ChatModel } from '../models/chatModel.js'
import { OrderModel } from '../models/orderModel.js'
import { RestaurantModel } from '../models/restaurantModel.js'

export const ChatController = {
    getChannel: async (req, res) => {
        try {
            const userId = req.userId;
            const { orderId } = req.body;

            if (!orderId || !userId) {
                return ResponseHandler.error(res, 400, 'Order IDs are required.');
            }

            const data = await OrderModel.getOrderById(orderId);

            // 1. Check if the Order actually exists
            if (!data) {
                return ResponseHandler.error(res, 404, 'Order not found.');
            }

            const restaurant = await RestaurantModel.getRestaurantById(data.restaurant_id);

            // 2. SAFETY CHECK: Check if restaurant exists before accessing .name
            if (!restaurant) {
                return ResponseHandler.error(res, 404, `Restaurant with ID ${data.restaurant_id} not found.`);
            }
            // Panggil model untuk mendapatkan atau membuat channel
            const channelId = await ChatModel.getOrCreateOrderChannel(
                orderId,
                userId,
                data.driver_id,
                restaurant.name,
                data.final_amount,
            );

            await OrderModel.updateOrderChannel(orderId, channelId);

            // channelCid akan berupa format 'messaging:order-UUID'
            return ResponseHandler.success(res, 200, 'Chat channel created and saved', {
                channel: channelId
            });

        } catch (error) {
            console.error('Error in getChannel controller:', error);
            return ResponseHandler.error(res, 500, 'Failed to retrieve or create chat channel: ' + error.message);
        }
    },
    updateSystemAccount: async (req, res) => {
        try {
            //await ChatModel.deleteChannel("order-ba41b61d-d7fc-4563-9548-225e7a8033fb");

            return ResponseHandler.success(res, 200, 'Berhasil memperbarui akun Sistem Tassty');
        } catch (error) {
            console.error('Error in updateSystemAccount controller:', error);
            return ResponseHandler.error(res, 500, 'Gagal update akun sistem: ' + error.message);
        }
    }
}