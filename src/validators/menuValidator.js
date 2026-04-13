import Joi from "joi";

export const menuDetailSchema = Joi.object({
  menuId: Joi.string()
    .pattern(/^MEN-\d+$/)
    .required()
    .messages({
      "string.pattern.base": "Menu ID is wrong",
      "string.empty": "Menu ID cannot be empty",
      "any.required": "Menu ID is required"
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

export const createMenusSchema = Joi.object({
  menus: Joi.array().items(
    Joi.object({
      restaurant_id: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().allow(null, '').optional(),
      image_url: Joi.string().uri().required(),
      price_original: Joi.number().min(0).required(),
      price_discount: Joi.number().min(0).allow(null).optional(),
      promo: Joi.boolean().default(false),
      customizable: Joi.boolean().default(false),
      stock: Joi.number().min(0).required(),
      is_recommended: Joi.boolean().default(false),
      sold_count: Joi.number().min(0).default(0)
    })
  ).min(1).required().messages({
    'array.min': 'Menus cannot be empty',
    'any.required': 'Data are required.'
  })
}).messages({
  'any.required': 'Data are required.',
  'string.empty': 'Data are required.'
});

export const createCustomizationSchema = Joi.object({
  customization_groups: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      group_name: Joi.string().required(),
      required: Joi.boolean().default(false),
      max_select: Joi.number().min(1).default(1),
      
      // Validasi array options di dalam grup
      options: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          option_name: Joi.string().required(),
          price_add: Joi.number().min(0).default(0),
          is_available: Joi.boolean().default(true)
        })
      ).min(1).required()
    })
  ).min(1).required()
}).messages({
  'any.required': 'Data are required.',
  'string.empty': 'Data are required.',
  'array.min': 'Data are required.'
});

export const assignCustomizationSchema = Joi.object({
  menu_ids: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'any.required': 'Menu IDs is required',
      'array.min': 'Menu IDs is required',
      'array.base': 'Menu IDs must be an array'
    }),
    
  group_ids: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'any.required': 'Group IDs is required',
      'array.min': 'Group IDs is required',
      'array.base': 'Group IDs must be an array'
    })
});