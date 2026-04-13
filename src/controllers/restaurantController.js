import { RestaurantModel } from '../models/restaurantModel.js';
import { DetailModel } from '../models/detailModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { getOpenStatusAndClosingTime } from '../utils/openTimeHandler.js';
import { getStockInfo } from '../utils/openTimeHandler.js';
import { getPolylineData } from '../utils/mapsHelper.js';

export const RestaurantController = {
    createRestaurant: async (req, res) => {
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
    getRestaurantDetail: async (req, res) => {
        try {
            const { restId } = req.params;
            const { lat, lng } = req.query;

            const data = await DetailModel.getRestaurantById(lat, lng, restId);

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

            return ResponseHandler.success(res, 200, `Detail Restaurant ${restId} is Found`, restaurant[0]);
        } catch (err) {
            return ResponseHandler.error(res, 500, err.message);
        }
    },
    getRestaurantRoute: async (req, res) => {
        try {
            const { restId } = req.params;
            const { lat, lng } = req.query;

            const restaurant = await RestaurantModel.getRestaurantById(restId);

            if (!restaurant) {
                return ResponseHandler.error(res, 404, 'Restaurant tidak ditemukan di database');
            }

            const destLat = restaurant.latitude;
            const destLng = restaurant.longitude;

            if (!destLat || !destLng) {
                return ResponseHandler.error(res, 400, 'Koordinat restoran tidak lengkap di database');
            }

            const routeData = await getPolylineData(
                { lat: restaurant.latitude, lng: restaurant.longitude },
                { lat: lat, lng: lng }
            );

            // Kirim response menggunakan ResponseHandler agar seragam dengan fungsi lain
            return ResponseHandler.success(res, 200, 'Route found', {
                distance: routeData.distance,
                duration: routeData.duration,
                polylinePoints: routeData.points
            });

        } catch (err) {
            console.error("Route Error:", err.message);
            return ResponseHandler.error(res, 500, 'Internal Server Error');
        }
    },
    getMenusBestSeller: async (req, res) => {
        try {
            const { restId } = req.params;
            const data = await DetailModel.getMenusBestSellerById(restId);

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
    getMenusRecommended: async (req, res) => {
        try {
            const { restId } = req.params;
            const data = await DetailModel.getMenusRecommendedById(restId);

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
    getMenus: async (req, res) => {
        try {
            const { restId } = req.params;
            const data = await DetailModel.getMenusAllById(restId);

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
    getCategories: async (req, res) => {
        try {
            const data = await RestaurantModel.getCategories();
            return ResponseHandler.success(res, 200, 'Get Categories Success', data);
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },
    getAll: async (req, res) => {
        try {
            const { lat, lng } = req.query;
            let restaurants = await RestaurantModel.getRestaurant(parseFloat(lat), parseFloat(lng));
            restaurants = restaurants.map(r => {
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

            // Panggil function filter_restaurants Supabase
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
            const MAX_DISTANCE_REC = 5000;

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

            const MAX_DISTANCE_REC = 3000;
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
    },
    getRestaurantMenusByCategory: async (req, res) => {
        try {
            const { categoryId } = req.params;
            const { lat, lng, query, price_range, min_rating, mode, cuisine, sorting } = req.query;
           
            const categoryRestaurants = await RestaurantModel.getRestaurantsWithMenus(
                parseFloat(lat),
                parseFloat(lng),
                categoryId, query, {
                min_rating: min_rating || null,
                price_range: price_range || null,
                mode: mode || null,
                cuisine: cuisine || null,
                sorting: sorting || null
            }
            )

            const categoryRestaurantsWithStatus = categoryRestaurants.map(r => {
                const statusInfo = getOpenStatusAndClosingTime(r.operational_hours);
                const menus = (r.menus || []).map(menu => ({
                    id: menu.menu_id,
                    name: menu.name,
                    image_url: menu.image_url,
                    price: menu.price,
                    customizable: menu.customizable,
                    ...getStockInfo(menu.stock),
                }));
                return {
                    id: r.id,
                    name: r.name,
                    image_url: r.image_url,
                    categories: r.categories,
                    city: r.city,
                    rank: r.rank,
                    rating: r.rating,
                    distance: r.distance,
                    delivery_cost: r.delivery_cost,
                    delivery_time: r.delivery_time,
                    is_open: statusInfo.is_open,
                    closing_time_server: statusInfo.closing_time_server,
                    menus: menus
                };
            });

            return ResponseHandler.success(
                res, 200, `Get Category Restaurant Success`, categoryRestaurantsWithStatus
            );
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    }
}