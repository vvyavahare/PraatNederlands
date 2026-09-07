import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../server/app.ts';
import { aiDutchTutorService } from '../../../server/services/aiDutchTutorService.ts';
import { mockTutorResponses } from '../../mocks/mockTutorService.ts';

describe('Backend API Integration Tests (End-to-End)', () => {
  const app = createApp();

  beforeAll(() => {
    // Mock the external Gemini API call by default for fast, deterministic, offline CI execution
    vi.spyOn(aiDutchTutorService, 'evaluateAndReply').mockImplementation(async (userInput: string) => {
      if (/morgen ik ga/i.test(userInput)) {
        return mockTutorResponses.inversionError;
      }
      return mockTutorResponses.perfect;
    });
  });

  // 1. Kubernetes Probes & Prometheus Metrics
  describe('Operational Infrastructure Endpoints', () => {
    it('GET /healthz should return 200 UP for Kubernetes Liveness probe', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.check).toBe('liveness');
    });

    it('GET /readyz should return 200 UP for Kubernetes Readiness probe', async () => {
      const res = await request(app).get('/readyz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.check).toBe('readiness');
      expect(res.body.dependencies).toBeDefined();
    });

    it('GET /metrics should expose standard Prometheus scrapable metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('# HELP');
      expect(res.text).toContain('# TYPE');
    });

    it('GET /api/ops/metrics should return JSON metrics snapshot', async () => {
      const res = await request(app).get('/api/ops/metrics');
      expect(res.status).toBe(200);
      expect(res.body.snapshot).toBeDefined();
      expect(res.body.grammarBreakdown).toBeDefined();
    });
  });

  // 2. Learning & Dutch Curriculum Endpoints
  describe('Dutch Learning & Scenarios Endpoints', () => {
    it('GET /api/learning/scenarios should return available B1/B2 roleplay scenarios', async () => {
      const res = await request(app).get('/api/learning/scenarios');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.scenarios)).toBe(true);
      expect(res.body.scenarios.length).toBeGreaterThan(0);

      const first = res.body.scenarios[0];
      expect(first.id).toBeDefined();
      expect(first.titleNl).toBeDefined();
      expect(first.level).toBeDefined();
      expect(first.characterName).toBeDefined();
    });

    it('GET /api/learning/vocabulary should return vocabulary list', async () => {
      const res = await request(app).get('/api/learning/vocabulary');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.vocabulary)).toBe(true);
    });
  });

  // 3. RAG Knowledge Base & Orama Vector Search
  describe('RAG Knowledge Base & Vector Search Endpoints', () => {
    it('GET /api/rag/stats should return Orama Vector Database engine statistics', async () => {
      const res = await request(app).get('/api/rag/stats');
      expect(res.status).toBe(200);
      expect(res.body.engine).toContain('Orama Vector Database');
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.vectorDimensions).toBe(128);
    });

    it('POST /api/rag/search should execute hybrid vector search and return similarity matches', async () => {
      const res = await request(app)
        .post('/api/rag/search')
        .send({ query: 'sparren standup Zuidas', category: 'workplace', limit: 3 });

      expect(res.status).toBe(200);
      expect(res.body.query).toBe('sparren standup Zuidas');
      expect(Array.isArray(res.body.matches)).toBe(true);
      expect(res.body.matches.length).toBeGreaterThan(0);
      expect(res.body.matches[0].similarity).toBeGreaterThan(0);
    });

    it('GET /api/rag/conversations should return stored conversation records', async () => {
      const res = await request(app).get('/api/rag/conversations');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.conversations)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });
  });

  // 4. Conversational Session & Real-Time Dialogue
  describe('Conversational Session Lifecycle Endpoints', () => {
    let createdSessionId = '';

    it('POST /api/conversation/session should start a new session with initial tutor turn', async () => {
      const res = await request(app)
        .post('/api/conversation/session')
        .send({ scenarioId: 'sollicitatie', level: 'B2.1' });

      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.sessionId).toBeDefined();
      expect(res.body.scenario).toBeDefined();
      expect(res.body.initialTurn).toBeDefined();

      createdSessionId = res.body.session.sessionId;
    });

    it('GET /api/conversation/session/:id/history should fetch existing conversation history', async () => {
      expect(createdSessionId).not.toBe('');
      const res = await request(app).get(`/api/conversation/session/${createdSessionId}/history`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.turns)).toBe(true);
      expect(res.body.turns.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/conversation/session/:id/message should evaluate user message and return pedagogical feedback', async () => {
      expect(createdSessionId).not.toBe('');
      const res = await request(app)
        .post(`/api/conversation/session/${createdSessionId}/message`)
        .send({ text: 'Morgen ik ga naar het kantoor om te werken.' });

      expect(res.status).toBe(200);
      expect(res.body.studentTurn).toBeDefined();
      expect(res.body.studentTurn.dutchText).toBe('Morgen ik ga naar het kantoor om te werken.');
      expect(res.body.tutorTurn).toBeDefined();
      expect(res.body.tutorTurn.grammarStatus).toBe('needs_improvement');
      expect(res.body.tutorTurn.corrections.length).toBeGreaterThan(0);
      expect(res.body.tutorTurn.corrections[0].rule).toBe('inversion');
    });

    it('POST /api/conversation/session/:id/message should reject empty messages with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/conversation/session/${createdSessionId}/message`)
        .send({ text: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Message text is required');
    });
  });
});
