// src/services/StreamService.js
import { StreamChat } from 'stream-chat';
import 'dotenv/config'; // Pastikan environment variables dimuat

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

// console.log('STREAM API KEY:', process.env.STREAM_API_KEY);
// console.log('STREAM API SECRET:', process.env.STREAM_API_SECRET);

// 1. Inisialisasi Klien StreamChat
// Klien ini digunakan oleh backend untuk berinteraksi dengan API Stream (misalnya, membuat channel, mengelola user)
export const streamClient = new StreamChat(apiKey, apiSecret);
