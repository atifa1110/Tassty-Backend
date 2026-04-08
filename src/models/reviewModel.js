import { supabaseAdmin } from '../config/supabaseClient.js'
import { calculateStarDistribution } from '../utils/openTimeHandler.js';

export const ReviewModel = {
  async createReviewMenu(review) {
    const { data, error } = await supabaseAdmin
      .from('menu_reviews')
      .insert(review)
      .select();

    if (error) throw new Error(error.message);
    return data;
  },

  async checkMenuReviewExists(userId, order_item_id) {
    const { data: existingReview, error: fetchError } = await supabaseAdmin
      .from('menu_reviews')
      .select('id')
      .eq('order_item_id', order_item_id)
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(fetchError.message);
    }
    return !!existingReview;
  },

  async createReviewRestaurant(review) {
    const { data, error } = await supabaseAdmin
      .from('restaurant_reviews')
      .insert(review)
      .select();

    if (error) throw new Error(error.message);
    return data;
  },

  async checkRestaurantReviewExists(userId, order_id) {
    const { data: existingReview, error: fetchError } = await supabaseAdmin
      .from('restaurant_reviews')
      .select('id')
      .eq('order_id', order_id)
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(fetchError.message);
    }

    return !!existingReview;
  },

  async getRestaurantReviewSummary(restaurantId) {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('rating, total_reviews')
      .eq('id', restaurantId)
      .single();

    if (error) throw new Error(error.message);

    // 2. Generate distribusi "palsu" tapi logis
    const distributionMap = calculateStarDistribution(
      restaurant.rating,
      restaurant.total_reviews
    );

    // 3. Ubah formatnya jadi Array biar gampang di-loop di Android
    const distributionArray = Object.keys(distributionMap)
      .reverse() 
      .map(star => ({
        star: parseInt(star),
        count: distributionMap[star],
        percentage: restaurant.total_reviews > 0
          ? Math.round((distributionMap[star] / restaurant.total_reviews) * 100)
          : 0
      }));

    return {
      average_rating: restaurant.rating,
      total_reviews: restaurant.total_reviews,
      distribution: distributionArray
    };
  },

  async getRestaurantReviews(restaurantId) {
    const { data, error } = await supabaseAdmin.rpc('get_restaurant_reviews_with_items', {
      res_id: restaurantId 
    });

    if (error) {
      console.error("RPC Error:", error.message);
      throw new Error("Gagal mengambil review: " + error.message);
    }
    return data;
  },
}