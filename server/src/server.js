require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');

const authRoutes        = require('./routes/auth.routes');
const categoryRoutes    = require('./routes/category.routes');
const budgetRoutes      = require('./routes/budget.routes');
const transactionRoutes = require('./routes/transaction.routes');
const recurringRoutes   = require('./routes/recurring.routes');
const savingsRoutes     = require('./routes/savings.routes');

const authMiddleware    = require('./middleware/auth.middleware');
const { errorHandler }  = require('./middleware/error.middleware');

const app = express();

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ─── Public routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Protected routes ─────────────────────────────────────────────────────────
app.use('/api/categories',   authMiddleware, categoryRoutes);
app.use('/api/budgets',      authMiddleware, budgetRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/recurring',    authMiddleware, recurringRoutes);
app.use('/api/savings',      authMiddleware, savingsRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
