const router  = require('express').Router();
const { body } = require('express-validator');
const { getAll, getSummary, getTrends, create, createBulk, update, remove } = require('../controllers/transaction.controller');
const { validate } = require('../middleware/error.middleware');

router.get('/summary', getSummary);
router.get('/trends',  getTrends);
router.get('/',        getAll);

router.post(
  '/',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('amount must be > 0'),
    body('type').toUpperCase().isIn(['INCOME', 'EXPENSE']).withMessage('type must be INCOME or EXPENSE'),
    body('date').optional().isISO8601().withMessage('Invalid date'),
  ],
  validate,
  create
);

router.post(
  '/bulk',
  [
    body('transactions').isArray({ min: 1 }).withMessage('transactions must be a non-empty array'),
    body('transactions.*.amount').isFloat({ min: 0.01 }),
    body('transactions.*.type').notEmpty(),
  ],
  validate,
  createBulk
);

router.patch(
  '/:id',
  [
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('amount must be > 0'),
    body('type').optional().toUpperCase().isIn(['INCOME', 'EXPENSE']).withMessage('type must be INCOME or EXPENSE'),
    body('date').optional().isISO8601().withMessage('Invalid date'),
    body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  ],
  validate,
  update
);
router.delete('/:id', remove);

module.exports = router;
