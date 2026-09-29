// Centralized error handler. Never leaks stack traces, credentials, or internals to clients.
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  let status = err.statusCode || 500;
  let message = status === 500 ? 'Internal server error' : err.message;

  // Malformed Mongo ObjectId (e.g. bad :id in a URL) -> 400, not a generic 500
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path || 'id'} value`;
  }
  // Mongoose schema validation failure -> 400 with the actual validation reason
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join('; ') || 'Validation failed';
  }
  // Duplicate key (e.g. unique itemCode/email already exists) -> 409
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : 'Duplicate value';
  }

  res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
