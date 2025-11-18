import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import rfxRoutes from './routes/rfxRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import { cors } from './middleware/cors.js';
import { cookieParser } from './middleware/cookieParser.js';
import { rateLimit } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(rateLimit({ keyPrefix: 'global', windowMs: 60 * 1000, max: 120 }));

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Powered-By', 'AccelProcure API');
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'dev',
    requestId: req.requestId,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/rfx', rfxRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/map', mapRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`AccelProcure API listening on port ${PORT}`);
  });
}

export default app;
