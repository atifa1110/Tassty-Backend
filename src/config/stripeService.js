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
 * Fungsi: Memproses Pembayaran Otomatis
 * Menggabungkan alur InvoiceItem, Create Invoice, dan Pay dalam satu panggil
 */
export const processPayment = async (stripeCustomerId, paymentMethodId, amount) => {
    // 1. Pastikan Payment Method ini jadi default untuk invoice
    await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
            default_payment_method: paymentMethodId,
        },
    });

    // 2. Buat item tagihan (Line Item)
    await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        amount: Math.round(amount * 100), 
        currency: 'idr',
        description: `Payment for Tassty Order`,
    });

    // 3. Buat Invoicenya
    const invoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        collection_method: 'charge_automatically',
        auto_advance: true,
    });

    // 4. Eksekusi Pembayaran
    return await stripe.invoices.pay(invoice.id);
};

/**
 * Fungsi 2: Mengambil detail kartu
 * Dipanggil saat kartu sudah diverifikasi Stripe dan mau disimpan ke DB
 */
export const getPaymentMethodDetail = async (paymentMethodId) => {
  return await stripe.paymentMethods.retrieve(paymentMethodId);
};

/**
 * Fungsi: Menghapus Kartu (Detach)
 * Menghapus keterkaitan kartu dengan customer agar tidak muncul lagi
 */
export const deletePaymentMethod = async (paymentMethodId) => {
  try {
    return await stripe.paymentMethods.detach(paymentMethodId);
  } catch (error) {
    console.error("Gagal menghapus kartu dari Stripe:", error.message);
    if (error.code === 'resource_missing') {
        error.statusCode = 404;
    }
    throw error;
  }
};

// Export instance stripe-nya juga kalau-kalau butuh akses method lain
export default stripe;