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

            // Verifikasi token langsung ke Supabase (Paling Aman)
            const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

            if (error || !user) {
                return ResponseHandler.error(res, 401, 'Session expired or invalid token.');
            }

            // Simpan data ke request
            req.user = user;
            req.userId = user.id;
            req.token = token;
            req.userRole = user.user_metadata?.role || 'USER';

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

    /**
     * Middleware tambahan untuk proteksi ROLE (Complex Check)
     * Cara pakai: AuthMiddleware.authorize('DRIVER')
     */
    authorize = (requiredRole) => {
        return (req, res, next) => {
            // Kita ambil dari req.userRole yang sudah diisi middleware authenticate di atas
            if (req.userRole !== requiredRole) {
                return ResponseHandler.error(res, 403, `Access Denied: You are not a ${requiredRole}`);
            }
            next();
        };
    }
}

export default AuthMiddleware;

