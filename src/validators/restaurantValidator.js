import Joi from "joi";

export const locationSchema = Joi.object({
  lat: Joi.number().required().messages({
    "any.required": "Latitude is required",
    "number.base": "Latitude must be a number"
  }),
  lng: Joi.number().required().messages({
    "any.required": "Longitude is required",
    "number.base": "Longitude must be a number"
  })
});

export const restSchema = Joi.object({
  restId: Joi.string()
    .pattern(/^RES-\d+$/)
    .required()
    .messages({
      "string.pattern.base": "Restaurant ID is wrong",
      "string.empty": "Restaurant ID cannot be empty",
      "any.required": "Restaurant ID is required"
    }),
});


export const restaurantDetailSchema = Joi.object({
  restId: Joi.string()
    .pattern(/^RES-\d+$/)
    .required()
    .messages({
      "string.pattern.base": "Restaurant ID is wrong",
      "string.empty": "Restaurant ID cannot be empty",
      "any.required": "Restaurant ID is required"
    }),
  lat: Joi.number().required().messages({
    "any.required": "Latitude is required",
    "number.base": "Latitude must be a number"
  }),
  lng: Joi.number().required().messages({
    "any.required": "Longitude is required",
    "number.base": "Longitude must be a number"
  })
});

export const recommendedSchema = Joi.object({
  // Validasi untuk params (/:categoryId)
  categoryId: Joi.string().required().messages({
    "any.required": "Category ID is required",
    "string.empty": "Category ID cannot be empty"
  }),
  
  // Validasi untuk query (?lat=...&lng=...)
  lat: Joi.number().required().messages({
    "any.required": "Latitude is required",
    "number.base": "Latitude must be a number"
  }),
  lng: Joi.number().required().messages({
    "any.required": "Longitude is required",
    "number.base": "Longitude must be a number"
  }),
  
  // Search opsional, kalau gak ada ya gpp
  search: Joi.string().allow(null, '').optional()
});

export const nearbySchema = Joi.object({
  lat: Joi.number().required().messages({
    "any.required": "Latitude is required",
    "number.base": "Latitude must be a number"
  }),
  lng: Joi.number().required().messages({
    "any.required": "Longitude is required",
    "number.base": "Longitude must be a number"
  }),
  min_rating: Joi.number().min(0).max(5).optional(),
  price_range: Joi.string().optional(),
  cuisine: Joi.string().optional(),
  sorting: Joi.string().optional(),
  mode: Joi.string().optional()
});

export const categorySchema = Joi.object({
  categoryId: Joi.string().required().messages({
    "any.required": "Category ID is required",
    "string.empty": "Category ID cannot be empty"
  }),
  lat: Joi.number().required().messages({
    "any.required": "Latitude is required",
    "number.base": "Latitude must be a number"
  }),
  lng: Joi.number().required().messages({
    "any.required": "Longitude is required",
    "number.base": "Longitude must be a number"
  }),
  query: Joi.string().allow(null, '').optional(),
  price_range: Joi.string().optional(),
  min_rating: Joi.string().optional(),
  mode: Joi.string().optional(),
  cuisine: Joi.string().optional(),
  sorting: Joi.string().optional()
});

export const createRestaurantSchema = Joi.object({
  name: Joi.string().required(),
  image_url: Joi.string().required(),
  category_ids: Joi.array().items(Joi.string()).min(1).required(),
  rating: Joi.number().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  operational_hours: Joi.object().required(),
  city: Joi.string().required(),
  full_address: Joi.string().required(),
  total_reviews: Joi.number().optional(),
  verified: Joi.boolean().optional(),
  has_delivery: Joi.boolean().optional(),
  has_pickup: Joi.boolean().optional(),
  price_level: Joi.number().optional(),
  delivery_time_min: Joi.number().optional(),
  delivery_time_max: Joi.number().optional()
}).messages({
  'any.required': 'Data are required.',
  'string.empty': 'Data are required.',
  'array.min': 'Data are required.',
  'array.base': 'Data are required.'
});