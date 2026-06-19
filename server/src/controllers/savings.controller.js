const prisma = require('../config/db');

// GET /api/savings
const getAll = async (req, res, next) => {
  try {
    const { status } = req.query;

    const goals = await prisma.savingsGoal.findMany({
      where: {
        userId: req.userId,
        ...(status && { status: status.toUpperCase() }),
      },
      include: {
        deposits: { orderBy: { date: 'desc' }, take: 5 },
        _count:   { select: { deposits: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = goals.map((g) => ({
      ...g,
      progressPercent: Number(g.targetAmount) > 0
        ? Math.min(100, ((Number(g.savedAmount) / Number(g.targetAmount)) * 100).toFixed(1))
        : 0,
      remaining: Number(g.targetAmount) - Number(g.savedAmount),
    }));

    res.json({ goals: enriched });
  } catch (err) { next(err); }
};

// GET /api/savings/:id
const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId: req.userId },
      include: {
        deposits: { orderBy: { date: 'desc' } },
      },
    });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    // Monthly deposit trend
    const trend = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR  FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month,
        SUM(amount)::float            AS total
      FROM goal_deposits
      WHERE goal_id = ${id}::uuid
      GROUP BY year, month
      ORDER BY year, month
    `;

    res.json({
      goal: {
        ...goal,
        progressPercent: Number(goal.targetAmount) > 0
          ? Math.min(100, ((Number(goal.savedAmount) / Number(goal.targetAmount)) * 100).toFixed(1))
          : 0,
        remaining: Number(goal.targetAmount) - Number(goal.savedAmount),
      },
      trend,
    });
  } catch (err) { next(err); }
};

// POST /api/savings
const create = async (req, res, next) => {
  try {
    const { name, targetAmount, targetDate, color, icon } = req.body;

    const goal = await prisma.savingsGoal.create({
      data: {
        userId:       req.userId,
        name,
        targetAmount,
        targetDate:   targetDate ? new Date(targetDate) : null,
        color:        color || '#10b981',
        icon:         icon  || 'piggy-bank',
      },
    });
    res.status(201).json({ goal });
  } catch (err) { next(err); }
};

// POST /api/savings/:id/deposit
const deposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, note, date } = req.body;

    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.status !== 'ACTIVE') return res.status(400).json({ error: 'Goal is not active' });

    const newSaved    = Number(goal.savedAmount) + Number(amount);
    const isCompleted = newSaved >= Number(goal.targetAmount);

    const [goalDeposit, updatedGoal] = await prisma.$transaction([
      prisma.goalDeposit.create({
        data: {
          goalId: id,
          amount,
          note:   note || null,
          date:   date ? new Date(date) : new Date(),
        },
      }),
      prisma.savingsGoal.update({
        where: { id },
        data:  {
          savedAmount: newSaved,
          ...(isCompleted && { status: 'COMPLETED' }),
        },
      }),
    ]);

    res.status(201).json({ deposit: goalDeposit, goal: updatedGoal, completed: isCompleted });
  } catch (err) { next(err); }
};

// DELETE /api/savings/:id/deposit/:depositId
const removeDeposit = async (req, res, next) => {
  try {
    const { id, depositId } = req.params;

    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const dep = await prisma.goalDeposit.findFirst({ where: { id: depositId, goalId: id } });
    if (!dep) return res.status(404).json({ error: 'Deposit not found' });

    await prisma.$transaction([
      prisma.goalDeposit.delete({ where: { id: depositId } }),
      prisma.savingsGoal.update({
        where: { id },
        data:  { savedAmount: { decrement: dep.amount } },
      }),
    ]);

    res.status(204).send();
  } catch (err) { next(err); }
};

// PATCH /api/savings/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, targetDate, color, icon, status } = req.body;

    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(name         !== undefined && { name }),
        ...(targetAmount !== undefined && { targetAmount }),
        ...(targetDate   !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(color        !== undefined && { color }),
        ...(icon         !== undefined && { icon }),
        ...(status       !== undefined && { status: status.toUpperCase() }),
      },
    });
    res.json({ goal });
  } catch (err) { next(err); }
};

// DELETE /api/savings/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });

    await prisma.savingsGoal.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, deposit, removeDeposit, update, remove };
