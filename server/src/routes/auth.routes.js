const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/authValidators');

const c = require('../controllers/authController');

// Apply a tighter rate limit to credential endpoints.
router.post('/register', authLimiter, validate(registerSchema), c.register);
router.post('/login', authLimiter, validate(loginSchema), c.login);
router.post('/refresh', refreshLimiter, c.refresh);
router.post('/logout', c.logout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), c.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), c.resetPassword);

module.exports = router;
