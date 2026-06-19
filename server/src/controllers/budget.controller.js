const sql = require('../config/db');

// GET /budgets?month=6&year=2026
const getAll = async (req, res, next) => {
  try {
    const budgets = await sql`
      SELECT * FROM budgets WHERE user_id = ${req.userId} ORDER BY year DESC, month DESC
    `;
    res.json({ budgets });
  } catch (err) { next(err); }
};

// GET /budgets/:month/:year  — full plan with items + spending summary
const getOne = async (req, res, next) => {
  try {
    const { month, year } = req.params;

    const [budget] = await sql`
      SELECT * FROM budgets WHERE user_id = ${req.userId} AND month = ${month} AND year = ${year}
    `;
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    const items = await sql`
      SELECT
        bi.*,
        c.name  AS category_name,
        c.color AS category_color,
        c.icon  AS category_icon,
        c.type  AS category_type,
        COALESCE(SUM(t.amount), 0) AS spent
      FROM budget_items bi
      JOIN categories c ON c.id = bi.category_id
      LEFT JOIN transactions t
        ON t.category_id = bi.category_id
        AND t.user_id    = ${req.userId}
        AND EXTRACT(MONTH FROM t.date) = ${month}
        AND EXTRACT(YEAR  FROM t.date) = ${year}
      WHERE bi.budget_id = ${budget.id}
      GROUP BY bi.id, c.name, c.color, c.icon, c.type
    `;

    // Overall spending for the month
    const [summary] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount END), 0) AS total_income
      FROM transactions
      WHERE user_id = ${req.userId}
        AND EXTRACT(MONTH FROM date) = ${month}
        AND EXTRACT(YEAR  FROM date) = ${year}
    `;

    res.json({ budget, items, summary });
  } catch (err) { next(err); }
};

// POST /budgets
const create = async (req, res, next) => {
  try {
    const { month, year, total_planned, notes, items = [] } = req.body;

    const [budget] = await sql`
      INSERT INTO budgets (user_id, month, year, total_planned, notes)
      VALUES (${req.userId}, ${month}, ${year}, ${total_planned || 0}, ${notes || null})
      RETURNING *
    `;

    if (items.length > 0) {
      const values = items.map((i) => ({
        budget_id: budget.id,
        category_id: i.category_id,
        planned_amount: i.planned_amount,
      }));
      await sql`INSERT INTO budget_items ${sql(values)}`;
    }

    res.status(201).json({ budget });
  } catch (err) {
    if (err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Budget for this month/year already exists' });
    }
    next(err);
  }
};

// PATCH /budgets/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { total_planned, notes } = req.body;

    const [budget] = await sql`
      UPDATE budgets
      SET
        total_planned = COALESCE(${total_planned ?? null}, total_planned),
        notes         = COALESCE(${notes         ?? null}, notes)
      WHERE id = ${id} AND user_id = ${req.userId}
      RETURNING *
    `;
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json({ budget });
  } catch (err) { next(err); }
};

// DELETE /budgets/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM budgets WHERE id = ${id} AND user_id = ${req.userId}`;
    res.status(204).send();
  } catch (err) { next(err); }
};

// PUT /budgets/:id/items — replace all items for a budget
const upsertItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items = [] } = req.body;

    const [budget] = await sql`SELECT id FROM budgets WHERE id = ${id} AND user_id = ${req.userId}`;
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    await sql`DELETE FROM budget_items WHERE budget_id = ${id}`;

    if (items.length > 0) {
      const values = items.map((i) => ({
        budget_id: id,
        category_id: i.category_id,
        planned_amount: i.planned_amount,
      }));
      await sql`INSERT INTO budget_items ${sql(values)}`;
    }

    const updatedItems = await sql`SELECT * FROM budget_items WHERE budget_id = ${id}`;
    res.json({ items: updatedItems });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove, upsertItems };
