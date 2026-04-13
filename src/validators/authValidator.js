import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required"
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required"
  })
});

export const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.min": "Name must be at least 3 characters long",
    "any.required": "Name is required"
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required"
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required"
  }),

  role: Joi.string()
    .valid('USER', 'DRIVER')
    .default('USER') 
    .messages({
      "any.only": "Role must be either 'USER' or 'DRIVER'",
      "any.required": "Role is required"
    })
});

export const verifySchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required"
  }),
  code: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
    "string.length": "Verification code must be exactly 6 digits",
    "string.pattern.base": "Verification code must only contain numbers",
    "any.required": "Verification code is required"
  })
});

export const resendEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required"
  })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "string.empty": "Refresh token cannot be empty",
    "any.required": "Refresh token is required"
  })
});

export const setupSchema = Joi.object({
  addressType: Joi.string()
    .valid("PERSONAL", "BUSINESS") 
    .default("PERSONAL")
    .messages({
     'any.only': 'Address type must be either PERSONAL or BUSINESS.',
    }),
  
  addressName: Joi.string().required().messages({
    "string.empty": "Address name cannot be empty",
    "any.required": "Address name is required (e.g., Home, Apartment)"
  }),

  fullAddress: Joi.string().required().messages({
    "string.empty": "Full address cannot be empty",
    "any.required": "Full address is required"
  }),

  landmarkDetail: Joi.string().allow(null, '').required().messages({
    "any.required": "Landmark details are required to help drivers find you"
  }),

  lat: Joi.number().min(-90).max(90).required().messages({
    "number.base": "Latitude must be a number",
    "any.required": "Latitude is required"
  }),

  lng: Joi.number().min(-180).max(180).required().messages({
    "number.base": "Longitude must be a number",
    "any.required": "Longitude is required"
  }),

  categoryIds: Joi.array()
    .items(Joi.string().required()) 
    .min(1)
    .required()
    .messages({
      "array.min": "Please select at least one favorite category",
      "array.base": "Categories must be an array",
      "any.required": "Favorite categories are required",
      "array.includesRequiredUnknowns": "Please select at least one favorite category"
    })
});

export const updatePasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      "string.min": "New password must be at least 8 characters long",
      "string.empty": "Password cannot be empty",
      "any.required": "New password is required"
    })
});