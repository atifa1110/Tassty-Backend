import admin from '../config/firebaseService.js';
import { UserModel } from '../models/userModel.js';

export async function sendOrderStatusNotification(userId, orderId, newStatus) {
    // Ambil semua token perangkat pengguna
    const user = await UserModel.getUserProfile(userId);
    const tokens = user.device_tokens

    if (tokens.length === 0) {
        console.warn(`[FCM] No tokens found for User ID: ${userId}. Skipping notification.`);
        return;
    }

    // Pemetaan status untuk pesan yang lebih ramah pengguna dan emoji
    const statusMap = {
        'PREPARING': 'Sedang Disiapkan 🧑‍🍳',
        'ON_DELIVERY': 'Dalam Perjalanan 🛵',
        'COMPLETED': 'Telah Diterima 🎉',
        'CANCELLED': 'Dibatalkan ❌'
    };

    // Pastikan status ada atau fallback ke versi huruf besar (uppercase)
    const friendlyStatus = statusMap[newStatus] || newStatus.toUpperCase();
    
    // Potong Order ID untuk judul (jika ID-nya panjang)
    const shortOrderId = orderId.substring(0, 8);

    // Payload Notifikasi FCM
    const message = {
        notification: {
            title: `Pesanan #${shortOrderId}: ${friendlyStatus}`,
            body: `Status pesanan Anda kini berubah menjadi ${friendlyStatus}.`,
        },
        data: {
            // Data custom yang akan dibaca oleh aplikasi client (Kotlin) saat notifikasi diklik
            orderId: orderId,
            status: newStatus,
            type: 'ORDER_UPDATE' 
        },
        // Menggunakan multicast untuk mengirim ke banyak token sekaligus
        tokens: tokens, 
    };

    try {
        // Kirim notifikasi menggunakan Firebase Admin SDK
        const response = await admin.messaging().sendMulticast(message);
        
        console.log(`[FCM] Sent: ${response.successCount}, Failed: ${response.failureCount} for user ${userId}.`);

        // 🚨 Tindakan Penting: Menangani Token yang Gagal (Invalid)
        if (response.failureCount > 0) {
            // Ini adalah tempat Anda menerapkan logika untuk menghapus token yang invalid/kadaluarsa
            // dari array JSONB di database users. Ini memastikan Anda tidak membuang resource FCM.
            await handleFailedTokens(tokens, response.responses, userId);
        }
        
    } catch (error) {
        console.error('[FCM] Error sending multicast message:', error);
    }
}

// Pindahkan helper ini di bawah fungsi sendOrderStatusNotification
async function handleFailedTokens(allTokens, responses, userId) {
    const invalidTokens = [];
    
    // Identifikasi token mana yang gagal karena kode error FCM spesifik
    responses.forEach((resp, index) => {
        if (!resp.success) {
            const errorCode = resp.error.code;
            
            // Kode error FCM yang menandakan token sudah tidak terdaftar/invalid:
            if (errorCode === 'messaging/invalid-argument' || 
                errorCode === 'messaging/registration-token-not-registered') 
            {
                invalidTokens.push(allTokens[index]);
            }
        }
    });

    if (invalidTokens.length > 0) {
        // 🌟 PANGGIL USER MODEL UNTUK MENGHAPUS DARI DATABASE
        await UserModel.removeInvalidDeviceTokens(userId, invalidTokens);
    }
}

// Fungsi untuk memproses notifikasi pesan baru (dipanggil oleh webhook Stream)
export async function processNewMessageNotification(event) {
    const newMessage = event.message;
    const channel = event.channel;

    if (!newMessage || !channel) {
        console.warn('[FCM] Missing message or channel payload.');
        return;
    }

    // 1. Tentukan pengirim (sender)
    const senderId = newMessage.user?.id;

    // 2. Tentukan penerima (target user = anggota lain selain pengirim)
    const allMembers = channel.members.map(m => m.user_id);
    const targetUserId = allMembers.find(id => id !== senderId);

    if (!targetUserId) {
        console.warn('[FCM] No target user found.');
        return;
    }

    // 3. Ambil token FCM penerima dari database kamu
    const targetUser = await UserModel.getUserProfile(targetUserId);
    const tokens = targetUser?.device_tokens || [];

    if (!tokens.length) {
        console.warn(`[FCM] No FCM tokens for user ${targetUserId}.`);
        return;
    }

    // 4. Judul & body notifikasi
    const senderName = newMessage.user?.name || 'Pesan Baru';
    const messageText = newMessage.text || '[Pesan tidak memiliki teks]';

    // 5. Payload FCM
    const payload = {
        notification: {
            title: senderName,
            body: messageText,
        },
        data: {
            type: 'CHAT_MESSAGE',
            channel_cid: channel.cid,
            order_id: channel.order_id || '',
            sender_id: senderId,
        },
        tokens: tokens,
    };

    // 6. Kirim notifikasi multicast
    try {
        const response = await admin.messaging().sendMulticast(payload);
        console.log(`[FCM] Chat notif sent -> Success: ${response.successCount}, Failed: ${response.failureCount}`);
        
        if (response.failureCount > 0) {
            await handleFailedTokens(tokens, response.responses, targetUserId);
        }
    } catch (err) {
        console.error('[FCM] Error sending chat notification:', err);
    }
}
