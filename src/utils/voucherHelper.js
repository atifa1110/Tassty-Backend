

export const VoucherHelper = {
    calculateDiscount: (voucher, subtotal, deliveryFee = 0) => {
        // 1. Validasi Minimal Order
        if (subtotal < voucher.min_order_value) {
            throw new Error(`Minimal pembelian untuk voucher ini adalah Rp${voucher.min_order_value.toLocaleString('id-ID')}`);
        }

        let calculatedDiscount = 0;

        // 2. Hitung berdasarkan tipe
        if (voucher.type === 'DISCOUNT' || voucher.type === 'CASHBACK') {
            if (voucher.discount_value <= 100) {
                // Tipe Persen (misal 10%)
                const discountFromPercent = (subtotal * voucher.discount_value) / 100;
                calculatedDiscount = Math.min(discountFromPercent, voucher.max_discount || discountFromPercent);
            } else {
                // Tipe Nominal (misal 10.000)
                calculatedDiscount = Math.min(voucher.discount_value, voucher.max_discount || voucher.discount_value);
            }
        } 
        else if (voucher.type === 'SHIPPING') {
            // Potongan ongkir
            calculatedDiscount = Math.min(deliveryFee, voucher.discount_value);
        }

        return Math.floor(calculatedDiscount); // Bulatkan ke bawah biar gak ada desimal
    }
};