const logger = require('../lib/logger');
const AppError = require('../lib/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Multer upload errors: file too large / unexpected field / too many files.
  if (err && err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large'
      : `Upload error: ${err.code || 'invalid request'}`;
    return res.status(status).json({ success: false, message });
  }

  // Malformed JSON body from body-parser — return 400 instead of 500.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }

  if (err.statusCode && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error({ err, url: req.originalUrl }, 'Unhandled error');
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

function notFound(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFound };
