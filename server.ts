import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { logger } from './server/services/logger.ts';
import { metricsService } from './server/services/metricsService.ts';
import { cacheService } from './server/services/cacheService.ts';

import * as authController from './server/controllers/authController.ts';
import * as conversationController from './server/controllers/conversationController.ts';
import * as learningController from './server/controllers/learningController.ts';
import * as opsController from './server/controllers/opsController.ts';
import * as ragController from './server/controllers/ragController.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Middleware: Request tracking & Prometheus Metrics recording
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const correlationId = (req.headers['x-correlation-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('x-correlation-id', correlationId);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path;
      metricsService.recordHttpRequest(req.method, route, res.statusCode, duration);

      if (!req.path.startsWith('/metrics') && !req.path.startsWith('/healthz') && !req.path.startsWith('/readyz') && !req.path.startsWith('/@') && !req.path.startsWith('/src')) {
        logger.info(`${req.method} ${req.path} -> ${res.statusCode} in ${duration}ms`, {
          correlationId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: duration,
        });
      }
    });

    next();
  });

  // Middleware: Redis-backed Rate Limiting for high concurrent traffic protection
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/conversation/session') && req.method === 'POST') {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown-client';
      const rateCheck = await cacheService.checkRateLimit(clientIp, 60, 60); // 60 requests per minute
      res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

      if (!rateCheck.allowed) {
        logger.warn('Rate limit exceeded', { clientIp, path: req.path });
        return res.status(429).json({
          error: 'Te veel verzoeken (Too many requests). Rate limit active via Redis caching layer.',
        });
      }
    }
    next();
  });

  // ===================== API ROUTES FIRST =====================

  // Prometheus Metrics endpoint
  app.get('/metrics', opsController.getPrometheusMetrics);

  // Kubernetes Probes
  app.get('/healthz', opsController.livenessProbe);
  app.get('/readyz', opsController.readinessProbe);

  // Ops & Infrastructure Inspection endpoints
  app.get('/api/ops/metrics', opsController.getMetricsSnapshot);
  app.get('/api/ops/redis-cache', opsController.getCacheInspector);
  app.post('/api/ops/redis-cache/flush', opsController.flushCache);
  app.get('/api/ops/k8s-topology', opsController.getK8sTopology);

  // Auth & Session Management (OAuth 2.0)
  app.get('/api/auth/me', authController.getMe);
  app.post('/api/auth/demo-login', authController.demoLogin);
  app.get('/api/auth/oauth/github', authController.initiateOAuth('github'));
  app.get('/api/auth/oauth/google', authController.initiateOAuth('google'));
  app.get('/api/auth/oauth/callback', authController.oauthCallback);

  // Learning & Dutch Scenarios
  app.get('/api/learning/scenarios', learningController.getScenarios);
  app.get('/api/learning/mistakes', learningController.getMistakes);
  app.get('/api/learning/vocabulary', learningController.getVocabulary);
  app.post('/api/learning/vocabulary', learningController.addVocabularyWord);

  // Real-time Dutch Conversational Lab
  app.post('/api/conversation/session', conversationController.startSession);
  app.post('/api/conversation/session/start', conversationController.startSession);
  app.get('/api/conversation/session/:sessionId/history', conversationController.getSessionHistory);
  app.get('/api/conversation/session/:sessionId/stream', conversationController.handleSseStream);
  app.post('/api/conversation/session/:sessionId/message', conversationController.sendMessage);

  // RAG Knowledge Base & Real-time World Topics
  app.get('/api/rag/conversations', ragController.getConversations);
  app.post('/api/rag/conversations', ragController.addConversation);
  app.delete('/api/rag/conversations/:id', ragController.deleteConversation);
  app.post('/api/rag/search', ragController.searchRAG);
  app.get('/api/rag/world-topics', ragController.getWorldTopics);
  app.post('/api/rag/world-topics/:id/toggle', ragController.toggleWorldTopic);

  // ===================== FRONTEND SERVING =====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Nederlands B1-B2 AI Tutor backend running on port ${PORT}`, {
      env: process.env.NODE_ENV || 'development',
      port: PORT,
      prometheusEndpoint: `http://localhost:${PORT}/metrics`,
      k8sProbes: `http://localhost:${PORT}/healthz`,
    });
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server', { error: String(err) });
  process.exit(1);
});
