const router  = require('express').Router();
const { body } = require('express-validator');
const { getAll, getStats, create, update, remove } = require('../controllers/category.controller');
const { validate } = require('../middleware/error.middleware');

router.get('/',      getAll);
router.get('/:id/stats', getStats);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('type').toUpperCase().isIn(['INCOME', 'EXPENSE']).withMessage('type must be INCOME or EXPENSE'),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid hex color'),
  ],
  validate,
  create
);

router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid hex color'),
    body('icon').optional().isString(),
  ],
  validate,
  update
);
router.delete('/:id', remove);

module.exports = router;
