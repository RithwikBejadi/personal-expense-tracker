require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const budgetRoutes = require('./routes/budget.routes');
const transactionRoutes = require('./routes/transaction.routes');
const authMiddleware = require('./middleware/auth.middleware');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// Core middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/budgets', authMiddleware, budgetRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
