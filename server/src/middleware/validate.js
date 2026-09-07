const AppError = require('../lib/AppError');

// Middleware factory: validates req.body (or a chosen source) against a Zod schema.
function validate(schema, source = 'body') {
  return function (req, _res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError(400, 'Validation failed', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
