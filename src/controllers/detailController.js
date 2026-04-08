import { DetailModel } from '../models/detailModel.js'
import ResponseHandler from '../utils/responseHandler.js'
import { getStockInfo } from '../utils/openTimeHandler.js'
import { getOpenStatusAndClosingTime } from '../utils/openTimeHandler.js'
import axios from 'axios'
import { RestaurantModel } from '../models/restaurantModel.js'

export const DetailController = {
  getRestaurantDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const { lat, lng } = req.query;

      if (!lat || !lng || !id) {
        return ResponseHandler.error(res, 400, 'Latitude dan longitude wajib diisi');
      }

      const data = await DetailModel.getRestaurantById(lat, lng, id);

      const restaurant = data.map(res => {
        const status = getOpenStatusAndClosingTime(res.operational_hours);
        return {
          ...res,
          ...status,
        }
      })

      if (!restaurant) {
        return ResponseHandler.error(res, 404, 'Restaurant tidak ditemukan');
      }

      return ResponseHandler.success(res, 200, `Detail Restaurant ${id} is Found`, restaurant[0]);
    } catch (err) {
      return ResponseHandler.error(res, 500, err.message);
    }
  },

  getBestSellerMenus: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return ResponseHandler.error(res, 400, 'id wajib diisi');
      }

      const data = await DetailModel.getMenusBestSellerById(id);

      const menus = data.map(menu => {
        return {
          id: menu.id,
          name: menu.name,
          image_url: menu.image_url,
          description: menu.description,
          price: menu.promo ? menu.price_discount : menu.price_original,
          sold_count: menu.sold_count,
          customizable: menu.customizable,
          ...getStockInfo(menu.stock)
        }
      });


      return ResponseHandler.success(res, 200, `Get Best Seller Menu is Success`, menus);

    } catch (err) {
      return ResponseHandler.error(res, 500, err.message);
    }
  },

  getRecommendedMenus: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return ResponseHandler.error(res, 400, 'id wajib diisi');
      }

      const data = await DetailModel.getMenusRecommendedById(id);

      const menus = data.map(menu => {
        return {
          id: menu.id,
          name: menu.name,
          image_url: menu.image_url,
          description: menu.description,
          price: menu.promo ? menu.price_discount : menu.price_original,
          sold_count: menu.sold_count,
          customizable: menu.customizable,
          ...getStockInfo(menu.stock)
        }
      });

      return ResponseHandler.success(res, 200, `Get Recommended Menu is Success`, menus);

    } catch (err) {
      return ResponseHandler.error(res, 500, err.message);
    }
  },

  getAllMenus: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return ResponseHandler.error(res, 400, 'id wajib diisi');
      }

      const data = await DetailModel.getMenusAllById(id);

      const menus = data.map(menu => {
        return {
          id: menu.id,
          name: menu.name,
          image_url: menu.image_url,
          description: menu.description,
          price: menu.promo ? menu.price_discount : menu.price_original,
          sold_count: menu.sold_count,
          customizable: menu.customizable,
          ...getStockInfo(menu.stock)
        }
      });

      return ResponseHandler.success(res, 200, `Get All Menus is Success`, menus);

    } catch (err) {
      return ResponseHandler.error(res, 500, err.message);
    }
  },

  getMenuDetail: async (req, res) => {
    try {
      const { id } = req.params
      const { lat, lng } = req.query;

      const menu = await DetailModel.getMenuDetailById(id)
      const { restaurant_id, ...menuWithoutRestId } = menu

      // misal menu punya restaurant_id
      const rest = await DetailModel.getRestaurantById(lat, lng, menu.restaurant_id);
      const status = getOpenStatusAndClosingTime(rest[0].operational_hours);
      const result = {
        ...menuWithoutRestId,
        restaurant: {
          id: rest[0].id,
          name: rest[0].name,
          city: rest[0].city,
          rating: rest[0].rating,
          distance: rest[0].distance,
          delivery_cost: rest[0].delivery_cost,
          delivery_time: rest[0].delivery_time,
          total_reviews: rest[0].total_reviews,
          is_open: status.is_open,
          closing_time_server: status.closing_time_server
        }
      }

      return ResponseHandler.success(
        res,
        200,
        `Detail Menu ${id} is Found`,
        result
      )

    } catch (err) {
      return ResponseHandler.error(
        res,
        500,
        err.message
      )
    }
  },

  getRouteToRestaurant: async (req, res) => {
    try {
      const { id } = req.params;
      const { lat, lng } = req.query;

      if (!lat|| !lng|| !id) {
        return ResponseHandler.error(res, 400, 'Latitude, Longitude, dan Restaurant ID wajib diisi');
      }

      const restaurant = await RestaurantModel.getRestaurantById(id);

      if (!restaurant) {
        return ResponseHandler.error(res, 404, 'Restaurant tidak ditemukan di database');
      }

      const destLat = restaurant.latitude;
      const destLng = restaurant.longitude;

      if (!destLat || !destLng) {
        return ResponseHandler.error(res, 400, 'Koordinat restoran tidak lengkap di database');
      }

      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY; 
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lng}&destination=${destLat},${destLng}&key=${googleApiKey}`;

      const response = await axios.get(url);

      // Cek apakah Google memberikan rute (bisa saja gagal jika lokasi terlalu jauh/tidak ada jalan)
      if (response.data.status !== 'OK') {
        return ResponseHandler.error(res, 400, `Google Maps Error: ${response.data.status}`);
      }

      const route = response.data.routes[0];

      // 3. Kirim response menggunakan ResponseHandler agar seragam dengan fungsi lain
      return ResponseHandler.success(res, 200, 'Route found', {
        user_lat: lat,
        user_lng: lng,
        distance: route.legs[0].distance.text,
        duration: route.legs[0].duration.text,
        polylinePoints: route.overview_polyline.points 
      });

    } catch (err) {
      console.error("Route Error:", err.message);
      return ResponseHandler.error(res, 500, 'Internal Server Error');
    }
  }
}