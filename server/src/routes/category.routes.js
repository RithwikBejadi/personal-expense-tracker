const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, create, update, remove } = require('../controllers/category.controller');
const { validate } = require('../middleware/error.middleware');

router.get('/', getAll);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('type').isIn(['income', 'expense']).withMessage('type must be income or expense'),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid hex color'),
  ],
  validate,
  create
);

router.patch('/:id', update);

router.delete('/:id', remove);

module.exports = router;
