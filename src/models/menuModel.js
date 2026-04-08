import { supabaseAdmin } from '../config/supabaseClient.js'

export const MenuModel = {
  async createMenus(menus) {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .insert(menus)
      .select();

    if (error) throw new Error(error.message);
    return data;
  },

  async createCustomizationGroups(groups) {
    // groups = array of objects [{id, menu_id, group_name, required, max_select}]
    const { data, error } = await supabaseAdmin
      .from('customization_groups')
      .insert(groups)
      .select();

    if (error) throw new Error(error.message);
    return data;
  },

  // Insert customization options
  async createCustomizationOptions(options) {
    // options = array of objects [{id, group_id, option_name, price_add, is_available}]
    const { data, error } = await supabaseAdmin
      .from('customization_options')
      .insert(options)
      .select();

    if (error) throw new Error(error.message);
    return data;
  },

  async assignCustomizationGroups(records) {
    const { data, error } = await supabaseAdmin
      .from('menu_customization_groups')
      .insert(records)
      .select();

    if (error) throw new Error(error.message);
    return data;
  },

  async getMenusWithRestaurant(user_lat, user_lng, categories = null) {
    const { data, error } = await supabaseAdmin.rpc('get_menus_with_restaurant', {
      p_user_lat: user_lat,
      p_user_lng: user_lng,
      p_categories: categories 
    });

    if (error) throw new Error(error.message);
    return data;
  }
}