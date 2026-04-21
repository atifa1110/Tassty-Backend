import Joi from "joi";

export const updateUserProfileSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .optional() // Optional karena mungkin user cuma mau ganti foto
    .messages({
      'string.min': 'Name must be at least 3 characters.',
      'string.max': 'Name cannot exceed 50 characters.'
    })
});

export const saveCardSchema = Joi.object({
  paymentMethodId: Joi.string()
    .required()
    .messages({
      'any.required': 'Payment Method ID is required dari Stripe.',
      'string.empty': 'Payment Method ID tidak boleh kosong.'
    }),
    
  themeColor: Joi.string()
    .optional()
    .default('blue'),

  themeBackground: Joi.string()
    .optional()
    .default('pattern_1')
});

export const deleteCardSchema = Joi.object({
  cardId: Joi.string()
    .required()
    .messages({
      'any.required': 'Card ID is required dari Stripe.',
      'string.empty': 'Card ID tidak boleh kosong.'
    }),
});

export const deleteAddressSchema = Joi.object({
  addressId: Joi.string()
    .required()
    .messages({
      'any.required': 'Address ID is required dari Stripe.',
      'string.empty': 'Address ID tidak boleh kosong.'
    }),

});

export const addressSchema = Joi.object({
  addressType: Joi.string()
    .valid('PERSONAL', 'BUSINESS')
    .required()
    .messages({
      'any.only': 'Address type must be either PERSONAL or BUSINESS.',
      'any.required': 'Please select an address type.'
    }),
    
  addressName: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.empty': 'Address name cannot be empty.',
      'string.max': 'Address name is too long (maximum 50 characters).',
      'any.required': 'Please provide a name for this address (e.g., Home or Office).'
    }),

  fullAddress: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.empty': 'Full address is required.',
      'string.min': 'Address is too short. Please provide a more detailed address.',
      'any.required': 'Full address is mandatory.'
    }),

  landmarkDetail: Joi.string()
    .allow('', null),

  lat: Joi.number()
    .required()
    .messages({
      'number.base': 'Latitude must be a valid number.',
      'number.min': 'Invalid latitude coordinates.',
      'number.max': 'Invalid latitude coordinates.',
      'any.required': 'Latitude is required for map positioning.'
    }),

  lng: Joi.number()
    .required()
    .messages({
      'number.base': 'Longitude must be a valid number.',
      'number.min': 'Invalid longitude coordinates.',
      'number.max': 'Invalid longitude coordinates.',
      'any.required': 'Longitude is required for map positioning.'
    })
});