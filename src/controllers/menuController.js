import { MenuModel } from '../models/menuModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { getStockInfo, getOpenStatusAndClosingTime } from '../utils/openTimeHandler.js';
import { UserModel } from '../models/userModel.js';
import { DetailModel } from '../models/detailModel.js';

export const MenuController = {
    createMenus: async (req, res) => {
        try {
            const { menus = [] } = req.body;

            // Simpan semua menu ke database
            if (menus.length > 0) {
                await MenuModel.createMenus(menus);
            }

            return ResponseHandler.success(res, 200, 'Create Menus Success');
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    getMenuDetail: async (req, res) => {
        try {
            const { menuId } = req.params
            const { lat, lng } = req.query;

            const menu = await DetailModel.getMenuDetailById(menuId)
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

            return ResponseHandler.success(res, 200, `Detail Menu ${menuId} is Found`, result)
        } catch (err) {
            return ResponseHandler.error(
                res,
                500,
                err.message
            )
        }
    },

    addCustomizations: async (req, res) => {
        try {
            const { customization_groups } = req.body;

            // --- Persiapkan data Groups ---
            const groupsData = customization_groups.map(group => ({
                id: group.id,
                group_name: group.group_name,
                required: group.required,
                max_select: group.max_select
            }));

            await MenuModel.createCustomizationGroups(groupsData);

            // --- Persiapkan data Options ---
            const optionsData = customization_groups.flatMap(group =>
                group.options.map(option => ({
                    id: option.id,
                    group_id: group.id, // Ambil ID dari parent-nya
                    option_name: option.option_name,
                    price_add: option.price_add,
                    is_available: option.is_available
                }))
            );

            if (optionsData.length > 0) {
                await MenuModel.createCustomizationOptions(optionsData);
            }

            return ResponseHandler.success(res, 201, 'Customizations berhasil ditambahkan');
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    assignCustomizationsToMenus: async (req, res) => {
        try {
            const { menu_ids, group_ids } = req.body;

            // Bikin kombinasi menu_id dan group_id (Pivot Table)
            const pivotData = menu_ids.flatMap(menu_id =>
                group_ids.map(group_id => ({ menu_id, group_id }))
            );

            await MenuModel.assignCustomizationGroups(pivotData);

            return ResponseHandler.success(res, 200, 'Customizations berhasil di-assign ke menu', {
                menu_ids,
                group_ids
            });

        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    getRecommendedMenus: async (req, res) => {
        try {
            const { lat, lng } = req.query;

            // Ambil semua data menu + restaurant dari Supabase
            const data = await MenuModel.getMenusWithRestaurant(
                parseFloat(lat),
                parseFloat(lng)
            );

            // Filter hanya menu yang direkomendasikan
            const recommended = data.filter(menu => menu.is_recommended === true);

            // Urutkan berdasarkan sold_count (paling laku di atas)
            const sorted = recommended.sort((a, b) => b.sold_count - a.sold_count);

            // Kasih rank: 1-3 dapat rank, sisanya null
            const ranked = sorted.map((menu, index) => ({
                ...menu,
                rank: index < 3 ? index + 1 : null,
            }));

            // Format response akhir
            const menus = ranked.map(menu => {
                const status = getOpenStatusAndClosingTime(menu.operational_hours);
                return {
                    id: menu.menu_id,
                    name: menu.menu_name,
                    image_url: menu.image_url,
                    description: menu.description,
                    price: menu.price,
                    sold_count: menu.sold_count,
                    rank: menu.rank,
                    customizable: menu.customizable,
                    ...getStockInfo(menu.stock),
                    restaurant: {
                        id: menu.restaurant_id,
                        name: menu.restaurant_name,
                        city: menu.city,
                        rating: menu.rating,
                        distance: menu.distance,
                        delivery_time: menu.delivery_time,
                        delivery_cost: menu.delivery_cost,
                        is_open: status.is_open,
                        closing_time_server: status.closing_time_server,
                    },
                };
            });

            return ResponseHandler.success(res, 200, 'Get Menus Recommended Success', menus);
        } catch (error) {
            return ResponseHandler.error(res, 500, error.message);
        }
    },

    getSuggestedMenus: async (req, res) => {
        try {
            const userId = req.userId;
            const { lat, lng } = req.query;

            const selectedCategories = await UserModel.getUserCategories(userId)

            const data = await MenuModel.getMenusWithRestaurant(
                parseFloat(lat),
                parseFloat(lng),
                selectedCategories
            );

            const suggested = data.filter(menu => menu.is_recommended === true);
            const menus = suggested.map(menu => {
                const status = getOpenStatusAndClosingTime(menu.operational_hours);
                return {
                    id: menu.menu_id,
                    name: menu.menu_name,
                    image_url: menu.image_url,
                    description: menu.description,
                    price: menu.price,
                    sold_count: menu.sold_count,
                    customizable: menu.customizable,
                    ...getStockInfo(menu.stock),
                    restaurant: {
                        id: menu.restaurant_id,
                        name: menu.restaurant_name,
                        city: menu.city,
                        rating: menu.rating,
                        distance: menu.distance,
                        delivery_cost: menu.delivery_cost,
                        delivery_time: menu.delivery_time,
                        is_open: status.is_open,
                        closing_time_server: status.closing_time_server,
                    }
                };
            });

            return ResponseHandler.success(res, 200, 'Get Suggested Menus Success', menus);
        } catch (error) {
            return ResponseHandler.error(res, 500, error.message);
        }
    }
}
