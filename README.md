# 🍔 Tassty - Food Delivery API

Tassty adalah backend service untuk aplikasi pengiriman makanan yang dibangun dengan fokus pada performa, keamanan, dan integrasi pembayaran real-time.

## 🚀 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL via Supabase
- **Authentication:** JWT (JSON Web Token)
- **Payment Gateway:** Xendit & Stripe Integration
- **Testing:** Jest & Supertest
- **Validation:** Joi

## ✨ Key Features
- **Order Management:** Sistem pemesanan makanan dengan generate order number otomatis.
- **Payment Integration:** Mendukung pembayaran via Xendit (e-wallet/VA) dan Stripe (Credit Card).
- **Real-time Tracking:** Integrasi Google Maps Directions API untuk simulasi pergerakan driver.
- **Role-based Access Control:** Pembedaan akses untuk User, Driver, dan Admin.
- **Automated Notifications:** Pengiriman status order secara real-time.

## 🛠️ Installation & Setup

1. Clone repository:
   ```bash
   git clone [https://github.com/atifa110/Tassty-Backend.git](https://github.com/atifa1110/Tassty-Backend)

## 🌐 Deployment

Backend **Tassty** sudah di-deploy dan dapat diakses secara online menggunakan **Vercel**.

## 🌐 Live Demo
Aplikasi ini telah dideploy secara otomatis menggunakan Vercel. Anda dapat mencoba API-nya secara langsung di:
🔗 [https://tassty-backend.vercel.app](https://tassty-backend.vercel.app)

*Catatan: Gunakan Postman atau API Client lainnya untuk berinteraksi dengan endpoint.*

### ⚙️ Deployment Details
- Serverless deployment via Vercel
- Environment variables dikelola melalui Vercel Dashboard
- Terintegrasi dengan Supabase untuk database & authentication
- Mendukung payment gateway:
  - Xendit (E-Wallet & Virtual Account)
  - Stripe (Credit Card)