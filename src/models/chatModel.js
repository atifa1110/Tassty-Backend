// src/models/ChatModel.js
import { streamClient } from "../config/streamServices.js";

export const ChatModel = {
    /**
     * Menghasilkan token aman dan melakukan upsert user (sinkronisasi profil).
     * Ini menggabungkan logic createStreamUserToken dan syncStreamUser.
     * @param {string} userId - ID unik user
     * @param {string} userName - Nama user
     * @param {string} userImage - URL gambar profil (opsional)
     * @returns {string} Token aman Stream Chat
     */
    async generateUserToken(userId, userName, userImage = null, userRole = null) {
        // Sinkronisasi User (Upsert)
        try {
            const userPayload = {
                id: userId,
                name: userName || userId,
                image: userImage || 'default_image_url',
                user_role: userRole
            };

            // Lakukan upsert user (Update atau Insert)
            await streamClient.upsertUser(userPayload);
            console.log(`[Stream] User ${userId} synced successfully.`);

        } catch (error) {
            console.error(`[Stream] Error syncing user ${userId}:`, error.message);

        }

        // Token harus dibuat setelah user ada/di-upsert
        const token = streamClient.createToken(userId);

        // Pastikan token yang dihasilkan adalah string valid
        if (!token || typeof token !== 'string') {
            throw new Error("Failed to generate Stream token: Invalid token received.");
        }

        return token;
    },

    /**
     * Membuat atau mendapatkan channel chat untuk pesanan spesifik.
     * Logika ini tetap menggunakan streamClient.
     * @param {string} orderId - ID pesanan
     * @param {string} customerId - ID pelanggan
     * @param {string} driverId - ID driver
     * @returns {string} Channel ID (CID)
     */
    async getOrCreateOrderChannel(orderId, customerId, driverId, restaurantName, amount) {
        const channelId = `order-${orderId}`;
        const members = [customerId, driverId];

        const channel = streamClient.channel('messaging', channelId, {
            members: members,
            name: `Obrolan Pesanan #${orderId}`,
            order_id: orderId,
            restaurant_name: restaurantName,
            order_amount: amount,
            created_by_id: customerId,
        });

        // Jika channel belum ada, Stream akan otomatis membuatnya (idempotent)
        const state = await channel.watch();

        // Kita cek jumlah pesan. Jika 0, berarti ini pertama kali dibuat.
        if (state.messages.length === 0) {
            const welcomeMessage = `Chat untuk Pesanan #${orderId} (${restaurantName}). Total: Rp${amount}.`;

            try {
                await channel.sendMessage({
                    text: welcomeMessage,
                    user_id: 'stream-system-user',
                    silent: true,
                });
            } catch (e) {
                console.warn("Gagal mengirim pesan sistem:", e.message);
            }
        }

        return channel.cid;
    },

    async sendOrderStatusNotification(orderId, status) {
        const channel = streamClient.channel('messaging', `order-${orderId}`);

        const statusContent = {
            'PREPARING': {
                title: `Order #${orderId} is Being Prepared`, // <--- DISINI SELIPANNYA!
                text: "The restaurant is preparing your food. Please wait a moment!",
                isSilent: true,
            },
            'ON_DELIVERY': {
                title: `Order #${orderId} is on the Way!`,
                text: "The driver has picked up your order and is heading to your location.",
                isSilent: false,
            },
            'COMPLETED': {
                title: `Order #${orderId} Delivered! Enjoy Your Meal`,
                text: "Your order has arrived. Don't forget to give us a 5-star review!",
                isSilent: false,
            },
            'CANCELLED': {
                title: `Order #${orderId} Cancellation Confirmed`,
                text: "Your order has been successfully cancelled. Hope to see you again!",
                isSilent: false,
            }
        };

        const currentStatus = statusContent[status];

        await channel.sendMessage({
            text: currentStatus.text,
            user_id: 'stream-system-user',
            type: 'system',
            silent: currentStatus.isSilent,
            related_id: orderId,
            notif_type: 'order',
            notif_title: currentStatus.title,
            notif_message: currentStatus.text
        });
    },
    async updateSystemUser() {
        try {
            await streamClient.upsertUser({
                id: 'stream-system-user',
                name: 'Tassty System',
                role: 'admin',
                custom_field: 'official_account'
            });
            console.log('Update System User Berhasil!');
        } catch (error) {
            console.error('Gagal Update:', error);
        }
    },
    async deleteChannel(channelId) {
        try {
            // Format channel: type='messaging', id=channelId
            const channel = streamClient.channel('messaging', channelId);

            // hard_delete: true akan menghapus semua pesan & data channel selamanya
            const response = await channel.delete({ hard_delete: true });

            return response;
        } catch (error) {
            throw new Error('Stream Delete Error: ' + error.message);
        }
    }
}