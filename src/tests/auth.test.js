import request from 'supertest';
import express from 'express';
import router from '../routes/authRoutes.js';
import { supabaseAuth } from '../config/supabaseClient.js';
import { UserModel } from '../models/userModel.js';
import { ChatModel } from '../models/chatModel.js';

// Membungkam console.error agar tidak muncul di terminal saat testing
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

jest.mock('../config/supabaseClient.js', () => ({
    supabaseAuth: {
        auth: {
            signInWithPassword: jest.fn()
        }
    }
}));

jest.mock('../models/chatModel.js', () => ({
    ChatModel: {
        generateUserToken: jest.fn()
    }
}));

jest.mock('../models/userModel.js', () => ({
    UserModel: {
        getUserProfile: jest.fn(),
        getDriverProfilebyId: jest.fn()
    }
}));

const app = express();
app.use(express.json());
app.use('/auth', router);

describe('POST /auth/login', () => {
    it('harus gagal (400) jika email tidak diisi', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                // email sengaja dikosongkan
                password: 'password123'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Email is required');
    });

    it('harus gagal (400) jika email tidak valid', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'atifafiorenza',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Invalid email format');
    });

    it('harus gagal (400) jika password tidak diisi', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'user@gmail.com',
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Password is required');
    });

    it('harus gagal (400) jika password kurang dari 8', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'user@gmail.com',
                password: 'pass'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.status).toBe('error');
        expect(res.body.meta.message).toBe('Password must be at least 8 characters long');
    });

    it('harus berhasil login sebagai USER dan mengembalikan token', async () => {

        supabaseAuth.auth.signInWithPassword.mockResolvedValue({
            data: {
                session: { access_token: 'fake_access', refresh_token: 'fake_refresh' },
                user: { id: 'user_123', user_metadata: { role: 'USER' } }
            },
            error: null
        });

        UserModel.getUserProfile.mockResolvedValue({
            name: 'Luna',
            profile_image: 'luna.png',
            user_addresses: [{ address_name: 'Rumah' }]
        });

        ChatModel.generateUserToken.mockResolvedValue('fake_stream_token');

        const res = await request(app)
            .post('/auth/login').send({
                email: 'luna@example.com',
                password: 'password123'
            });


        expect(res.statusCode).toEqual(200);
        expect(res.body.meta.message).toBe('Login successful.');

        expect(res.body.data.user_id).toBe('user_123');
        expect(res.body.data.role).toBe('USER');
        expect(res.body.data.name).toBe('Luna');
        expect(res.body.data.address_name).toBe('Rumah');
        expect(res.body.data.access_token).toBeDefined();
    });

    it('harus berhasil login sebagai DRIVER dan mengembalikan token', async () => {
        supabaseAuth.auth.signInWithPassword.mockResolvedValue({
            data: {
                session: { access_token: 'fake_access', refresh_token: 'fake_refresh' },
                user: {
                    id: 'driver_123',
                    user_metadata: { role: 'DRIVER' }
                }
            },
            error: null
        });

        UserModel.getDriverProfilebyId.mockResolvedValue({
            name: 'Driver',
            profile_image: 'driver.png',
        });

        ChatModel.generateUserToken.mockResolvedValue('fake_stream_token');

        const res = await request(app)
            .post('/auth/login').send({
                email: 'driver@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.meta.message).toBe('Login successful.');

        expect(res.body.data.user_id).toBe('driver_123');
        expect(res.body.data.role).toBe('DRIVER');
        expect(res.body.data.name).toBe('Driver');
        expect(res.body.data.address_name).toBe('');
        expect(res.body.data.access_token).toBeDefined();
    });

    it('harus gagal (400) jika email atau password salah di Supabase', async () => {
        supabaseAuth.auth.signInWithPassword.mockResolvedValue({
            data: { session: null, user: null },
            error: { message: 'Invalid login credentials' }
        });

        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'salah@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.meta.message).toBe('Invalid login credentials');
    });

    it('harus gagal (400) jika profil USER tidak ditemukan di database', async () => {
        supabaseAuth.auth.signInWithPassword.mockResolvedValue({
            data: { 
                session: { access_token: 'abc' }, 
                user: { 
                    id: 'user_123', 
                    user_metadata: { role: 'USER' }
                } ,
            },
            error: null
        });

        UserModel.getUserProfile.mockRejectedValue(new Error("User not found"));

        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'luna@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(404);
        expect(res.body.meta.message).toBe('Profile not found. Please complete your registration.');
    });

    it('harus gagal (400) jika profil DRIVER tidak ditemukan di database', async () => {
        supabaseAuth.auth.signInWithPassword.mockResolvedValue({
            data: { 
                session: { access_token: 'abc' }, 
                user: { 
                    id: 'user_123' , 
                    user_metadata: { role: 'DRIVER' } 
                }
            },
            error: null
        });

        UserModel.getDriverProfilebyId.mockRejectedValue(new Error("User not found"));

        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'driver@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(404);
        expect(res.body.meta.message).toBe('Profile not found. Please complete your registration.');
    });

    it('harus gagal (500) jika database error', async () => {
        supabaseAuth.auth.signInWithPassword.mockResolvedValue({
            data: { 
                session: { access_token: 'abc' },
                user: { 
                    id: 'user_123',
                    user_metadata: { role: 'USER' } 
             }
            },
            error: null
        });

        UserModel.getUserProfile.mockRejectedValue(new Error("Database error"));

        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'luna@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(500);
        expect(res.body.meta.message).toBe('Internal Server Error');
    });

    it('harus gagal (500) jika Supabase mengembalikan data kosong tanpa error', async () => {
        supabaseAuth.auth.signInWithPassword.mockResolvedValue({
            data: { session: null, user: null },
            error: null // Ceritanya errornya null, tapi datanya juga null
        });

        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'luna@example.com', password: 'password123' });

        expect(res.statusCode).toEqual(500);
        expect(res.body.meta.message).toBe('Login failed: Could not retrieve session data.');
    });
});
