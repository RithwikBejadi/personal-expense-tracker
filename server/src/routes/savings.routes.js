const router  = require('express').Router();
const { body } = require('express-validator');
const { getAll, getOne, create, deposit, removeDeposit, update, remove } = require('../controllers/savings.controller');
const { validate } = require('../middleware/error.middleware');

router.get('/',    getAll);
router.get('/:id', getOne);

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('targetAmount').isFloat({ min: 0.01 }),
    body('targetDate').optional().isISO8601(),
  ],
  validate,
  create
);

router.post(
  '/:id/deposit',
  [
    body('amount').isFloat({ min: 0.01 }),
    body('date').optional().isISO8601(),
  ],
  validate,
  deposit
);

router.delete('/:id/deposit/:depositId', removeDeposit);
router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('targetAmount').optional().isFloat({ min: 0.01 }),
    body('targetDate').optional().isISO8601(),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid hex color'),
    body('icon').optional().isString(),
    body('status').optional().toUpperCase().isIn(['ACTIVE', 'COMPLETED', 'PAUSED']),
  ],
  validate,
  update
);
router.delete('/:id', remove);

module.exports = router;
