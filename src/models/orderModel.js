import { supabaseAdmin } from '../config/supabaseClient.js'

export const OrderModel = {
  async createOrders(orders) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(orders)
      .select();

    if (error) throw new Error(error.message);
    return data;
  },

  async createOrderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('order_items')
      .insert(items)
      .select();

    if (error) {
      console.error('Supabase Insert order_items Error:', error);
      throw new Error('Supabase Error: Failed to insert order items: ' + error.message);
    }
    return data;
  },

  async updateOrderById(orderId, updates) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase Update Status Error:', error);
      throw new Error('Failed to update order status: ' + error.message);
    }

    return data;
  },

  async updateOrderChannel(orderItemId, updates) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderItemId)
      .select();

    if (error) {
      console.error('Supabase Update Order Channel Error:', error);
      throw new Error('Failed to update order c channel: ' + error.message);
    }

    return data;
  },

  async updateOrderItem(orderItemId, updates) {
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .update(updates)
      .eq('id', orderItemId)
      .select();

    if (error) {
      console.error('Supabase Insert order_items Error:', error);
      throw new Error('Supabase Error: Failed to insert order items: ' + error.message);
    }

    return data;
  },

  async updateOrderStatusByInvoiceId(invoiceId, updates) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('invoice_id', invoiceId)
      .select();

    if (error) {
      console.error('Supabase Update Status Error:', error);
      throw new Error('Failed to update order status: ' + error.message);
    }

    return data[0];
  },

  async getDetailOrderById(orderId) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        status,
        total_price,
        delivery_fee,
        discount,
        final_amount,
        payment_status,
        created_at,
        queue_number,
        chat_channel_id,
        restaurant_review_id,
        driver:driver_id(id, name, profile_image, rating),
        restaurant:restaurant_id(id, name, image_url, full_address, latitude, longitude),
        user_addresses:delivery_address_id(id, full_address, latitude, longitude),
        order_items(id, menu_id, menu_review_id ,notes, price, quantity, options, menu:menu_id(name, image_url)),
        user_payment_methods:payment_method_id(id,cardholder_name,masked_number,card_brand,exp_month,exp_year,theme_color,theme_background)
      `)
      .eq('id', orderId)
      .limit(1);

    if (error) {
      console.error('Supabase Get Order By ID Error:', error);
      throw new Error('Failed to fetch order details: ' + error.message);
    }

    return data.length > 0 ? data[0] : null;
  },

  async getOrderById(orderId) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`*`)
      .eq('id', orderId)
      .limit(1);

    if (error) {
      console.error('Supabase Get Order By ID Error:', error);
      throw new Error('Failed to fetch order details: ' + error.message);
    }

    return data.length > 0 ? data[0] : null;
  },

  async getOrderSummary(userId, orderId) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
            id,
            order_number,
            status,
            final_amount,
            queue_number,
            created_at,
            restaurants:restaurant_id (
                name,
                image_url
            )
        `)
      .eq('user_id', userId)
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Supabase Get Order Summary Error:', error);
      throw new Error('Failed to fetch order summary: ' + error.message);
    }

    return {
      id: data.id,
      order_number: data.order_number,
      restaurant_name: data.restaurants?.name,
      restaurant_image: data.restaurants?.image_url,
      status: data.status,
      final_amount: data.final_amount,
      queue_number: data.queue_number,
      created_at: data.created_at
    };
  },

  async getListOrder(userId) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
            id,
            order_number,
            status,
            final_amount,
            queue_number,
            created_at,
            restaurants:restaurant_id (
                name,
                image_url
            )
        `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(o => ({
      id: o.id,
      order_number: o.order_number,
      restaurant_name: o.restaurants?.name,
      restaurant_image: o.restaurants?.image_url,
      status: o.status,
      final_amount: o.final_amount,
      queue_number: o.queue_number,
      created_at: o.created_at
    })) || [];
  },

  async getPendingOrder(userId) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`*`)
      .eq('user_id', userId)
      .eq('status', 'PENDING_PAYMENT')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error;

    return data.length > 0 ? data[0] : null;
  }
}