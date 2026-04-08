import { supabaseAdmin } from '../config/supabaseClient.js'

export const VoucherModel = {
  async getVoucherRestaurant(restaurantId) {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('voucher')
      .select(`
        id,
        code,
        title,
        description,
        type,
        discount_type,
        scope,
        discount_value,
        max_discount,
        min_order_value,
        min_order_label,
        start_date,
        expiry_date,
        status
      `)
      .eq('status', 'AVAILABLE')
      .lte('start_date', today)
      .gte('expiry_date', today)
      .or(
        `scope.eq.GLOBAL,` +  // voucher global
        `and(scope.eq.RESTAURANT,restaurant_ids.cs.{${restaurantId}})` // voucher restaurant yg ada di array
      );

    if (error) {
      console.error('Error fetching vouchers:', error);
      return [];
    }

    return data;
  },

  async getUserVoucher(userId) {
    if (!userId) {
      console.warn('getUserVoucher: userId is required');
      return [];
    }

    const { data, error } = await supabaseAdmin
      .rpc('get_available_user_vouchers', {
        p_user_id: userId
      });

    if (error) {
      // Memberikan info lebih detail saat debugging
      console.error('Error fetching vouchers:', error.message, error.details);
      return [];
    }

    // data akan berupa array of objects karena fungsi SQL kita RETURNS SETOF voucher
    return data || [];
  }

}
