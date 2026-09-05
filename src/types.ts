export type DutchLevel = 'B1.1' | 'B1.2' | 'B2.1' | 'B2.2';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'github' | 'google' | 'local';
  providerId: string;
  level: DutchLevel;
  xp: number;
  dailyStreak: number;
  lastActiveDate: string;
  createdAt: string;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  scenarioId: string;
  startedAt: string;
  lastActivity: string;
  messageCount: number;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  category: 'inversion' | 'word_order' | 'de_het' | 'separable_verb' | 'er_construction' | 'vocabulary' | 'tense';
  ruleName: string;
  explanation: string;
  explanationNl?: string;
}

export interface ConversationTurn {
  id: string;
  sessionId: string;
  sender: 'user' | 'tutor';
  dutchText: string;
  englishTranslation?: string;
  timestamp: string;
  grammarStatus?: 'perfect' | 'needs_improvement';
  grammarSummary?: string;
  improvedDutch?: string;
  corrections?: GrammarCorrection[];
  b2Upgrade?: string;
  pronunciationTip?: string;
  xpEarned?: number;
  audioDurationSec?: number;
}

export interface RoleplayScenario {
  id: string;
  titleNl: string;
  titleEn: string;
  category: 'Daily Life' | 'Government & BSN' | 'Healthcare' | 'Work & Career' | 'Housing' | 'Inburgering B1';
  level: DutchLevel;
  icon: string;
  characterName: string;
  characterRole: string;
  avatar: string;
  description: string;
  briefing: string;
  initialMessageNl: string;
  learningGoals: string[];
  recommendedVocab: { nl: string; en: string }[];
}

export interface MetricSnapshot {
  httpRequestsTotal: number;
  activeSessions: number;
  cacheHits: number;
  cacheMisses: number;
  aiLatencyP95Ms: number;
  correctionsCount: number;
  uptimeSeconds: number;
}

export interface MistakeLogEntry {
  id: string;
  userId: string;
  sessionId: string;
  category: string;
  original: string;
  corrected: string;
  explanation: string;
  timestamp: string;
}

export interface VocabularyItem {
  id: string;
  userId: string;
  dutch: string;
  english: string;
  exampleSentenceNl: string;
  exampleSentenceEn: string;
  ruleCategory?: string;
  srsLevel: number;
  nextReviewDate: string;
}
