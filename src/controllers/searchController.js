import { SearchModel } from '../models/searchModel.js';
import { RestaurantModel } from '../models/restaurantModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { getStockInfo, getOpenStatusAndClosingTime } from '../utils/openTimeHandler.js';

export const SearchController = {
    getSearchRestaurantMenus: async (req, res) => {
        try {
            const { lat, lng, query, price_range, min_rating, mode, cuisine, sorting } = req.query;
            if (!lat || !lng || !query) {
                return ResponseHandler.error(res, 400, 'Latitude and longitude are required.');
            }

            const categoryRestaurants = await SearchModel.getSearchRestaurantsWithMenus(
                parseFloat(lat),
                parseFloat(lng),
                query,{
                    min_rating: min_rating ? parseFloat(min_rating) : null,
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
                    delivery_cost : r.delivery_cost,
                    delivery_time: r.delivery_time,
                    is_open : statusInfo.is_open,
                    closing_time: statusInfo.closing_time_server,
                    menus: menus
                };
            });

            return ResponseHandler.success(
                res,
                200,
                `Get Search Restaurant Success`,
                categoryRestaurantsWithStatus
            );
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },
    getSearchRestaurantMenusByCategory: async (req, res) => {
        try {
            const { categoryId } = req.params;
            const { lat, lng, query, price_range, min_rating, mode, cuisine, sorting } = req.query;
            if (!lat || !lng || !categoryId) {
                return ResponseHandler.error(res, 400, 'Latitude and longitude are required.');
            }

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
                res,
                200,
                `Get Category Restaurant Success`,
                categoryRestaurantsWithStatus
            );
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    }

}