const prisma = require('../config/db');

// GET /api/categories
const getAll = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.userId,
      ...(type && { type: type.toUpperCase() }),
    };

    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        include: {
          _count: { select: { transactions: true } },
        },
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.category.count({ where }),
    ]);

    res.json({
      categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
};

// GET /api/categories/:id/stats?month=6&year=2026
const getStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    const category = await prisma.category.findFirst({
      where: { id, userId: req.userId },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const dateFilter = {};
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0);
      dateFilter.gte = start;
      dateFilter.lte = end;
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        categoryId: id,
        ...(Object.keys(dateFilter).length && { date: dateFilter }),
      },
      orderBy: { date: 'desc' },
    });

    const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const count = transactions.length;
    const avg   = count > 0 ? total / count : 0;

    // Last 6 months breakdown
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthly = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR  FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month,
        SUM(amount)::float            AS total
      FROM transactions
      WHERE user_id    = ${req.userId}::uuid
        AND category_id = ${id}::uuid
        AND date >= ${sixMonthsAgo}
      GROUP BY year, month
      ORDER BY year, month
    `;

    res.json({ category, stats: { total, count, avg }, monthly });
  } catch (err) { next(err); }
};

// POST /api/categories
const create = async (req, res, next) => {
  try {
    const { name, color, icon, type } = req.body;

    const category = await prisma.category.create({
      data: {
        userId: req.userId,
        name,
        color: color || '#6366f1',
        icon:  icon  || 'tag',
        type:  type.toUpperCase(),
      },
    });

    res.status(201).json({ category });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category already exists' });
    next(err);
  }
};

// PATCH /api/categories/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;

    const existing = await prisma.category.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name  !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(icon  !== undefined && { icon }),
      },
    });

    res.json({ category });
  } catch (err) { next(err); }
};

// DELETE /api/categories/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.category.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, getStats, create, update, remove };
