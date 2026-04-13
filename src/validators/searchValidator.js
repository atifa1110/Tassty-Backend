import Joi from "joi";

export const searchSchema = Joi.object({
  lat: Joi.number().required().messages({
    'any.required': 'Latitude is required',
    'number.base': 'Latitude must be a number'
  }),
  lng: Joi.number().required().messages({
    'any.required': 'Longitude is required',
    'number.base': 'Longitude must be a number'
  }),
  query: Joi.string().min(1).required().messages({
    'any.required': 'Search query is required',
    'string.empty': 'Search query cannot be empty'
  }),
  // Filter pendukung semuanya opsional
  price_range: Joi.string().allow(null, '').optional(),
  min_rating: Joi.number().min(0).max(5).allow(null).optional(),
  mode: Joi.string().allow(null, '').optional(),
  cuisine: Joi.string().allow(null, '').optional(),
  sorting: Joi.string().allow(null, '').optional()
});