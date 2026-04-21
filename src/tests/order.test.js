import request from "supertest";
import express from 'express';
import router from "../routes/orderRoutes";
import admin from "../config/firebaseService";
import { supabaseAuth } from "../config/supabaseClient";
import { OrderModel } from "../models/orderModel";
import { MenuModel } from "../models/menuModel";
import { PriceHelper } from "../utils/priceHelper";
import { FormatHelper } from "../utils/formatHelper";
import { VoucherHelper } from "../utils/voucherHelper";
import { VoucherModel } from "../models/voucherModel";

jest.mock('../config/supabaseClient.js', () => ({
    supabaseAuth: {
        auth: {
            getUser: jest.fn()
        }
    }
}));

jest.mock('../models/orderModel.js', () => ({
    OrderModel: {
        getDeliveryFee: jest.fn(),
        createOrders: jest.fn(),
        createOrderItems: jest.fn()
    }
}));

jest.mock('../models/voucherModel', () => ({
    VoucherModel: {
        getVoucherById: jest.fn()
    }
}));

jest.mock('../models/menuModel.js', () => ({
    MenuModel: {
        getMenusByIds: jest.fn(),
        getOptionsWithGroups: jest.fn()
    }
}));

jest.mock('../utils/priceHelper', () => ({
    PriceHelper: {
        calculateBasePrice: jest.fn(),
        calculateItemPrice: jest.fn()
    }
}));

jest.mock('../utils/formatHelper.js', () => ({
    FormatHelper: {
        formatSelectedOptions: jest.fn().mockReturnValue('No options')
    }
}));

jest.mock('../utils/voucherHelper', () => ({
    VoucherHelper: {
        calculateDiscount: jest.fn()
    }
}))

jest.mock('../utils/NotificationService.js', () => ({
    sendNotification: jest.fn(),
    sendToTopic: jest.fn()
}));

jest.mock('../config/firebaseService.js', () => ({}));

const app = express();
app.use(express.json());
app.use('/orders', router);

describe('POST /orders', () => {
    const validOrderData = {
        restaurant_id: 'REST-001',
        address_id: 'ADDR-01',
        total_order: 113000,
        items: [
            {
                menu_id: 'MEN-003',
                price: 54000,
                quantity: 2,
                notes: null,
                option_ids: []
            }
        ]
    };

    const validOrderDataVoucher = {
        restaurant_id: 'REST-001',
        voucher_id: 'VOC-001',
        address_id: 'ADDR-01',
        total_order: 93000,
        items: [
            {
                menu_id: 'MEN-003',
                price: 54000,
                quantity: 2,
                notes: null,
                option_ids: []
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('harus gagal (400) jika items kosong', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user_123', user_metadata: { role: 'USER' } } },
            error: null
        });

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send({ ...validOrderData, items: [] });

        // Jika kamu pakai Joi/Validator middleware, pastikan pesan errornya match
        expect(res.statusCode).toEqual(400);
    });

    it('harus gagal (400) jika kirim REST ID kosong', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send({
                restaurant_id: '',
                address_id: 'ADDR-01',
                total_price: 108000,
                delivery_fee: 5000,
                discount: 0,
                total_order: 113000,
                items: [
                    {
                        menu_id: "MEN-003",
                        quantity: 2,
                        price: 54000,
                        notes: null,
                        options: "Pilih Varian Kopi: Kenangan Blend\nSugar Level: Normal Sugar\nSize: Iced Jumbo\nMilk Option: Fresh Milk\nIce level: Less Ice\nSyrup: Hazelnut Syrup"
                    }
                ]
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Restaurant ID is required.');
    });

    it('harus gagal (400) jika kirim ADDRESS ID kosong', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send({
                restaurant_id: 'REST-001', // Kosong
                address_id: '',
                total_price: 108000,
                delivery_fee: 5000,
                discount: 0,
                total_order: 113000,
                items: [
                    {
                        menu_id: "MEN-003",
                        quantity: 2,
                        price: 54000,
                        notes: null,
                        options: "Pilih Varian Kopi: Kenangan Blend\nSugar Level: Normal Sugar\nSize: Iced Jumbo\nMilk Option: Fresh Milk\nIce level: Less Ice\nSyrup: Hazelnut Syrup"
                    }
                ]
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Address ID is required.');
    });

    it('harus gagal (400) jika kirim TOTAL ORDER kosong', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send({
                restaurant_id: 'REST-001',
                address_id: 'ADDR-01',
                items: [
                    {
                        menu_id: 'MEN-003',
                        quantity: 2,
                        option_ids: [1, 2]
                    }
                ]
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Data are required.');
    });

    it('harus gagal (400) jika kirim items kosong', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send({
                restaurant_id: 'REST-001',
                address_id: 'ADDR-01',
                total_price: 10000,
                delivery_fee: 5000,
                discount: 0,
                total_order: 15000,
                items: []
            });

        expect(res.statusCode).toEqual(400)
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Order must contain at least one item.')
    });

    it('harus gagal (400) jika kirim MENU ID kosong', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send({
                restaurant_id: 'REST-001',
                address_id: 'ADDR-01',
                total_price: 108000,
                delivery_fee: 5000,
                discount: 0,
                total_order: 113000,
                items: [
                    {
                        menu_id: "",
                        quantity: 2,
                        price: 54000,
                        notes: null,
                        options: "Pilih Varian Kopi: Kenangan Blend\nSugar Level: Normal Sugar\nSize: Iced Jumbo\nMilk Option: Fresh Milk\nIce level: Less Ice\nSyrup: Hazelnut Syrup"
                    }
                ]
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Menu ID is required.');
    });

    it('harus berhasil dan mengembalikan ORDER ID', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user_123', user_metadata: { role: 'USER' } } },
            error: null
        });

        // Simulasi: (Harga 51500 * Qty 2) + Delivery 10000 - Discount 0 = 113000
        OrderModel.getDeliveryFee.mockResolvedValue(5000);

        // Mock MenuModel harus punya field price agar PriceHelper bekerja
        MenuModel.getMenusByIds.mockResolvedValue([{
            id: 'MEN-003',
            price: 54000
        }]);
        MenuModel.getOptionsWithGroups.mockResolvedValue([]);

        PriceHelper.calculateBasePrice.mockReturnValue(54000);
        PriceHelper.calculateItemPrice.mockReturnValue(54000);

        OrderModel.createOrders.mockResolvedValue([{ id: 'ORD-123' }]);
        OrderModel.createOrderItems.mockResolvedValue(true);

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderData);

        expect(res.statusCode).toEqual(201);
        expect(res.body.meta.message).toBe('Pesanan berhasil dibuat');
        expect(res.body.data.order_id).toBe('ORD-123');
    });

    it('harus gagal (409) jika harga dari server tidak cocok dengan body', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user_123', user_metadata: { role: 'USER' } } },
            error: null
        });

        OrderModel.getDeliveryFee.mockResolvedValue(10000);
        MenuModel.getMenusByIds.mockResolvedValue([{ id: 'MEN-003', price: 50000 }]);

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderData);

        expect(res.statusCode).toEqual(409);
        expect(res.body.meta.message).toBe("Prices have updated. Please check your order again.");
    });

    it('harus berhasil membuat order dengan potongan voucher', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user_123', user_metadata: { role: 'USER' } } },
            error: null
        });

        // 1. Mock Data Dasar
        const subtotal = 108000; // 54000 * 2
        const deliveryFee = 5000;
        const discount = 20000; // Kita mau diskon 20rb
        const expectedTotal = subtotal + deliveryFee - discount; // 93000

        OrderModel.getDeliveryFee.mockResolvedValue(deliveryFee);
        MenuModel.getMenusByIds.mockResolvedValue([{ id: 'MEN-003', price: 54000 }]);
        MenuModel.getOptionsWithGroups.mockResolvedValue([]);

        // Pastikan VoucherHelper dikembalikan nilai diskonnya
        VoucherModel.getVoucherById.mockResolvedValue({
            id: 'VOU-001',
            type: 'DISCOUNT',
            discount_value: 20000,
            min_order_value: 50000,
            max_discount: 20000
        });
        VoucherHelper.calculateDiscount.mockReturnValue(discount);

        OrderModel.createOrders.mockResolvedValue([{ id: 'ORD-123' }]);
        OrderModel.createOrderItems.mockResolvedValue(true);

        // 3. Kirim Request dengan voucher_id
        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderDataVoucher);

        console.log(res.body.data)
        expect(res.statusCode).toEqual(201);
        expect(res.body.data.final_amount).toBe(expectedTotal);
    });

    it('harus gagal (400) jika subtotal kurang dari minimal pembelian voucher', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user_123', user_metadata: { role: 'USER' } } },
            error: null
        });

        const subtotal = 108000; // 54000 * 2
        const deliveryFee = 5000;
        const discount = 20000; // Kita mau diskon 20rb
        const expectedTotal = subtotal + deliveryFee - discount; // 93000

        // 2. Setup Mock Database & Helper
        OrderModel.getDeliveryFee.mockResolvedValue(5000);
        MenuModel.getMenusByIds.mockResolvedValue([{ id: 'MEN-003', price: 54000 }]);
        MenuModel.getOptionsWithGroups.mockResolvedValue([]);

        VoucherModel.getVoucherById.mockResolvedValue({
            id: 'VOU-001',
            type: 'DISCOUNT',
            discount_value: 20000,
            min_order_value: 10000,
            max_discount: 20000
        });
        // Pakai ini kalau mau ngetes ERROR (Status 400)
        VoucherHelper.calculateDiscount.mockImplementation(() => {
            throw new Error('Minimal pembelian untuk voucher ini adalah Rp100.000');
        });

        OrderModel.createOrders.mockResolvedValue([{ id: 'ORD-123' }]);
        OrderModel.createOrderItems.mockResolvedValue(true);

        // 3. Kirim Request dengan voucher_id
        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderDataVoucher);

        console.log(res.body.data)
        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.message).toBe('Minimal pembelian untuk voucher ini adalah Rp100.000');
    });

    it('harus gagal (500) jika terjadi kesalahan pada database saat menyimpan order', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user_123', user_metadata: { role: 'USER' } } },
            error: null
        });

        // Mock data dasar agar lolos validasi awal
        OrderModel.getDeliveryFee.mockResolvedValue(5000);
        MenuModel.getMenusByIds.mockResolvedValue([{ id: 'MEN-003', price: 54000 }]);
        PriceHelper.calculateBasePrice.mockReturnValue(54000);
        PriceHelper.calculateItemPrice.mockReturnValue(54000);

        // PAKSA ERROR: Simulasikan database mati saat createOrders
        OrderModel.createOrders.mockRejectedValue(new Error('Database Connection Failed'));

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderData);

        expect(res.statusCode).toEqual(500);
        expect(res.body.meta.status).toBe('error');
        // Biasanya pesannya "Internal Server Error" sesuai yang kamu set di controller
        expect(res.body.meta.message).toBeDefined();
    });

});