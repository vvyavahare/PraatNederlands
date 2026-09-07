import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { createApp } from './server/app.ts';
import { logger } from './server/services/logger.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createApp();
  const PORT = 3000;

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
