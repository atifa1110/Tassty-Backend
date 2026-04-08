import { RestaurantModel } from '../models/restaurantModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { getOpenStatusAndClosingTime } from '../utils/openTimeHandler.js';

export const RestaurantController = {
    getCategories:async (req, res) => {
        try{
        const data  = await RestaurantModel.getCategories();
            return ResponseHandler.success(res, 200, 'Get Categories Success', data);
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },
    add: async (req, res) => {
        try {
            const {
                name,
                image_url,
                category_ids,
                rating,
                total_reviews,
                verified,
                has_delivery = true,
                has_pickup = true,
                city,
                price_level,
                full_address,
                delivery_time_min,
                delivery_time_max,
                latitude,
                longitude,
                operational_hours
            } = req.body;

            // 3. Validasi Wajib
            if (!name || !image_url || !latitude || !longitude || !category_ids
                || category_ids.length === 0 || !operational_hours || !city || !rating) {
                return ResponseHandler.error(res, 400, 'Data are required.');
            }

            const location = `SRID=4326;POINT(${longitude} ${latitude})`;

            // 4. Siapkan Data Alamat
            const restaurant = {
                name: name,
                image_url: image_url,
                category_ids: category_ids,
                rating: rating,
                total_reviews: total_reviews,
                verified: verified,
                has_delivery: has_delivery,
                has_pickup: has_pickup,
                city: city,
                price_level: price_level,
                full_address: full_address,
                delivery_time_min: delivery_time_min,
                delivery_time_max: delivery_time_max,
                latitude: latitude,
                longitude: longitude,
                location: location,
                operational_hours: operational_hours
            }

            await RestaurantModel.createRestaurant(restaurant)
            return ResponseHandler.success(res, 200, 'Create Restaurant is Success')
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },
    getAll: async (req, res) => {
        try {
            const { lat, lng } = req.query;
            if (!lat || !lng) return ResponseHandler.error(res, 400, 'Latitude and longitude are required.');

            let restaurants = await RestaurantModel.getRestaurant(parseFloat(lat), parseFloat(lng));
            restaurants = restaurants.map(r => {
                // Asumsi r.operational_hours ada di setiap objek
                const status = getOpenStatusAndClosingTime(r.operational_hours);
                const { operational_hours, ...rest } = r;
                return {
                    ...rest,
                    is_open: status.is_open,
                    closing_time_server: status.closing_time_server,
                };
            });
            return ResponseHandler.success(res, 200, 'Get Restaurants Success', restaurants);
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },
    getHomeRecommended: async (req, res) => {
        try {
            const { lat, lng, limit = 5 } = req.query;
            if (!lat || !lng) {
                return ResponseHandler.error(res, 400, 'Latitude and longitude are required.');
            }

            const allRestaurants = await RestaurantModel.getRestaurant(
                parseFloat(lat),
                parseFloat(lng)
            );

            const thresholdRating = 4.0;
            const thresholdReviews = 100;
            const MAX_DISTANCE_REC = 5000;
            const MAX_LIMIT = 100;

            // Filter restoran sesuai kriteria rekomendasi
            let recommendedRestaurants = allRestaurants.filter(
                (r) =>
                    r.rating >= thresholdRating &&
                    r.total_reviews >= thresholdReviews &&
                    r.distance < MAX_DISTANCE_REC
            );

            // Tambahkan info open/close tapi hapus operational_hours
            recommendedRestaurants = recommendedRestaurants.map((r) => {
                const status = getOpenStatusAndClosingTime(r.operational_hours);
                const { operational_hours, ...rest } = r;
                return {
                    ...rest,
                    is_open: status.is_open,
                    closing_time_server: status.closing_time_server,
                };
            });

            const safeLimit = Math.min(Number(limit), MAX_LIMIT);
            recommendedRestaurants = recommendedRestaurants.slice(0, safeLimit);

            return ResponseHandler.success(
                res,
                200,
                `Recommended Restaurants (Rating ≥ ${thresholdRating}, Reviews ≥ ${thresholdReviews}, Distance < ${MAX_DISTANCE_REC / 1000
                } km)`,
                recommendedRestaurants
            );
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    getCategoryRecommended: async (req, res) => {
        try {
            const { categoryId } = req.params;
            const { lat, lng, search = null } = req.query;

            if (!lat || !lng) {
                return ResponseHandler.error(res, 400, 'Latitude and longitude are required.');
            }

            if (!categoryId) {
                return ResponseHandler.error(res, 400, 'Category ID is required.');
            }

            // 🔹 Panggil function filter_restaurants Supabase
            const allRestaurants = await RestaurantModel.getRestaurant(
                parseFloat(lat),
                parseFloat(lng),
                search,
                {
                    cuisine: categoryId,
                }
            );

            const thresholdRating = 4.5;
            const thresholdReviews = 100;
            const MAX_DISTANCE_REC = 3000;

            // Filter restoran sesuai kriteria rekomendasi
            let recommendedRestaurants = allRestaurants.filter(
                (r) =>
                    r.rating >= thresholdRating &&
                    r.total_reviews >= thresholdReviews &&
                    r.distance < MAX_DISTANCE_REC
            );

            // Tambahkan info open/close tapi hapus operational_hours
            recommendedRestaurants = recommendedRestaurants.map((r) => {
                const status = getOpenStatusAndClosingTime(r.operational_hours);
                const { operational_hours, ...rest } = r;
                return {
                    ...rest,
                    is_open: status.is_open,
                    closing_time_server: status.closing_time_server,
                };
            });

            return ResponseHandler.success(
                res,
                200,
                `Recommended ${categoryId} spots to explore!`,
                recommendedRestaurants
            );
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    getNearbyRestaurants: async (req, res) => {
        try {
            const { lat, lng, min_rating, price_range, mode, cuisine, sorting } = req.query;
            if (!lat || !lng) {
                return ResponseHandler.error(res, 400, 'Latitude and longitude are required.');
            }

            const MAX_DISTANCE_REC = 3000;
            // call nearest function
            const allRestaurants = await RestaurantModel.getNearbyRestaurants(
                parseFloat(lat),
                parseFloat(lng),
                {
                    radius: MAX_DISTANCE_REC,
                    min_rating: min_rating ? parseFloat(min_rating) : null,
                    price_range: price_range || null,
                    cuisine: cuisine || null,
                    mode: mode || null,
                    sorting: sorting || null
                }
            );

            // add open status, erase operational_hours
            const nearestRestaurants = allRestaurants.map(r => {
                const status = getOpenStatusAndClosingTime(r.operational_hours);
                const { operational_hours, ...rest } = r;
                return {
                    ...rest,
                    is_open: status.is_open,
                    closing_time_server: status.closing_time_server,
                };
            });

            return ResponseHandler.success(
                res,
                200,
                `Nearby Restaurants (Distance < ${MAX_DISTANCE_REC / 1000} km)`,
                nearestRestaurants
            );
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    }

}