import jwt from 'jsonwebtoken';
import { supabaseAuth } from '../config/supabaseClient.js';
import ResponseHandler from '../utils/responseHandler.js';

// Ambil JWT Secret Key Supabase dari variabel lingkungan
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

class AuthMiddleware {

    /**
     * Middleware untuk mengekstrak dan memverifikasi token JWT Supabase.
     */
    authenticate = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return ResponseHandler.error(res, 401,'Token is missing.');
            }

            const token = authHeader.split(' ')[1];

            // Memanggil Supabase
            const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

            if (error || !user) {
                const message = (error?.message?.includes('missing') || error?.status === 401)
                    ? 'Session expired. Please log in.'
                    : 'Token verification is failed.';
                return ResponseHandler.error(res, 401, message);
            }

            // Simpan data ke request
            req.user = user;
            req.userId = user.id;
            req.token = token;

            // PENTING: Harus panggil next() agar tidak loading terus!
            next();
        } catch (err) {
            console.error("Auth Middleware Error:", err);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: err.message
            });
        }
    }
}

export default AuthMiddleware;

