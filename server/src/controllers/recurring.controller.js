const prisma = require('../config/db');

const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

const nextDue = (current, frequency) => {
  const d = new Date(current);
  switch (frequency) {
    case 'DAILY':   d.setDate(d.getDate() + 1);   break;
    case 'WEEKLY':  d.setDate(d.getDate() + 7);   break;
    case 'MONTHLY': d.setMonth(d.getMonth() + 1); break;
    case 'YEARLY':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
};

// GET /api/recurring
const getAll = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const recurring = await prisma.recurringTransaction.findMany({
      where: {
        userId: req.userId,
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      },
      include: { category: { select: { name: true, color: true, icon: true } } },
      orderBy: { nextDueDate: 'asc' },
    });
    res.json({ recurring });
  } catch (err) { next(err); }
};

// GET /api/recurring/due  — items due today or overdue
const getDue = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = await prisma.recurringTransaction.findMany({
      where: {
        userId:     req.userId,
        isActive:   true,
        nextDueDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: { category: { select: { name: true, color: true, icon: true } } },
    });
    res.json({ due, count: due.length });
  } catch (err) { next(err); }
};

// POST /api/recurring
const create = async (req, res, next) => {
  try {
    const { categoryId, amount, type, description, frequency, startDate, endDate } = req.body;

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId:      req.userId,
        categoryId:  categoryId || null,
        amount,
        type:        type.toUpperCase(),
        description,
        frequency:   frequency.toUpperCase(),
        startDate:   new Date(startDate),
        endDate:     endDate ? new Date(endDate) : null,
        nextDueDate: new Date(startDate),
      },
      include: { category: true },
    });
    res.status(201).json({ recurring });
  } catch (err) { next(err); }
};

// POST /api/recurring/:id/apply  — mark as paid, create transaction, advance next due
const apply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, note } = req.body;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: req.userId },
    });
    if (!recurring) return res.status(404).json({ error: 'Recurring transaction not found' });

    const applyDate = date ? new Date(date) : new Date();

    const [transaction, updated] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId:      req.userId,
          categoryId:  recurring.categoryId,
          amount:      recurring.amount,
          type:        recurring.type,
          description: recurring.description,
          note:        note || null,
          date:        applyDate,
        },
      }),
      prisma.recurringTransaction.update({
        where: { id },
        data:  { nextDueDate: nextDue(recurring.nextDueDate, recurring.frequency) },
      }),
    ]);

    res.status(201).json({ transaction, recurring: updated });
  } catch (err) { next(err); }
};

// PATCH /api/recurring/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, description, frequency, endDate, isActive, categoryId } = req.body;

    const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Recurring transaction not found' });

    const recurring = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(amount      !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(frequency   !== undefined && { frequency: frequency.toUpperCase() }),
        ...(endDate     !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isActive    !== undefined && { isActive }),
        ...(categoryId  !== undefined && { categoryId }),
      },
      include: { category: true },
    });
    res.json({ recurring });
  } catch (err) { next(err); }
};

// DELETE /api/recurring/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Recurring transaction not found' });

    await prisma.recurringTransaction.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, getDue, create, apply, update, remove };
