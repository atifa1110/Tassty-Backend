import request from "supertest";
import express from 'express';
import router from "../routes/orderRoutes";
import admin from "../config/firebaseService";
import { supabaseAuth } from "../config/supabaseClient";
import { OrderModel } from "../models/orderModel";

jest.mock('../config/supabaseClient.js', () => ({
    supabaseAuth: {
        auth: {
            getUser: jest.fn()
        }
    }
}));

jest.mock('../models/orderModel.js', () => ({
    OrderModel: {
        createOrders: jest.fn(),
        createOrderItems: jest.fn()
    }
}));

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
        total_price: 108000,
        delivery_fee: 5000,
        discount: 0,
        total_order: 113000,
        items: [
            {
                menu_id: 'MEN-003',
                quantity: 2,
                price: 54000,
                notes: 'Jangan pedas',
                options: "Pilih Varian Kopi: Kenangan Blend\nSugar Level: Normal Sugar"
            }
        ]
    };

    it('harus gagal (403) jika login sebagai DRIVER tapi akses fitur USER', async () => {
        // 1. Mock getUser untuk balikkin role DRIVER
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'driver_123',
                    user_metadata: { role: 'DRIVER' }
                }
            },
            error: null
        });

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderData);

        // 2. Ekspektasi: Ditolak oleh middleware authorize("USER")
        expect(res.statusCode).toEqual(403);
        expect(res.body.meta.message).toBe('Access Denied: You are not a USER'); // Sesuaikan pesan error di middleware kamu
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

    it('harus gagal (400) jika kirim TOTAL PRICE kosong', async () => {
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
                address_id: 'ADDRES-001',
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
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        OrderModel.createOrders.mockResolvedValue([
            {
                id: 'ORD-123',
                status: 'PENDING_PAYMENT',
                final_amount: 113000
            }
        ]);

        OrderModel.createOrderItems.mockResolvedValue([
            {
                id: 1,
                order_id: 'ORD-123',
                menu_id: 'MEN-001',
                quantity: 2,
                price: 54000
            }
        ]);

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderData);


        expect(res.statusCode).toEqual(201);
        expect(res.body.meta.message).toBe('Order created successfully');
        expect(res.body.data.order_id).toBe('ORD-123');
    });

    it('harus mengirim order_number yang tepat ke database', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderData);

        // Cek apakah OrderModel.createOrders dipanggil dengan object yang punya order_number
        expect(OrderModel.createOrders).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    order_number: expect.stringMatching(/^T-\d{10}$/)
                })
            ])
        );
    });

    it('harus gagal (500) jika Model melempar error', async () => {
        supabaseAuth.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user_123',
                    user_metadata: { role: 'USER' }
                }
            },
            error: null
        });

        OrderModel.createOrders.mockRejectedValue(new Error('Database Connection Error'));

        const res = await request(app)
            .post('/orders')
            .set('Authorization', 'Bearer fake_token')
            .send(validOrderData);

        expect(res.statusCode).toEqual(500);
        expect(res.body.meta.message).toContain('Internal Server Error');
    });
});