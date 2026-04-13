import { ReviewModel } from '../models/reviewModel.js'
import { OrderModel } from '../models/orderModel.js';
import ResponseHandler from '../utils/responseHandler.js'
import { randomUUID } from 'crypto';

export const getDummyRestaurantReviews = (restaurantId) => [
    {
        id: randomUUID(),
        order_id: randomUUID(),
        user_id: randomUUID(),
        restaurant_id: restaurantId,
        user_name: "Kiana",
        profile_image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        rating: 4,
        comment: "Kopinya enak banget! Wanginya kerasa sampai luar ruangan, servisnya terbaik si",
        created_at: "2026-03-26T14:38:11.275303",
        order_items: "Hazelnut Latte, Kopi Kenangan Mantan"
    },
    {
        id: randomUUID(),
        order_id: randomUUID(),
        user_id: randomUUID(),
        restaurant_id: restaurantId,
        user_name: "Andrew",
        profile_image: "https://images.unsplash.com/photo-1654110455429-cf322b40a906?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        rating: 5,
        comment: "Great food and cozy atmosphere.",
        created_at: "2026-03-26T14:38:11.275303",
        order_items: "Salad, Steak"
    }
];

export const ReviewController = {
    createReviewMenu: async (req, res) => {
        try {
            const userId = req.userId;
            const orderItemId = req.params.orderItemId;
            const { rating, tags = '', comment = '' } = req.body;

            const alreadyReviewed = await ReviewModel.checkMenuReviewExists(userId, orderItemId);
            if (alreadyReviewed) {
                return ResponseHandler.error(res, 400, 'You have already reviewed this item.');
            }

            const reviewData = {
                order_item_id: orderItemId,
                user_id: userId,
                rating,
                tags: tags || '',
                comment: comment || ''
            };

            const data = await ReviewModel.createReviewMenu(reviewData);
            const reviewId = data[0]?.id;

            if (!reviewId) {
                throw new Error("Failed to generate Review ID");
            }

            await OrderModel.updateOrderItem(orderItemId, { menu_review_id: reviewId });
            return ResponseHandler.success(res, 200, 'Review submitted successfully');
        } catch (err) {
            console.error(err);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    createReviewRestaurant: async (req, res) => {
        try {
            const userId = req.userId;
            const orderId = req.params.orderId;
            const { restaurant_id, rating, comment = '' } = req.body;

            const alreadyReviewed = await ReviewModel.checkRestaurantReviewExists(userId, orderId);
            if (alreadyReviewed) {
                return ResponseHandler.error(res, 400, 'You have already reviewed this restauramt.');
            }

            const reviewData = {
                order_id: orderId,
                user_id: userId,
                restaurant_id: restaurant_id,
                rating: rating,
                comment: comment || ''
            };

            const data = await ReviewModel.createReviewRestaurant(reviewData);
            const reviewId = data[0]?.id;
            if (!reviewId) {
                throw new Error("Failed to get Review ID after insert");
            }

            await OrderModel.updateOrderById(orderId, { restaurant_review_id: reviewId });

            return ResponseHandler.success(res, 200, 'Review submitted successfully');
        } catch (err) {
            console.error(err);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    getReview: async (req, res) => {
        try {
            const restId = req.params.restId;
            const dummyReviews = getDummyRestaurantReviews(restId);

            return ResponseHandler.success(
                res,200,`Review Detail Restaurant`,dummyReviews
            );
        } catch (err) {
            console.error(err);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },

    getReviewDetail: async (req, res) => {
        try {
            const restId = req.params.restId;
            const summary = await ReviewModel.getRestaurantReviewSummary(restId);
            const reviews = await ReviewModel.getRestaurantReviews(restId);
            const dummyReviews = getDummyRestaurantReviews(restId);

            // 3️⃣ merge
            const mergedReviews = [
                ...dummyReviews,
                ...(reviews || [])
            ];

            const finalResponse = {
                summary: summary,
                reviews: mergedReviews
            };

            return ResponseHandler.success(
                res,
                200,
                `Review Restaurant ${restId}`,
                finalResponse
            );
        } catch (err) {
            console.error(err);
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    }
}