const sql = require('../config/db');

// GET /transactions?month=6&year=2026&type=expense&category_id=...&page=1&limit=20
const getAll = async (req, res, next) => {
  try {
    const { month, year, type, category_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await sql`
      SELECT
        t.*,
        c.name  AS category_name,
        c.color AS category_color,
        c.icon  AS category_icon
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ${req.userId}
        AND (${month ? sql`EXTRACT(MONTH FROM t.date) = ${month}` : sql`TRUE`})
        AND (${year  ? sql`EXTRACT(YEAR  FROM t.date) = ${year}`  : sql`TRUE`})
        AND (${type  ? sql`t.type = ${type}`                       : sql`TRUE`})
        AND (${category_id ? sql`t.category_id = ${category_id}`  : sql`TRUE`})
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM transactions t
      WHERE t.user_id = ${req.userId}
        AND (${month ? sql`EXTRACT(MONTH FROM t.date) = ${month}` : sql`TRUE`})
        AND (${year  ? sql`EXTRACT(YEAR  FROM t.date) = ${year}`  : sql`TRUE`})
        AND (${type  ? sql`t.type = ${type}`                       : sql`TRUE`})
        AND (${category_id ? sql`t.category_id = ${category_id}`  : sql`TRUE`})
    `;

    res.json({
      transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count) },
    });
  } catch (err) { next(err); }
};

// GET /transactions/summary?month=6&year=2026
const getSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const byCategory = await sql`
      SELECT
        c.id,
        c.name,
        c.color,
        c.icon,
        c.type,
        COALESCE(SUM(t.amount), 0) AS total
      FROM categories c
      LEFT JOIN transactions t
        ON t.category_id = c.id
        AND t.user_id    = ${req.userId}
        AND (${month ? sql`EXTRACT(MONTH FROM t.date) = ${month}` : sql`TRUE`})
        AND (${year  ? sql`EXTRACT(YEAR  FROM t.date) = ${year}`  : sql`TRUE`})
      WHERE c.user_id = ${req.userId}
      GROUP BY c.id
      ORDER BY total DESC
    `;

    const [totals] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS total_expenses
      FROM transactions
      WHERE user_id = ${req.userId}
        AND (${month ? sql`EXTRACT(MONTH FROM date) = ${month}` : sql`TRUE`})
        AND (${year  ? sql`EXTRACT(YEAR  FROM date) = ${year}`  : sql`TRUE`})
    `;

    res.json({
      by_category: byCategory,
      total_income: totals.total_income,
      total_expenses: totals.total_expenses,
      net: totals.total_income - totals.total_expenses,
    });
  } catch (err) { next(err); }
};

// POST /transactions
const create = async (req, res, next) => {
  try {
    const { category_id, amount, type, description, date } = req.body;
    const [transaction] = await sql`
      INSERT INTO transactions (user_id, category_id, amount, type, description, date)
      VALUES (
        ${req.userId},
        ${category_id || null},
        ${amount},
        ${type},
        ${description || null},
        ${date || sql`CURRENT_DATE`}
      )
      RETURNING *
    `;
    res.status(201).json({ transaction });
  } catch (err) { next(err); }
};

// PATCH /transactions/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, amount, type, description, date } = req.body;

    const [transaction] = await sql`
      UPDATE transactions
      SET
        category_id = COALESCE(${category_id  ?? null}, category_id),
        amount      = COALESCE(${amount        ?? null}, amount),
        type        = COALESCE(${type          ?? null}, type),
        description = COALESCE(${description   ?? null}, description),
        date        = COALESCE(${date          ?? null}, date)
      WHERE id = ${id} AND user_id = ${req.userId}
      RETURNING *
    `;
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ transaction });
  } catch (err) { next(err); }
};

// DELETE /transactions/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM transactions WHERE id = ${id} AND user_id = ${req.userId}`;
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, getSummary, create, update, remove };
