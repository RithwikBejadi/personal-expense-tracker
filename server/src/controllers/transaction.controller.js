const prisma = require('../config/db');

// GET /api/transactions?month=6&year=2026&type=EXPENSE&categoryId=...&page=1&limit=20&search=...
const getAll = async (req, res, next) => {
  try {
    const { month, year, type, categoryId, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.userId };

    if (month && year) {
      where.date = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0),
      };
    }
    if (type)       where.type       = type.toUpperCase();
    if (categoryId) where.categoryId = categoryId;
    if (search)     where.description = { contains: search, mode: 'insensitive' };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: { category: { select: { name: true, color: true, icon: true, type: true } } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        page:       parseInt(page),
        limit:      parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
};

// GET /api/transactions/summary?month=6&year=2026
const getSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const dateFilter = {};
    if (month && year) {
      dateFilter.gte = new Date(year, month - 1, 1);
      dateFilter.lte = new Date(year, month, 0);
    }
    const where = {
      userId: req.userId,
      ...(Object.keys(dateFilter).length && { date: dateFilter }),
    };

    // Totals by type
    const byType = await prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    // Totals by category
    const byCategory = await prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: { ...where, categoryId: { not: null } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Enrich with category info
    const categoryIds = [...new Set(byCategory.map((b) => b.categoryId))];
    const categories  = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true, icon: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    const income   = Number(byType.find((t) => t.type === 'INCOME')?._sum?.amount  ?? 0);
    const expenses = Number(byType.find((t) => t.type === 'EXPENSE')?._sum?.amount ?? 0);

    res.json({
      income,
      expenses,
      net: income - expenses,
      savingsRate: income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : '0.0',
      byCategory: byCategory.map((b) => ({
        ...b,
        total:    Number(b._sum.amount),
        category: catMap[b.categoryId] || null,
      })),
    });
  } catch (err) { next(err); }
};

// GET /api/transactions/trends?months=6
const getTrends = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const start  = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);

    const data = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR  FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month,
        type,
        SUM(amount)::float            AS total
      FROM transactions
      WHERE user_id = ${req.userId}::uuid
        AND date >= ${start}
      GROUP BY year, month, type
      ORDER BY year, month
    `;

    // Pivot into { year, month, income, expenses }
    const pivotMap = {};
    for (const row of data) {
      const key = `${row.year}-${row.month}`;
      if (!pivotMap[key]) pivotMap[key] = { year: row.year, month: row.month, income: 0, expenses: 0 };
      if (row.type === 'INCOME')  pivotMap[key].income   = row.total;
      if (row.type === 'EXPENSE') pivotMap[key].expenses = row.total;
    }

    res.json({ trends: Object.values(pivotMap) });
  } catch (err) { next(err); }
};

// POST /api/transactions
const create = async (req, res, next) => {
  try {
    const { categoryId, amount, type, description, note, date } = req.body;

    const transaction = await prisma.transaction.create({
      data: {
        userId:      req.userId,
        categoryId:  categoryId  || null,
        amount,
        type:        type.toUpperCase(),
        description: description || null,
        note:        note        || null,
        date:        date ? new Date(date) : new Date(),
      },
      include: { category: { select: { name: true, color: true, icon: true } } },
    });

    res.status(201).json({ transaction });
  } catch (err) { next(err); }
};

// POST /api/transactions/bulk  — import multiple
const createBulk = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    const data = transactions.map((t) => ({
      userId:      req.userId,
      categoryId:  t.categoryId  || null,
      amount:      t.amount,
      type:        t.type.toUpperCase(),
      description: t.description || null,
      note:        t.note        || null,
      date:        t.date ? new Date(t.date) : new Date(),
    }));

    const result = await prisma.transaction.createMany({ data });
    res.status(201).json({ created: result.count });
  } catch (err) { next(err); }
};

// PATCH /api/transactions/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId, amount, type, description, note, date } = req.body;

    const existing = await prisma.transaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(categoryId  !== undefined && { categoryId }),
        ...(amount      !== undefined && { amount }),
        ...(type        !== undefined && { type: type.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(note        !== undefined && { note }),
        ...(date        !== undefined && { date: new Date(date) }),
      },
      include: { category: { select: { name: true, color: true, icon: true } } },
    });

    res.json({ transaction });
  } catch (err) { next(err); }
};

// DELETE /api/transactions/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.transaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, getSummary, getTrends, create, createBulk, update, remove };
