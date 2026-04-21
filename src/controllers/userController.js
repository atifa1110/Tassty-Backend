import { supabaseAdmin, supabaseAuth } from '../config/supabaseClient.js'
import { UserModel } from '../models/userModel.js'
import { RestaurantModel } from '../models/restaurantModel.js'
import ResponseHandler from '../utils/responseHandler.js'
import stripe from '../config/stripeService.js'
import { getPaymentMethodDetail } from '../config/stripeService.js'
import { deletePaymentMethod } from '../config/stripeService.js'

export const UserController = {
    updateUserProfile: async (req, res) => {
        try {
            const userId = req.userId;
            const { name } = req.body;
            const file = req.file;

            const updates = {};
            if (name) updates.name = name;

            if (file) {
                const fileName = `${userId}/avatar.jpg`;

                console.log("Informasi File:", {
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    destFileName: fileName
                });

                // 1. Upload Buffer file ke Supabase Storage
                const { data: storageData, error: storageError } = await supabaseAdmin.storage
                    .from('avatars')
                    .upload(fileName, file.buffer, {
                        contentType: file.mimetype,
                        upsert: true
                    });

                if (storageError) {
                    // LOG 2: Jika error di Storage (RLS atau Auth)
                    console.error("Detailed Storage Error:", {
                        message: storageError.message,
                        status: storageError.status,
                        errorType: storageError.error
                    });
                    return ResponseHandler.error(res, 400, storageError.message);
                }

                console.log("Upload Storage Berhasil:", storageData);

                // 2. Dapatkan Public URL
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                updates.profile_image = `${publicUrl}?v=${Date.now()}`;
                console.log("URL Gambar Baru (Database):", updates.profile_image);
            }

            // 3. Update Supabase Auth metadata
            if (name) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                    userId,
                    { user_metadata: { full_name: name } }
                );

                if (authError) {
                    return ResponseHandler.error(res, 400, "Auth update failed: " + authError.message);
                }
            }

            console.log("Auth Metadata Berhasil Diupdate");
            console.log("Mengirim Update ke Database:", updates);
            if (Object.keys(updates).length > 0) {
                await UserModel.updateUserProfile(userId, updates);
            } else {
                return ResponseHandler.error(res, 400, "No data provided to update.");
            }

            return ResponseHandler.success(res, 200, "Profile updated successfully", {
                name: updates.name || null,
                profileImage: updates.profile_image || null
            });

        } catch (err) {
            console.error("Error Message:", err.message);

            if (err.message.includes("violates row-level security")) {
                return ResponseHandler.error(res, 403, "Kamu tidak punya izin mengubah data ini.");
            }
            return ResponseHandler.error(res, 400, err.message);
        }
    },

    getUserProfile: async (req, res) => {
        try {
            const userId = req.userId;
            let user = await UserModel.getUserProfile(userId)

            let selectedCategories = [];

            if (user.selected_category_ids?.length) {
                let categories = await RestaurantModel.getCategoryNamesByIds(user.selected_category_ids)
                selectedCategories = categories;
            }

            return ResponseHandler.success(res, 200, "Get Profile Successfully", {
                id: userId,
                email: user.email,
                name: user.name,
                profile_image: user.profile_image,
                category_ids: selectedCategories
            });

        } catch (err) {
            console.error(err);
            return ResponseHandler.error(res, 500, "Internal Server Error");
        }
    },

    createAddress: async (req, res) => {
        try {
            const userId = req.userId;
            const {
                addressType,
                fullAddress,
                landmarkDetail,
                addressName,
                lat,
                lng,
            } = req.body;

            const profile = await UserModel.getUserProfile(userId);
            const isFirstAddress = !profile.user_addresses || profile.user_addresses.length === 0;

            const newAddress = {
                user_id: userId,
                address_type: addressType,
                address_name: addressName,
                full_address: fullAddress,
                landmark_detail: landmarkDetail,
                latitude: lat,
                longitude: lng,
                is_primary: isFirstAddress
            };

            await UserModel.createUserAddress(newAddress)
            return ResponseHandler.success(res, 200, 'Add Address Success', {
                address_name: addressName,
                is_primary: isFirstAddress
            });

        } catch (err) {
            // Setiap error dari UserModel (Foreign Key violation, dll.) akan tertangkap di sini.
            console.error("Add Address Failed:", err);
            return ResponseHandler.error(res, 500, 'Internal Server Error');
        }
    },
    getUserAddress: async (req, res) => {
        try {
            const userId = req.userId;
            let data = await UserModel.getUserAddresses(userId)

            return ResponseHandler.success(res, 200, "Get Profile Successfully", data);
        } catch (err) {
            console.error(err);
            return ResponseHandler.error(res, 500, "Internal Server Error");
        }
    },

    deleteUserAddress: async (req, res) => {
        try {
            const addressId = req.addressId;
            let data = await UserModel.deleteUserAddress(addressId);

            return ResponseHandler.success(res, 200, "Delete Address Successfully", data);
        } catch (err) {
            console.error(err);
            return ResponseHandler.error(res, 500, "Internal Server Error");
        }
    },
    createStripeSetupIntent: async (req, res) => {
        try {
            const userId = req.userId;

            // 1. Cari data user di DB untuk dapat Stripe Customer ID
            const user = await UserModel.getUserProfile(userId);

            // Logika: Jika user belum punya stripe_customer_id, buat dulu di Stripe
            let stripeCustomerId = user.stripe_customer_id;

            if (!stripeCustomerId) {
                const customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                    metadata: { userId: userId }
                });
                stripeCustomerId = customer.id;

                // Simpan stripe_customer_id ke tabel users kamu di Supabase
                //await supabaseAdmin.from("users").update({ stripe_customer_id: stripeCustomerId }).eq("id", userId);
                await UserModel.updateUserProfile(userId, {
                    stripe_customer_id: stripeCustomerId
                });
            }

            // Buat SetupIntent
            const setupIntent = await stripe.setupIntents.create({
                customer: stripeCustomerId,
                payment_method_types: ["card"],
            });

            // Kirim client_secret ke frontend
            return ResponseHandler.success(res, 200, "Setup Intent Created", {
                clientSecret: setupIntent.client_secret
            });

        } catch (err) {
            console.error("Stripe Setup Error:", err);
            return ResponseHandler.error(res, 500, "Gagal memulai pendaftaran kartu");
        }
    },

    saveNewCard: async (req, res) => {
        try {
            const userId = req.userId;
            const { paymentMethodId, themeColor, themeBackground } = req.body;

            const paymentMethod = await getPaymentMethodDetail(paymentMethodId);
            if (!paymentMethod.card) {
                return ResponseHandler.error(res, 500, "Data kartu tidak ditemukan di objek PaymentMethod Stripe");
            }

            const dataToInsert = {
                user_id: userId,
                stripe_pm_id: paymentMethod.id,
                cardholder_name: paymentMethod.billing_details.name || "Customer",
                masked_number: `**** **** **** ${paymentMethod.card.last4}`,
                card_brand: paymentMethod.card.brand,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year,
                theme_color: themeColor,
                theme_background: themeBackground,
                status: "ACTIVE"
            };

            await UserModel.addUserPaymentMethod(dataToInsert);
            return ResponseHandler.success(res, 201, "Card saved successfully");

        } catch (err) {
            console.error("Save Card Error:", err);
            return ResponseHandler.error(res, 500, "Gagal menyimpan informasi kartu");
        }
    },

    getUserCard: async (req, res) => {
        try {
            const userId = req.userId;
            const data = await UserModel.getUserCardByUserId(userId);

            return ResponseHandler.success(res, 200, "Get User Card Successfully", data);
        } catch (err) {
            console.error("Save Card Error:", err);
            return ResponseHandler.error(res, 500, "Fetch Card Error");
        }
    },

    deleteUserCard: async (req, res) => {
        try {
            const cardId = req.params.cardId;
            const cardData = await UserModel.getUserCardById(cardId);

            console.log(cardData)
            if (!cardData || !cardData.stripe_pm_id) {
                return ResponseHandler.error(res, 404, "Card data not found in our system");
            }

            try {
                await deletePaymentMethod(cardData.stripe_pm_id);
            } catch (stripeErr) {
                console.error("Stripe Detach Error:", stripeErr.message);
                return ResponseHandler.error(res, 404, "Payment method not found on Stripe server");
            }

            await UserModel.deleteUserCardById(cardId);

            return ResponseHandler.success(res, 200, "Delete User Card Successfully");
        } catch (err) {
            console.error("Save Card Error:", err);
            return ResponseHandler.error(res, 500, "Fetch Card Error");
        }
    }
}