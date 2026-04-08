import crypto from 'crypto'

class ResponseHandler {
  static success(res, code = 200, message = 'OK', data = undefined) {
    const response = {
      meta: {
        code,
        status: 'success',
        message,
        traceId: crypto.randomUUID(),
      },
    }

    // cuma tambahin data kalau emang dikasih
    if (data !== undefined) response.data = data

    return res.status(code).json(response)
  }

  static error(res, code = 500, message = 'Internal Server Error', data = undefined) {
    const response = {
      meta: {
        code,
        status: 'error',
        message,
        traceId: crypto.randomUUID(),
      },
    }

    if (data !== undefined) response.data = data

    return res.status(code).json(response)
  }
}

export default ResponseHandler;
