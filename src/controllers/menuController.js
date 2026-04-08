import { MenuModel } from '../models/menuModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { getStockInfo, getOpenStatusAndClosingTime } from '../utils/openTimeHandler.js';
import { UserModel } from '../models/userModel.js';

export const MenuController = {
    add: async (req, res) => {
        try {
            const { menus = [] } = req.body;

            // Validasi: minimal 1 menu
            if (menus.length === 0) {
                return ResponseHandler.error(res, 400, 'menus tidak boleh kosong');
            }

            // Validasi setiap menu
            for (const menu of menus) {
                const { restaurant_id, name, price_original } = menu;
                if (!restaurant_id || !name || price_original == null) {
                    return ResponseHandler.error(
                        res,
                        400,
                        'Setiap menu wajib memiliki restaurant_id, name, dan price_original'
                    );
                }
            }

            // Simpan semua menu ke database
            await MenuModel.createMenus(menus);

            return ResponseHandler.success(res, 200, 'Create Menus Success');
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    addCustomizations: async (req, res) => {
        try {
            const { customization_groups = [] } = req.body;

            if (customization_groups.length === 0) {
                return ResponseHandler.error(res, 400, 'customization_groups tidak boleh kosong');
            }

            // --- Insert customization groups ---
            const groupsData = customization_groups.map(group => ({
                id: group.id,
                group_name: group.group_name,
                required: group.required || false,
                max_select: group.max_select || 1
            }));

            await MenuModel.createCustomizationGroups(groupsData);

            // --- Insert customization options ---
            const optionsData = [];
            customization_groups.forEach(group => {
                if (group.options && group.options.length > 0) {
                    group.options.forEach(option => {
                        optionsData.push({
                            id: option.id,
                            group_id: group.id,
                            option_name: option.option_name,
                            price_add: option.price_add || 0,
                            is_available: option.is_available !== false
                        });
                    });
                }
            });

            if (optionsData.length > 0) {
                await MenuModel.createCustomizationOptions(optionsData);
            }

            return ResponseHandler.success(res, 200, 'Customizations berhasil ditambahkan', {
                customization_groups
            });

        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    assignCustomizationsToMenus: async (req, res) => {
        try {
            const { menu_ids = [], group_ids = [] } = req.body;

            if (menu_ids.length === 0) {
                return ResponseHandler.error(res, 400, 'menu_ids tidak boleh kosong');
            }

            if (group_ids.length === 0) {
                return ResponseHandler.error(res, 400, 'group_ids tidak boleh kosong');
            }

            const pivotData = [];

            menu_ids.forEach(menu_id => {
                group_ids.forEach(group_id => {
                    pivotData.push({ menu_id, group_id });
                });
            });

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

            if (!lat || !lng) {
                return ResponseHandler.error(res, 400, 'Latitude dan longitude wajib diisi');
            }

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
                        name:menu.restaurant_name,
                        city:menu.city,
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
            const { lat, lng } = req.query;

            if (!lat || !lng) {
                return ResponseHandler.error(res, 400, 'Latitude dan longitude wajib diisi');
            }

            const userId = req.userId; 
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
                        name:menu.restaurant_name,
                        city:menu.city,
                        rating: menu.rating,
                        distance: menu.distance,
                        delivery_cost : menu.delivery_cost,
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
