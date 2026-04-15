import { supabaseAuth, supabaseAdmin } from '../config/supabaseClient.js'
import { UserModel } from '../models/userModel.js'
import ResponseHandler from '../utils/responseHandler.js'
import { ChatModel } from '../models/chatModel.js'
import { findUserByEmail } from '../config/supabaseClient.js'

export const AuthController = {
  signup: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: false,
        user_metadata: { 
          full_name: name,
          role: role 
        }
      });

      if (error) {
        if (error.status === 422 || error.message.includes("already registered")) {
          return ResponseHandler.error(res, 400, "email address is already in used!");
        }
        return ResponseHandler.error(res, 400, error.message);
      }

      const authId = data.user?.id;
      if (!authId) return ResponseHandler.error(res, 500, "Auth ID not found.");

      // Insert profile sesuai role
      if (role === "DRIVER") {
        await UserModel.createDriver(authId, name, email);
      } else {
        await UserModel.createUser(authId, name, email);
      }

      const { error: otpError } = await supabaseAuth.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false
        }
      });

      if (otpError) return ResponseHandler.error(res, 400, otpError.message);

      // Response
      return ResponseHandler.success(res, 201,
        "Signup successful. A 6-digit verification code has been sent to your email.",
        {
          user_id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.full_name,
          role: role,
          expires_in: 300,
          resend_available_in: 60
        }
      );

    } catch (err) {
      console.error(err)
      return ResponseHandler.error(res, 500, 'Internal Server Error')
    }
  },

  verifyCode: async (req, res) => {
    try {
      const { email, code } = req.body

      const userCheck = await findUserByEmail(email);
      if (!userCheck) {
        return ResponseHandler.error(res, 404, "Email is not found.");
      }

      // Panggil verify Otp dengan parameter yang benar
      const { data: verifyData, error: verifyError } = await supabaseAuth.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email'
      })

      if (verifyError) {
        console.error("Supabase Verify Error:", verifyError);
        return ResponseHandler.error(res, 400, 'Invalid or expired code.')
      }

      // Supabase mengembalikan Sesi di data.session
      const session = verifyData.session;
      if (!session) return ResponseHandler.error(res, 500, 'Session not found after verification.')

      // Kirim response termasuk token
      return ResponseHandler.success(res, 200, 'Email verified successfully.', {
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

    } catch (err) {
      console.error(err)
      return ResponseHandler.error(res, 500, 'Internal Server Error')
    }
  },

  resendCode: async (req, res) => {
    try {
      const { email } = req.body
      const userCheck = await findUserByEmail(email);

      if (!userCheck) {
        return ResponseHandler.error(res, 404, "Email not found.");
      }

      const { error: otpError } = await supabaseAuth.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false
        }
      });

      if (otpError) return ResponseHandler.error(res, 400, otpError.message);

      return ResponseHandler.success(res, 200, "A new verification code has been sent.", {
        email: email,
        expires_in: 300,
        resend_available_in: 60
      });

    } catch (err) {
      console.error(err)
      return ResponseHandler.error(res, 500, 'Internal Server Error')
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body

      // Login dengan Password
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
      if (error) return ResponseHandler.error(res, 400, error.message)

      // Meskipun Supabase sudah menangani error di atas, pastikan data yang kembali lengkap
      if (!data.session || !data.user) {
        return ResponseHandler.error(res, 500, 'Login failed: Could not retrieve session data.')
      }

      const userId = data.user.id;
      const role = (data.user.user_metadata?.role || 'USER').toUpperCase();
      let profile;

      try {
        if (role === 'DRIVER') {
          profile = await UserModel.getDriverProfilebyId(userId);
        } else {
          profile = await UserModel.getUserProfile(userId);
        }
      } catch (error) {
        if (error.message.includes("User not found")) {
          return ResponseHandler.error(res, 404, "Profile not found. Please complete your registration.");
        }

        throw error;
      }

      const streamToken = await ChatModel.generateUserToken(userId, profile.name, profile.profile_image, role);

      return ResponseHandler.success(res, 200, 'Login successful.', {
        user_id: userId,
        email: email,
        role: role,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        stream_token: streamToken,
        name: profile.name,
        profile_image: profile.profile_image,
        address_name: profile.user_addresses?.[0]?.address_name || ""
      })
    } catch (err) {
      console.error(err)
      return ResponseHandler.error(res, 500, 'Internal Server Error')
    }
  },

  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body

      // Cek Input Wajib
      if (!refreshToken) {
        return ResponseHandler.error(res, 400, 'Refresh token is required.')
      }

      // Coba Refresh Sesi dengan Supabase
      const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken })

      if (error) {
        return ResponseHandler.error(res, 401, 'Invalid or expired refresh token. Please log in again.')
      }

      // Cek Keberadaan Sesi Baru
      if (!data.session) {
        return ResponseHandler.error(res, 500, 'Failed to retrieve new session data.')
      }

      // Supabase mengembalikan sesi baru yang berisi access_token dan refresh_token baru.
      return ResponseHandler.success(res, 200, 'Token refreshed successfully.', {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })
    } catch (err) {
      console.error(err)
      return ResponseHandler.error(res, 500, 'Internal Server Error')
    }
  },

  setup: async (req, res) => {
    try {
      const userId = req.userId;

      const {
        addressType,
        fullAddress,
        landmarkDetail = null,
        addressName,
        lat,
        lng,
        categoryIds
      } = req.body;

      // Siapkan Data Alamat
      const primaryAddress = {
        user_id: userId,
        address_type: addressType,
        address_name: addressName,
        full_address: fullAddress,
        landmark_detail: landmarkDetail,
        latitude: lat,
        longitude: lng,
        is_primary: true
      }

      // Eksekusi Model (Transactional Logic)
      const profile = await UserModel.getUserProfile(userId);
      const hasPrimaryAddress = profile.user_addresses?.some(
        addr => addr.is_primary === true
      );

      if (hasPrimaryAddress) {
        return ResponseHandler.error(res, 400, 'User already has a primary address.');
      }

      await UserModel.createUserAddress(primaryAddress)
      await UserModel.updateCategories(userId, categoryIds)

      const streamToken = await ChatModel.generateUserToken(userId,
        profile.name, profile.profile_image);

      // Respon Sukses
      return ResponseHandler.success(res, 200, 'Setup Account Success', {
        stream_token: streamToken,
        name: profile.name,
        profile_image: profile.profile_image,
        address_name: addressName,
      })

    } catch (err) {
      // Setiap error dari UserModel (Foreign Key violation, dll.) akan tertangkap di sini.
      console.error("Setup Account Failed:", err);
      return ResponseHandler.error(res, 500, 'Internal Server Error');
    }
  },

  registerDevice: async (req, res) => {
    try {
      const userId = req.userId;
      const { fcmToken, deviceType } = req.body;

      if (!fcmToken || !deviceType) {
        return ResponseHandler.error(res, 400, 'Missing fcm_token or device_type.');
      }

      // Panggil fungsi Model untuk mengelola token
      await UserModel.registerDeviceToken(userId, fcmToken, deviceType);

      return ResponseHandler.success(res, 200, 'Device token registered successfully.');

    } catch (error) {
      console.error('Error registering device token:', error);
      return ResponseHandler.error(res, 500, 'Internal Server Error: ' + error.message);
    }
  },

  requestResetPassword: async (req, res) => {
    try {
      const { email } = req.body;

      const { data, error } = await supabaseAuth.auth.resetPasswordForEmail(email);

      if (error) return ResponseHandler.error(res, 400, error.message);

      // Berikan response sukses agar App pindah ke layar OTP
      return ResponseHandler.success(res, 200, 'Reset code has been sent to your email.', {
        expires_in: 300,
        resend_available_in: 60
      });
    } catch (err) {
      console.error(err);
      return ResponseHandler.error(res, 500, 'Internal Server Error');
    }
  },

  verifyResetOtp: async (req, res) => {
    try {
      const { email, code } = req.body;

      // Cek OTP ke Supabase
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery'
      });

      if (error) return ResponseHandler.error(res, 400, "Invalid or expired code.");

      return ResponseHandler.success(res, 200, "Code verified. Please set your new password.", {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    } catch (err) {
      return ResponseHandler.error(res, 500, "Internal Server Error");
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { newPassword } = req.body;

      // Gunakan session tersebut untuk update password
      const { error: updateError } = await supabaseAuth.auth.updateUser({
        password: newPassword
      });

      if (updateError) return ResponseHandler.error(res, 400, updateError.message);

      // Logout otomatis agar bersih
      await supabaseAuth.auth.signOut();

      return ResponseHandler.success(res, 200, "Password updated! Please login.");
    } catch (err) {
      return ResponseHandler.error(res, 500, "Internal Server Error");
    }
  },

  logout: async (req, res) => {
    try {
      const token = req.token;
      const { error } = await supabaseAdmin.auth.admin.signOut(token, 'global');

      if (error) {
        console.error("Supabase Admin SignOut Error:", error.message);
        return ResponseHandler.error(res, 400, "Error erase this server sessions.")
      }
      return ResponseHandler.success(res, 200, "Logout is Success!");
    } catch (err) {
      console.error("Logout Controller Error:", err);
      return ResponseHandler.error(res, 500, "Internal Server Error");
    }
  }
}
