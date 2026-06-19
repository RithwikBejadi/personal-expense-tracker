const router  = require('express').Router();
const { body } = require('express-validator');
const { getAll, getDue, create, apply, update, remove } = require('../controllers/recurring.controller');
const { validate } = require('../middleware/error.middleware');

router.get('/due', getDue);
router.get('/',    getAll);

router.post(
  '/',
  [
    body('amount').isFloat({ min: 0.01 }),
    body('type').toUpperCase().isIn(['INCOME', 'EXPENSE']),
    body('description').trim().notEmpty(),
    body('frequency').toUpperCase().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    body('startDate').isISO8601().withMessage('Invalid startDate'),
    body('endDate').optional().isISO8601(),
  ],
  validate,
  create
);

router.post('/:id/apply', apply);
router.patch(
  '/:id',
  [
    body('amount').optional().isFloat({ min: 0.01 }),
    body('description').optional().trim().notEmpty(),
    body('frequency').optional().toUpperCase().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    body('endDate').optional().isISO8601(),
    body('isActive').optional().isBoolean(),
    body('categoryId').optional().isUUID(),
  ],
  validate,
  update
);
router.delete('/:id', remove);

module.exports = router;
