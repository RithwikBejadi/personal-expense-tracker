const router = require('express').Router();
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const { validate } = require('../middleware/error.middleware');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  login
);

router.get('/me', auth, me);

module.exports = router;
