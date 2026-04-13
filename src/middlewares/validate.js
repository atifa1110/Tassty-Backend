import ResponseHandler from "../utils/responseHandler.js";

// export const validate = (schema) => (req, res, next) => {
//   const { error } = schema.validate(req.body, { abortEarly: false });

//   if (error) {
//     const errorMessage = error.details[0].message;
//     return ResponseHandler.error(res, 400, errorMessage);
//   }

//   next();
// };

export const validate = (schema) => (req, res, next) => {
  // Kita gabungin semua sumber data ke dalam satu objek buat divalidasi
  const dataToValidate = {
    ...req.body,   // buat data POST/PUT
    ...req.params, // buat data ID di URL
    ...req.query   // buat data latitude/longitude di query
  };

  const { error } = schema.validate(dataToValidate, { abortEarly: false });

  if (error) {
    const errorMessage = error.details[0].message;
    return ResponseHandler.error(res, 400, errorMessage);
  }

  next();
};