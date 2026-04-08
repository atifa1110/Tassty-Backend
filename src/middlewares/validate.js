import ResponseHandler from "../utils/responseHandler.js";

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessage = error.details[0].message;
    return ResponseHandler.error(res, 400, errorMessage);
  }

  next();
};