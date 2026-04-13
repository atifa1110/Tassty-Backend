import { supabaseAdmin } from '../config/supabaseClient.js'
import { getStockInfo } from '../utils/openTimeHandler.js';

export const DetailModel = {
  async getRestaurantById(user_lat, user_lng, id) {
    const { data, error } = await supabaseAdmin.rpc('get_restaurant_detail', {
      p_user_lat: user_lat,
      p_user_lng: user_lng,
      p_restaurant_id: id
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async getMenusBestSellerById(id) {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('restaurant_id', id)
      .order('sold_count', { ascending: false })
      .limit(5);

    if (error) throw new Error(error.message);
    return data;
  },

  async getMenusRecommendedById(id) {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('restaurant_id', id)
      .eq('is_recommended', true)

    if (error) throw new Error(error.message);
    return data;
  },

  async getMenusAllById(id) {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('restaurant_id', id)

    if (error) throw new Error(error.message);
    return data;
  },

  async getMenuDetailById(menuId) {
    // ambil menu
    const { data: menu, error: menuError } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .single()

    if (menuError) throw new Error(menuError.message)

    const stockInfo = getStockInfo(menu.stock)
    // ambil group
    const { data: groups, error: groupError } = await supabaseAdmin
      .from('menu_customization_groups')
      .select(`
      customization_groups (
        id,
        group_name,
        required,
        max_select
      )
    `)
      .eq('menu_id', menuId)

    if (groupError) throw new Error(groupError.message)
    const groupList = groups.map(g => g.customization_groups)

    // ambil option
    const groupIds = groupList.map(g => g.id)
    const { data: options, error: optError } = await supabaseAdmin
      .from('customization_options')
      .select('*')
      .in('group_id', groupIds)

    if (optError) throw new Error(optError.message)

    // build nested
    const resultGroups = groupList.map(group => ({
      id: group.id,
      title: group.group_name,
      required: group.required,
      max_pick: group.max_select,
      options: options
        .filter(o => o.group_id === group.id)
        .map(o => ({
          id: o.id,
          name: o.option_name,
          extra_price: o.price_add,
          is_available: o.is_available
        }))
    }))

    return {
      id: menu.id,
      restaurant_id : menu.restaurant_id,
      name: menu.name,
      description: menu.description,
      image_url: menu.image_url,
      promo: menu.promo,
      price_original :  menu.price_original,
      price_discount: menu.price_discount,
      customizable: menu.customizable,
      ...stockInfo,
      option_groups: resultGroups
    }
  }
}
