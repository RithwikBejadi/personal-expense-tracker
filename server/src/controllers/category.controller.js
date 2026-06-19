const sql = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const categories = await sql`
      SELECT * FROM categories WHERE user_id = ${req.userId} ORDER BY type, name
    `;
    res.json({ categories });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { name, color, icon, type } = req.body;
    const [category] = await sql`
      INSERT INTO categories (user_id, name, color, icon, type)
      VALUES (${req.userId}, ${name}, ${color || '#6366f1'}, ${icon || 'tag'}, ${type})
      RETURNING *
    `;
    res.status(201).json({ category });
  } catch (err) {
    if (err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    const [category] = await sql`
      UPDATE categories
      SET
        name  = COALESCE(${name  ?? null}, name),
        color = COALESCE(${color ?? null}, color),
        icon  = COALESCE(${icon  ?? null}, icon)
      WHERE id = ${id} AND user_id = ${req.userId}
      RETURNING *
    `;
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ category });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await sql`
      DELETE FROM categories WHERE id = ${id} AND user_id = ${req.userId}
    `;
    if (result.count === 0) return res.status(404).json({ error: 'Category not found' });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, create, update, remove };
