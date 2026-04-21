

export const PriceHelper = {
    // Fungsi untuk ambil harga dasar menu (asli vs promo)
    calculateBasePrice: (menuInfo) => {
        if (!menuInfo) return 0;
        
        const isPromoActive = menuInfo.promo === true && menuInfo.price_discount !== null;
        return isPromoActive ? Number(menuInfo.price_discount) : Number(menuInfo.price_original);
    },

    // Fungsi untuk hitung total harga satu item (menu + toppings)
    calculateItemPrice: (basePrice, selectedOptions) => {
        const totalOptionsPrice = selectedOptions.reduce(
            (acc, opt) => acc + Number(opt.extra_price || opt.price_add || 0), 0
        );
        return basePrice + totalOptionsPrice;
    }
};