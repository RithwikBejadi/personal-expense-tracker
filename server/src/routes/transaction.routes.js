const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, getSummary, create, update, remove } = require('../controllers/transaction.controller');
const { validate } = require('../middleware/error.middleware');

router.get('/', getAll);
router.get('/summary', getSummary);

router.post(
  '/',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be > 0'),
    body('type').isIn(['income', 'expense']).withMessage('type must be income or expense'),
    body('date').optional().isISO8601().withMessage('Invalid date'),
  ],
  validate,
  create
);

router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
