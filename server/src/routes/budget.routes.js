const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, getOne, create, update, remove, upsertItems } = require('../controllers/budget.controller');
const { validate } = require('../middleware/error.middleware');

router.get('/', getAll);
router.get('/:month/:year', getOne);

router.post(
  '/',
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
    body('year').isInt({ min: 2000 }).withMessage('year must be >= 2000'),
    body('total_planned').optional().isFloat({ min: 0 }),
    body('items').optional().isArray(),
  ],
  validate,
  create
);

router.patch('/:id', update);
router.delete('/:id', remove);
router.put('/:id/items', upsertItems);

module.exports = router;
