import Stripe from 'stripe';
import 'dotenv/config';

// Pastikan env variable sudah terbaca (biasanya pakai dotenv di entry point)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Fungsi 1: Membuat SetupIntent
 * Dipanggil saat user mulai mau nambah kartu
 */
export const createSetupIntent = async (customerId) => {
  return await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
};

/**
 * Fungsi 2: Mengambil detail kartu
 * Dipanggil saat kartu sudah diverifikasi Stripe dan mau disimpan ke DB
 */
export const getPaymentMethodDetail = async (paymentMethodId) => {
  return await stripe.paymentMethods.retrieve(paymentMethodId);
};

// Export instance stripe-nya juga kalau-kalau butuh akses method lain
export default stripe;