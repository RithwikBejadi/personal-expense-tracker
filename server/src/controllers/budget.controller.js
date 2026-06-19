const prisma = require('../config/db');

// GET /api/budgets  — list all months
const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { userId: req.userId };

    const [budgets, total] = await prisma.$transaction([
      prisma.budget.findMany({
        where,
        include: { _count: { select: { items: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.budget.count({ where }),
    ]);

    res.json({
      budgets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
};

// GET /api/budgets/:month/:year  — full plan with spending vs planned
const getOne = async (req, res, next) => {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    const budget = await prisma.budget.findUnique({
      where: { userId_month_year: { userId: req.userId, month, year } },
      include: {
        items: {
          include: { category: true },
          orderBy: { plannedAmount: 'desc' },
        },
      },
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    // Actual spending per category this month
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);

    const actuals = await prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: {
        userId: req.userId,
        date: { gte: start, lte: end },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    });

    const actualMap = {};
    for (const a of actuals) {
      if (!actualMap[a.categoryId]) actualMap[a.categoryId] = { INCOME: 0, EXPENSE: 0 };
      actualMap[a.categoryId][a.type] = Number(a._sum.amount);
    }

    const itemsWithActuals = budget.items.map((item) => ({
      ...item,
      spent:     actualMap[item.categoryId]?.[item.category.type] ?? 0,
      remaining: Number(item.plannedAmount) - (actualMap[item.categoryId]?.[item.category.type] ?? 0),
    }));

    // Month totals
    const totals = await prisma.transaction.groupBy({
      by: ['type'],
      where: { userId: req.userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    const totalIncome   = Number(totals.find((t) => t.type === 'INCOME')?._sum?.amount  ?? 0);
    const totalExpenses = Number(totals.find((t) => t.type === 'EXPENSE')?._sum?.amount ?? 0);

    res.json({
      budget: { ...budget, items: itemsWithActuals },
      summary: {
        totalPlanned:   Number(budget.totalPlanned),
        totalIncome,
        totalExpenses,
        net:            totalIncome - totalExpenses,
        remainingBudget: Number(budget.totalPlanned) - totalExpenses,
      },
    });
  } catch (err) { next(err); }
};

// POST /api/budgets
const create = async (req, res, next) => {
  try {
    const { month, year, totalPlanned, notes, items = [] } = req.body;

    const budget = await prisma.budget.create({
      data: {
        userId: req.userId,
        month,
        year,
        totalPlanned: totalPlanned || 0,
        notes: notes || null,
        items: {
          create: items.map((i) => ({
            categoryId:    i.categoryId,
            plannedAmount: i.plannedAmount,
          })),
        },
      },
      include: { items: { include: { category: true } } },
    });

    res.status(201).json({ budget });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Budget for this month/year already exists' });
    next(err);
  }
};

// PATCH /api/budgets/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { totalPlanned, notes } = req.body;

    const existing = await prisma.budget.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(totalPlanned !== undefined && { totalPlanned }),
        ...(notes        !== undefined && { notes }),
      },
    });
    res.json({ budget });
  } catch (err) { next(err); }
};

// DELETE /api/budgets/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.budget.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    await prisma.budget.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

// PUT /api/budgets/:id/items  — replace all line items
const upsertItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items = [] } = req.body;

    const existing = await prisma.budget.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    // Transactional replace
    const result = await prisma.$transaction([
      prisma.budgetItem.deleteMany({ where: { budgetId: id } }),
      prisma.budgetItem.createMany({
        data: items.map((i) => ({
          budgetId:      id,
          categoryId:    i.categoryId,
          plannedAmount: i.plannedAmount,
        })),
      }),
    ]);

    const updatedItems = await prisma.budgetItem.findMany({
      where: { budgetId: id },
      include: { category: true },
    });

    res.json({ items: updatedItems, replaced: result[1].count });
  } catch (err) { next(err); }
};

// GET /api/budgets/compare?months=3  — last N months side by side
const compare = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 3;
    const results = [];

    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.getMonth() + 1;
      const year  = d.getFullYear();

      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0);

      const totals = await prisma.transaction.groupBy({
        by: ['type'],
        where: { userId: req.userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      });

      results.push({
        month,
        year,
        income:   Number(totals.find((t) => t.type === 'INCOME')?._sum?.amount  ?? 0),
        expenses: Number(totals.find((t) => t.type === 'EXPENSE')?._sum?.amount ?? 0),
      });
    }

    res.json({ comparison: results.reverse() });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove, upsertItems, compare };
