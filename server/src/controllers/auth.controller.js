const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const safeUser = ({ passwordHash, ...rest }) => rest;

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    // Seed default categories for new user
    await prisma.category.createMany({
      data: [
        { userId: user.id, name: 'Stipend',        type: 'INCOME',  color: '#10b981', icon: 'briefcase' },
        { userId: user.id, name: 'Clothes',        type: 'EXPENSE',  color: '#06b6d4', icon: 'laptop'    },
        { userId: user.id, name: 'Fitness',        type: 'EXPENSE', color: '#f59e0b', icon: 'utensils'  },
        { userId: user.id, name: 'Transport',      type: 'EXPENSE', color: '#3b82f6', icon: 'car'       },
        { userId: user.id, name: 'Housing',        type: 'EXPENSE', color: '#8b5cf6', icon: 'home'      },
        { userId: user.id, name: 'Entertainment',  type: 'EXPENSE', color: '#ec4899', icon: 'tv'        },
        { userId: user.id, name: 'Health',         type: 'EXPENSE', color: '#ef4444', icon: 'heart'     },
        { userId: user.id, name: 'Shopping',       type: 'EXPENSE', color: '#f97316', icon: 'shopping-bag' },
        { userId: user.id, name: 'Bills',        type: 'EXPENSE', color: '#14b8a6', icon: 'piggy-bank' },
        { userId: user.id, name: 'Other',          type: 'EXPENSE', color: '#6b7280', icon: 'tag'       },
      ],
    });

    const token = signToken(user.id);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
};

// PATCH /api/auth/me
const updateMe = async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const data = {};

    if (name) data.name = name;

    if (newPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, name: true, email: true, updatedAt: true },
    });
    res.json({ user: updated });
  } catch (err) { next(err); }
};

module.exports = { register, login, me, updateMe };
