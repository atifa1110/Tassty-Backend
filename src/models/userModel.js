import { supabaseAdmin } from '../config/supabaseClient.js';

export const UserModel = {
  // 🧩 Create user baru di tabel users setelah signup di Supabase Auth
  async createUser(authId, name, email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{ id: authId, name, email }])
      .select("*");

    if (error) throw new Error(error.message)
    return data
  },

  async createDriver(authId, name, email, phone) {
    const { data, error } = await supabaseAdmin
      .from('drivers')
      .insert([
        {
          id: authId,
          name,
          email
        }
      ])
      .select("*"); // lebih aman dari single()

    if (error) throw new Error(error.message);
    return data?.[0];
  },

  async createUserAddress(primaryAddress) {
    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .insert([primaryAddress])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async updateCategories(authId, categoryIds) {
    // Pastikan categoryIds adalah array. Jika null/undefined, gunakan array kosong.
    const idsToUpdate = Array.isArray(categoryIds) ? categoryIds : [];

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ selected_category_ids: idsToUpdate })
      // Kunci penting: Memastikan hanya baris milik user tersebut yang di-update
      .eq('id', authId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user categories:", error);
      throw new Error(error.message);
    }
    return data;
  },

  async getUserProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      user_addresses(*)
    `)
    .eq('id', userId)
    .maybeSingle(); // Pakai maybeSingle agar tidak throw error kalau kosong

  if (error) throw new Error(error.message);
  
  // Jika data profil tidak ditemukan, jangan biarkan lanjut ke ChatModel
  if (!data) {
    throw new Error("User profile not found in database.");
  }
  
  return data;
},

  async getUserAddresses(userId) {
    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  },

  async getAddressById(userId, addressId) {
    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('id', addressId) 
      .maybeSingle(); 

    if (error) throw new Error(error.message);
    return data;
},

  async getUserProfileByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async getUserCategories(authId) {
    const { data, error: userError } = await supabaseAdmin
      .from('users')
      .select('selected_category_ids')
      .eq('id', authId)
      .single();

    if (userError) throw new Error(userError.message);
    return data.selected_category_ids;
  },

  async updateUserProfile(userId, payload) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateUserPrimaryAddress(userId, payload) {
    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .update({
        full_address: payload.full_address,
        address_name: payload.address_name,
        landmark_detail: payload.landmark_detail,
        address_type: payload.address_type,
        latitude: payload.latitude,
        longitude: payload.longitude,
        is_primary: payload.is_primary
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getDriverProfilebyId(driverId) {
    const { data, error } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async getDriverProfilebyEmail(email) {
    const { data, error } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async getRandomDrivers() {
    const { data, error } = await supabaseAdmin.rpc('get_random_driver');
    if (error) {
      throw new Error('Supabase Error: ' + error.message);
    }
    return data.length > 0 ? data[0] : null;
  },

  /**
  * Menambahkan atau memperbarui FCM Token ke array device_tokens pengguna.
  * @param {string} userId - ID pengguna yang sedang login.
  * @param {string} newToken - FCM Token perangkat baru.
  * @param {string} deviceType - Tipe perangkat ('android' atau 'ios').
  */
  async registerDeviceToken(userId, newToken, deviceType) {
    // Gunakan fungsi Supabase RPC/SQL untuk memperbarui array secara atomik
    // Ini adalah operasi yang kompleks di JS SDK, lebih baik dibuat di PostgreSQL Function (RPC)

    // Namun, jika harus di JS: 
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('device_tokens')
      .eq('id', userId)
      .single();

    let tokens = userData.device_tokens || [];

    // Hapus token lama dengan nilai yang sama (jika ada)
    tokens = tokens.filter(t => t.token !== newToken);

    // Tambahkan token baru
    tokens.push({
      token: newToken,
      device: deviceType,
      timestamp: new Date().toISOString()
    });

    // Update kembali ke database
    const { error } = await supabaseAdmin
      .from('users')
      .update({ device_tokens: tokens })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },

  /**
  * Mengambil semua token perangkat dari database untuk user ID tertentu.
  * @param {string} userId - ID pengguna.
  * @returns {Promise<string[]>} Array dari token FCM.
  */
  async getAllFcmTokensByUserId(userId) {
    // 1. Ambil array device_tokens dari tabel users
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('device_tokens')
      .eq('id', userId)
      .single();

    if (error || !data || !data.device_tokens) {
      console.warn(`User ID ${userId} has no device tokens.`);
      return [];
    }

    // 2. Ekstrak hanya nilai 'token' dari array objek
    return data.device_tokens.map(item => item.token);
  },

  /**
     * Menghapus token FCM yang sudah tidak valid dari array JSONB user.device_tokens.
     * 🌟 Fungsi ini menangani semua interaksi database.
     * @param {string} userId - ID pengguna.
     * @param {string[]} invalidTokens - Array string token yang gagal.
     */
  async removeInvalidDeviceTokens(userId, invalidTokens) {
    if (!invalidTokens || invalidTokens.length === 0) {
      return;
    }

    console.warn(`[Supabase Cleanup] Starting removal of ${invalidTokens.length} tokens for user ${userId}.`);

    // 1. Ambil array token saat ini dari database
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('device_tokens')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching tokens for cleanup:', fetchError);
      return;
    }

    let currentTokens = userData?.device_tokens || [];

    // 2. Filter: Buat array baru, hanya menyisakan token yang TIDAK ada di list invalidTokens
    const updatedTokens = currentTokens.filter(item => !invalidTokens.includes(item.token));

    if (updatedTokens.length === currentTokens.length) {
      // Jika tidak ada perubahan (seharusnya tidak terjadi jika logic FCM benar)
      return;
    }

    // 3. Update database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ device_tokens: updatedTokens })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating tokens after cleanup:', updateError);
      throw new Error('Database update failed during cleanup.');
    }

    console.log(`[Supabase Cleanup] Successfully removed ${currentTokens.length - updatedTokens.length} tokens.`);
  },

  async addUserPaymentMethod(dataToInsert) {
    const { data, error } = await supabaseAdmin
      .from('user_payment_methods')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      console.error('Error inserting user payment method:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async getUserCard(userId) {
    const { data, error } = await supabaseAdmin
      .from('user_payment_methods')
      .select(`
        id, 
        stripe_pm_id,
        cardholder_name,
        masked_number, 
        card_brand, 
        exp_month, 
        exp_year, 
        theme_color, 
        theme_background, 
        status
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user payment method:', error.message);
      throw new Error(error.message);
    }
    return data;
  },

  async getUserCardByStripeId(stripePaymentId) {
    const { data, error } = await supabaseAdmin
      .from('user_payment_methods')
      .select(`
        id, 
        stripe_pm_id,
        cardholder_name,
        masked_number, 
        card_brand, 
        exp_month, 
        exp_year, 
        theme_color, 
        theme_background, 
        status
      `)
      .eq('stripe_pm_id', stripePaymentId)
      .maybeSingle(); 

    if (error) {
      console.error('Error fetching user payment method:', error.message);
      throw new Error(error.message);
    }

    return data; // Sekarang data akan berisi { id: ... } atau null
  }
}
