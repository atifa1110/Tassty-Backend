import { supabaseAdmin } from '../config/supabaseClient.js'

export const SearchModel = {
  async getSearchRestaurantsWithMenus(user_lat, user_lng, query = null, filter) {
      const {
        min_rating = null,
        price_range = null,
        cuisine = null,
        mode = null,
        sorting = null
    } = filter;

    const { data, error } = await supabaseAdmin.rpc('get_search_restaurants_with_menus', {
      p_user_lat: user_lat,
      p_user_lng: user_lng,
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