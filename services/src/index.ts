import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { timeEntriesRouter } from './routes/timeEntries';
import { aiProcessingRouter } from './routes/aiProcessing';
import { importRouter } from './routes/import';
import { projectsRouter } from './routes/projects';
import { clientsRouter } from './routes/clients';
import { Database } from './database/connection';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes (protected)
app.use('/api/v1/time-entries', authMiddleware, timeEntriesRouter);
app.use('/api/v1/ai', authMiddleware, aiProcessingRouter);
app.use('/api/v1/import', authMiddleware, importRouter);
app.use('/api/v1/projects', authMiddleware, projectsRouter);
app.use('/api/v1/clients', authMiddleware, clientsRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await Database.initialize();
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 TimeBeacon Intelligent Service running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await Database.close();
  process.exit(0);
});

startServer();