import jwt from 'jsonwebtoken';

// Ambil JWT Secret Key Supabase dari variabel lingkungan
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET; 

class AuthMiddleware {
    
    /**
     * Middleware untuk mengekstrak dan memverifikasi token JWT Supabase.
     */
    authenticate = (req, res, next) => {
        if (!SUPABASE_JWT_SECRET) {
            console.error("Kesalahan Konfigurasi: SUPABASE_JWT_SECRET tidak ditemukan.");
            return res.status(500).json({ message: 'Kesalahan Server: Kunci rahasia JWT Supabase hilang.' });
        }

        const authHeader = req.headers.authorization;

        // 1. Cek keberadaan dan format header (Bearer <token>)
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Otorisasi Gagal. Token tidak ditemukan atau format tidak valid.' 
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            // 2. Verifikasi token menggunakan Secret Key Supabase
            const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
            
            // 3. Tambahkan data user (payload token) ke objek request
            req.user = decoded; 
            
            // 🌟 Tambahkan Auth ID secara terpisah ke req.userId
            // Auth ID Supabase ada di claim 'sub' (subject) JWT
            req.userId = decoded.sub; // <--- Auth ID yang akan Anda gunakan
            
            // 4. Lanjut ke controller
            next();

        } catch (error) {
            // 5. Tangani kesalahan verifikasi
            let errorMessage = 'Token tidak valid.';
            if (error.name === 'TokenExpiredError') {
                errorMessage = 'Token kedaluwarsa. Silakan refresh sesi.';
            } else if (error.name === 'JsonWebTokenError') {
                errorMessage = 'Token tidak valid.';
            }
            
            return res.status(403).json({ 
                message: 'Verifikasi Token Gagal.', 
                error: errorMessage 
            });
        }
    }
}

export default AuthMiddleware;

