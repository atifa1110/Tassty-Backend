import Joi from "joi";

export const createReviewMenuSchema = Joi.object({
  orderItemId: Joi.string().required().messages({
    'any.required': 'Order Item ID is required'
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required'
  }),
  tags: Joi.string().allow(null, '').optional(),
  comment: Joi.string().allow(null, '').optional()
});


export const createRestaurantReviewSchema = Joi.object({
    orderId: Joi.string().required().messages({
    'any.required': 'Order ID is required'
  }),
  restaurant_id: Joi.string().required().messages({
    'any.required': 'Restaurant ID is required'
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required'
  }),
  comment: Joi.string().allow(null, '').optional()
});