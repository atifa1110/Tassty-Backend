import Joi from "joi";

export const createOrderSchema = Joi.object({
  restaurant_id: Joi.string()
    .required()
    .messages({
      'any.required': 'Restaurant ID is required.',
      'string.empty': 'Restaurant ID is required.'
    }),
    
  voucher_id: Joi.string()
    .allow(null, '')
    .optional(), 
    
  address_id: Joi.string()
    .required()
    .messages({
      'any.required': 'Address ID is required.',
      'string.empty': 'Address ID is required.'
    }),

  total_order: Joi.number().min(0).required(),
  items: Joi.array().items(
    Joi.object({
      menu_id: Joi.string()
        .required()
        .messages({
          'any.required': 'Menu ID is required.',
          'string.empty': 'Menu ID is required.'
        }),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
      notes: Joi.string().allow(null, '').optional(),
      option_ids: Joi.array().items(Joi.string()).default([])
    })
  ).min(1).required()
}).messages({
  'any.required': 'Data are required.',
  'string.empty': 'Data are required.',
  'number.base': 'Data are required.',
  'array.min': 'Order must contain at least one item.'
});


export const orderSchema = Joi.object({
  orderId: Joi.string()
    .guid({ version: 'uuidv4' }) 
    .required()
    .messages({
      'string.guid': 'Order ID format is invalid.',
      'any.required': 'Order ID is required.',
      'string.empty': 'Order ID is required.'
    }),
});

export const paymentSchema = Joi.object({
  // Ini dari URL (req.params)
  orderId: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Format Order ID salah.',
      'any.required': 'Order ID harus ada.'
    }),

  // Ini dari Body (req.body)
  stripe_pm_id: Joi.string()
    .required()
    .messages({
      'any.required': 'Stripe Payment Method ID wajib diisi.'
    })
});

export const paymentXenditSchema = Joi.object({
  // Dari Params
  orderId: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Order ID format is invalid.',
      'any.required': 'Order ID is required.'
    }),

  // Dari Body
  payment_method: Joi.string()
    .uppercase() // Xendit biasanya suka format: OVO, DANA, SHOPEEPAY, atau VIRTUAL_ACCOUNT
    .required()
    .messages({
      'any.required': 'Please choose a payment method.',
      'string.empty': 'Payment method cannot be empty.'
    })
});