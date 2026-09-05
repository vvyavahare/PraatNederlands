import { Request, Response } from 'express';
import { postgresService } from '../services/postgresService.ts';
import { cacheService } from '../services/cacheService.ts';
import { aiDutchTutorService } from '../services/aiDutchTutorService.ts';
import { SCENARIOS } from '../services/scenarioData.ts';
import { ConversationTurn } from '../types/index.ts';
import { logger } from '../services/logger.ts';
import { metricsService } from '../services/metricsService.ts';

// Active SSE client connections map
const sseClients: Map<string, Response[]> = new Map();

export const startSession = async (req: Request, res: Response) => {
  const { scenarioId, userId = 'usr_java_engineer_1' } = req.body;
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];

  const session = await postgresService.createSession(userId, scenario.id);

  // Initialize initial tutor turn in session
  const initialTurn: ConversationTurn = {
    id: `turn_${Date.now()}_init`,
    sessionId: session.sessionId,
    sender: 'tutor',
    dutchText: scenario.initialMessageNl,
    englishTranslation: 'Welcome! Let us begin our conversation.',
    timestamp: new Date().toISOString(),
    b2Upgrade: 'Tip: Luister aandachtig naar de vraag en gebruik inversie als je antwoordt met "Vandaag..." of "Nu...".',
    pronunciationTip: 'Spreek rustig en let op de beklemtoning van samengestelde woorden.',
  };

  await postgresService.addConversationTurn(initialTurn);

  // Cache in Redis for high concurrency
  const cacheKey = `nl:session:${userId}:${session.sessionId}:turns`;
  await cacheService.set(cacheKey, [initialTurn], 3600);
  metricsService.incrementActiveSessions();

  return res.json({
    session,
    scenario,
    initialTurn,
  });
};

export const getSessionHistory = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = await postgresService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Try Redis cache first
  const cacheKey = `nl:session:${session.userId}:${sessionId}:turns`;
  const cachedTurns = await cacheService.get<ConversationTurn[]>(cacheKey);
  if (cachedTurns) {
    return res.json({ turns: cachedTurns, cached: true });
  }

  const turns = await postgresService.getSessionHistory(sessionId);
  await cacheService.set(cacheKey, turns, 3600);
  return res.json({ turns, cached: false });
};

export const handleSseStream = (req: Request, res: Response) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send connected ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', sessionId })}\n\n`);

  const existing = sseClients.get(sessionId) || [];
  existing.push(res);
  sseClients.set(sessionId, existing);

  req.on('close', () => {
    const clients = sseClients.get(sessionId) || [];
    sseClients.set(
      sessionId,
      clients.filter((c) => c !== res)
    );
  });
};

function cleanSpokenDuplicates(text: string): string {
  if (!text) return '';
  const words = text.trim().replace(/\s+/g, ' ').split(' ');
  const deduped: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const prev = deduped[deduped.length - 1];
    const currentClean = current.toLowerCase().replace(/[.,!?;:]/g, '');
    const prevClean = prev ? prev.toLowerCase().replace(/[.,!?;:]/g, '') : '';
    if (prev && currentClean && currentClean === prevClean) {
      continue;
    }
    deduped.push(current);
  }
  return deduped.join(' ');
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { text, userId = 'usr_java_engineer_1' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const session = await postgresService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const scenario = SCENARIOS.find((s) => s.id === session.scenarioId) || SCENARIOS[0];
    const history = await postgresService.getSessionHistory(sessionId);

    // Sanitize any consecutive speech recognition duplications (e.g. "Hallo Hallo" -> "Hallo")
    const cleanedText = cleanSpokenDuplicates(text);

    // 1. Create student turn
    const studentTurn: ConversationTurn = {
      id: `turn_${Date.now()}_usr`,
      sessionId,
      sender: 'user',
      dutchText: cleanedText,
      timestamp: new Date().toISOString(),
    };
    await postgresService.addConversationTurn(studentTurn);

    // Broadcast to SSE stream that student message was accepted
    broadcastSse(sessionId, { type: 'STUDENT_MESSAGE', turn: studentTurn });

    // 2. Evaluate with Gemini AI Dutch Tutor
    const evaluation = await aiDutchTutorService.evaluateAndReply(cleanedText, scenario, history);

    // 3. Create AI Tutor reply turn with live corrections and grammar evaluation
    const tutorTurn: ConversationTurn = {
      id: `turn_${Date.now()}_ttr`,
      sessionId,
      sender: 'tutor',
      dutchText: evaluation.replyInDutch,
      englishTranslation: evaluation.englishTranslation,
      timestamp: new Date().toISOString(),
      grammarStatus: evaluation.grammarStatus,
      grammarSummary: evaluation.grammarSummary,
      improvedDutch: evaluation.improvedDutch,
      corrections: evaluation.corrections,
      b2Upgrade: evaluation.b2Upgrade,
      pronunciationTip: evaluation.pronunciationTip,
      xpEarned: evaluation.xpEarned,
    };
    await postgresService.addConversationTurn(tutorTurn);

    // 4. Update user XP and streak in PostgreSQL
    const updatedUser = await postgresService.addXpAndStreak(session.userId, evaluation.xpEarned);

    // 5. Update Redis cache
    const cacheKey = `nl:session:${session.userId}:${sessionId}:turns`;
    const allTurns = await postgresService.getSessionHistory(sessionId);
    await cacheService.set(cacheKey, allTurns, 3600);

    // Broadcast tutor reply to SSE stream
    broadcastSse(sessionId, {
      type: 'TUTOR_REPLY',
      turn: tutorTurn,
      suggestedQuickReplies: evaluation.suggestedQuickReplies,
      user: updatedUser,
    });

    return res.json({
      studentTurn,
      tutorTurn,
      suggestedQuickReplies: evaluation.suggestedQuickReplies,
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Error handling message in conversationController:', { error: String(error) });
    return res.status(500).json({ error: 'Interne fout bij het verwerken van het bericht.' });
  }
};

function broadcastSse(sessionId: string, data: unknown) {
  const clients = sseClients.get(sessionId) || [];
  for (const client of clients) {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      logger.error('Failed to write to SSE client', { error: String(err) });
    }
  }
}
