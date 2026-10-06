const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./swagger');

// Routes
const authRoutes = require('./routes/auth.routes');
const requestRoutes = require('./routes/request.routes');
const resourceRoutes = require('./routes/resource.routes');
const aiRoutes = require('./routes/ai.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();

// ─── Security & Parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(logger);

// ─── Swagger Documentation ─────────────────────────────────────
setupSwagger(app);

// ─── API Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);

// ─── Health Check ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: "Bienvenue sur l'API Maison du Droit",
    version: '1.0.0',
    docs: '/api-docs',
  });
});

// ─── Error Handler ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
