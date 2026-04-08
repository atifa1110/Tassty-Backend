import { supabaseAdmin } from '../config/supabaseClient.js'

export const RestaurantModel = {
  async createRestaurant(restaurant) {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .insert([
        {
          ...restaurant
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getRestaurantById(restaurantId) {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select(`*`)
      .eq('id', restaurantId)
      .limit(1);

    if (error) {
      console.error('Supabase Get Order By ID Error:', error);
      throw new Error('Failed to fetch order details: ' + error.message);
    }

    return data.length > 0 ? data[0] : null;
  },

  async getCategoryNamesByIds(categoryIds = []) {
    if (!categoryIds.length) return [];

    const { data, error } = await supabaseAdmin
      .from('restaurant_categories')
      .select('id, name, imageUrl')
      .in('id', categoryIds);

    if (error) throw new Error(error.message);
    return data;
  },

  async getCategories() {
    const { data, error } = await supabaseAdmin
      .from('restaurant_categories')
      .select(`*`)

    if (error) throw new Error(error.message);
    return data;
  },

  async getRestaurant(user_lat, user_lng, search = null, filters = {}) {
    const {
      min_rating = null,
      price_range = null,
      cuisine = null,
      mode = null,
      sorting = null
    } = filters;

    const { data, error } = await supabaseAdmin.rpc('get_restaurants_with_distance', {
      user_lat,
      user_lng,
      p_search: search,
      p_min_rating: min_rating,
      p_price_level: price_range,
      p_cuisine_id: cuisine,
      p_mode_type: mode,
      p_sort_by: sorting
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async getNearbyRestaurants(user_lat, user_lng, filters = {}) {
    const {
      radius = null,
      min_rating = null,
      price_range = null,
      cuisine = null,
      mode = null,
      sorting = null
    } = filters;


    const { data, error } = await supabaseAdmin.rpc('get_nearby_restaurants', {
      p_user_lat: user_lat,
      p_user_lng: user_lng,
      p_radius: radius,
      p_min_rating: min_rating,
      p_price_level: price_range,
      p_cuisine_id: cuisine,
      p_mode_type: mode,
      p_sort_by: sorting
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async getRestaurantsWithMenus(user_lat, user_lng,
    category = null, query = null, filter) {

    const {
      min_rating = null,
      price_range = null,
      cuisine = null,
      mode = null,
      sorting = null
    } = filter;

    const { data, error } = await supabaseAdmin.rpc('get_restaurants_with_menus', {
      p_user_lat: user_lat,
      p_user_lng: user_lng,
      p_category_id: category,
      p_search: query,
      p_min_rating: min_rating,
      p_price_level: price_range,
      p_cuisine_id: cuisine,
      p_mode_type: mode,
      p_sort_by: sorting
    });

    if (error) throw new Error(error.message);
    return data;
  }
}