import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { OrderModel } from './models/orderModel.js'
import authRoutes from './routes/authRoutes.js'
import restaurantRoutes from './routes/restaurantRoutes.js'
import voucherRoutes from './routes/voucherRoutes.js'
import menuRoutes from './routes/menuRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import detailRoutes from './routes/detailRoutes.js'
import filterRoutes from './routes/filterRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { verifyStreamWebhook } from './config/streamWebhookVerify.js'
import { processNewMessageNotification } from './utils/NotificationService.js'
import { streamClient } from './config/streamServices.js'
import { globalLimiter, authLimiter } from './middlewares/rateLimiter.js'

dotenv.config()
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use('/api', globalLimiter);

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/restaurants', restaurantRoutes)
app.use('/api/vouchers', voucherRoutes)
app.use('/api/menus', menuRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/detail', detailRoutes)
app.use('/api/filters', filterRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/users', userRoutes)

app.get("/test-stream", async (req, res) => {
  try {
    const channel = streamClient.channel("messaging", "order-7812d613-d170-432d-9741-ffc74944129f")

    await channel.sendMessage({
      text: "Chat untuk Pesanan #7812d613 (Burger Bangor). Total: Rp28096200.",
      user_id: "09cf1701-86cf-4043-ade9-2084fa5b1927",
      is_order_info: true,
      order_id: "#7812d613",
      restaurant_name: "Burger Bangor - Kemang",
      total_price: "280.962",
      order_status: "Processed",
      restaurant_image: "https://link-foto-resto.com/logo.png" 
    })

    res.send("Message with Extra Data sent")

  } catch (err) {
    console.error(err)
    res.status(500).send("Error sending message")
  }
})


app.post("/xendit/webhook", express.json(), async (req, res) => {
    try {
        const event = req.body;
        const invoiceId = event.id; 

        // Pastikan event payment PAID
        if (event.status === "PAID") {
            await OrderModel.updateOrderStatusByInvoiceId(invoiceId, {
                payment_status: "PAID",
                status: "PLACED"
            });
        }

        if (event.status === "EXPIRED") {
            await OrderModel.updateOrderStatusByInvoiceId(invoiceId, {
                payment_status: "EXPIRED",
                status: "CANCELLED"
            });
        }

        res.status(200).send("OK");

    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).send("Webhook error");
    }
});

app.post("/webhook/stream",express.raw({ type: "*/*" }),(req, res) => {
    const signature = req.headers["x-signature"];
    const rawBody = req.body.toString();

    // 1. VERIFIKASI
    if (!verifyStreamWebhook(rawBody, signature)) {
        return res.status(401).send("Invalid signature");
    }

    // 2. Parse event
    const event = JSON.parse(rawBody);

    // 3. Handle event
    if (event.type === "message.new") {
        processNewMessageNotification(event);
    }

    // 4. Response
    res.send("OK");
  }
);

//app.listen(3000, () => console.log('Server running on http://localhost:3000'))

export default app;