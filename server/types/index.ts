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

export type DutchLevel = 'B1.1' | 'B1.2' | 'B2.1' | 'B2.2';

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

export interface RealtimeConversationTurn {
  speaker: string; // e.g. "Collega A", "Bram", "Baliemedewerker", "Student"
  text: string;
  translationEn?: string;
  timestamp?: string;
}

export interface DutchIdiom {
  phrase: string;
  meaning: string;
  register: 'informal' | 'formal' | 'slang' | 'workplace';
  exampleSentence?: string;
}

export interface RealtimeConversationRecord {
  id: string;
  title: string;
  category: 'workplace' | 'daily_life' | 'housing' | 'healthcare' | 'administration' | 'social' | 'news';
  tags: string[];
  level: 'B1' | 'B2' | 'C1';
  turns: RealtimeConversationTurn[];
  rawTranscript: string;
  extractedIdioms: DutchIdiom[];
  worldContextTopic?: string;
  embedding?: number[];
  createdAt: string;
  source: 'live_recorded' | 'uploaded_transcript' | 'curated_native';
  locationOrContext?: string; // e.g., "Amsterdam Zuidas Tech Hub", "Gemeente Utrecht Loket"
}

export interface RAGSearchMatch {
  recordId: string;
  title: string;
  category: string;
  similarity: number;
  matchedTurn: string;
  speaker: string;
  extractedIdioms: DutchIdiom[];
  locationOrContext?: string;
}

export interface GlobalWorldTopic {
  id: string;
  topicTitle: string;
  category: string;
  summaryDutch: string;
  summaryEnglish: string;
  activeInRAG: boolean;
  sourceUrlOrEntity?: string;
  updatedAt: string;
}

