const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { changePasswordSchema, updateProfileSchema } = require('../validators/authValidators');

const c = require('../controllers/authController');

router.use(authenticate);

router.get('/me', c.me);
router.patch('/me', validate(updateProfileSchema), c.updateProfile);
router.post('/me/avatar', imageUpload.single('avatar'), c.uploadAvatar);
router.post('/change-password', validate(changePasswordSchema), c.changePassword);

module.exports = router;
