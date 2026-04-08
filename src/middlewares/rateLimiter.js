import rateLimit from "express-rate-limit";
import ResponseHandler from "../utils/responseHandler.js";

// Global limiter (semua API)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 300, // max 300 request / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Terlalu banyak request, coba lagi nanti."
  }
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 20, // max 20x coba login
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    return ResponseHandler.error(
      res, 
      429, 
      "Terlalu banyak percobaan login. Coba lagi dalam 1 menit."
    );
  }
});

// export const authLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 menit
//   max: 3, // hanya 2x percobaan
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res, next, options) => {
//     return ResponseHandler.error(
//       res, 
//       429, 
//       "Terlalu banyak percobaan login. Coba lagi dalam 1 menit."
//     );
//   }
// });