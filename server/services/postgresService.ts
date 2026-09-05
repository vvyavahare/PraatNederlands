import { User, UserSession, ConversationTurn, GrammarCorrection, DutchLevel } from '../types/index.ts';
import { logger } from './logger.ts';

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

class PostgresService {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private conversations: Map<string, ConversationTurn[]> = new Map(); // sessionId -> turns
  private vocabulary: Map<string, VocabularyItem[]> = new Map(); // userId -> items
  private mistakes: Map<string, MistakeLogEntry[]> = new Map(); // userId -> mistakes

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const defaultUser: User = {
      id: 'usr_java_engineer_1',
      email: 'vishalvyavahare123@gmail.com',
      name: 'Vishal (Java Backend Engineer)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      provider: 'github',
      providerId: 'gh_85431711',
      level: 'B1.1',
      xp: 420,
      dailyStreak: 5,
      lastActiveDate: new Date().toISOString(),
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Initial vocabulary for B1-B2 transition
    this.vocabulary.set(defaultUser.id, [
      {
        id: 'voc_1',
        userId: defaultUser.id,
        dutch: 'desalniettemin',
        english: 'nevertheless / nonetheless',
        exampleSentenceNl: 'Het regende pijpenstelen, desalniettemin ging het festival door.',
        exampleSentenceEn: 'It was pouring rain, nevertheless the festival went ahead.',
        ruleCategory: 'vocabulary',
        srsLevel: 2,
        nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        id: 'voc_2',
        userId: defaultUser.id,
        dutch: 'zich aanmelden',
        english: 'to register / sign up (separable verb)',
        exampleSentenceNl: 'Ik wil me graag aanmelden voor de verhuizing bij de gemeente.',
        exampleSentenceEn: 'I would like to register for the relocation at the municipality.',
        ruleCategory: 'separable_verb',
        srsLevel: 3,
        nextReviewDate: new Date(Date.now() + 172800000).toISOString(),
      },
      {
        id: 'voc_3',
        userId: defaultUser.id,
        dutch: 'aangezien',
        english: 'since / seeing that (subordinating conjunction -> verb at end)',
        exampleSentenceNl: 'Aangezien de trein vertraging had, kwam ik later aan.',
        exampleSentenceEn: 'Since the train was delayed, I arrived later.',
        ruleCategory: 'word_order',
        srsLevel: 1,
        nextReviewDate: new Date(Date.now() + 3600000).toISOString(),
      },
      {
        id: 'voc_4',
        userId: defaultUser.id,
        dutch: 'erover nadenken',
        english: 'to think about it (pronominal adverb)',
        exampleSentenceNl: 'Mag ik er nog even over nadenken voor ik teken?',
        exampleSentenceEn: 'May I think about it for a bit before I sign?',
        ruleCategory: 'er_construction',
        srsLevel: 2,
        nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
      },
    ]);

    // Initial mistakes log
    this.mistakes.set(defaultUser.id, [
      {
        id: 'mstk_1',
        userId: defaultUser.id,
        sessionId: 'prev_session_0',
        category: 'inversion',
        original: 'Gisteren ik heb met mijn manager gesproken.',
        corrected: 'Gisteren heb ik met mijn manager gesproken.',
        explanation: 'Inversion rule: When a sentence starts with a time indicator (Gisteren), the finite verb (heb) must immediately follow in position 2 before the subject (ik).',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'mstk_2',
        userId: defaultUser.id,
        sessionId: 'prev_session_0',
        category: 'word_order',
        original: 'Ik kom later omdat ik moet nog een e-mail sturen.',
        corrected: 'Ik kom later omdat ik nog een e-mail moet sturen.',
        explanation: 'Subordinate clause (bijzin) after "omdat": All verbs move to the very end of the clause.',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
      },
    ]);
  }

  public async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return u;
      }
    }
    return null;
  }

  public async upsertUser(userData: Partial<User> & { email: string; name: string }): Promise<User> {
    let existing = await this.getUserByEmail(userData.email);
    if (existing) {
      const updated: User = {
        ...existing,
        ...userData,
        lastActiveDate: new Date().toISOString(),
      };
      this.users.set(updated.id, updated);
      return updated;
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: userData.email,
      name: userData.name,
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      provider: userData.provider || 'local',
      providerId: userData.providerId || `local_${Date.now()}`,
      level: 'B1.1',
      xp: 100,
      dailyStreak: 1,
      lastActiveDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  public async addXpAndStreak(userId: string, xpPoints: number): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    user.xp += xpPoints;
    // Level up calculation:
    // A2 cleared = 0-300 XP
    // B1.1 = 301-800 XP
    // B1.2 = 801-1600 XP
    // B2.1 = 1601-2600 XP
    // B2.2 = 2601+ XP
    if (user.xp > 2600) user.level = 'B2.2';
    else if (user.xp > 1600) user.level = 'B2.1';
    else if (user.xp > 800) user.level = 'B1.2';
    else user.level = 'B1.1';

    user.lastActiveDate = new Date().toISOString();
    return user;
  }

  public async createSession(userId: string, scenarioId: string): Promise<UserSession> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: UserSession = {
      sessionId,
      userId,
      scenarioId,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0,
    };
    this.sessions.set(sessionId, session);
    this.conversations.set(sessionId, []);
    logger.info('Created new isolated session', { sessionId, userId, scenarioId });
    return session;
  }

  public async getSession(sessionId: string): Promise<UserSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  public async getSessionHistory(sessionId: string): Promise<ConversationTurn[]> {
    return this.conversations.get(sessionId) || [];
  }

  public async addConversationTurn(turn: ConversationTurn): Promise<void> {
    const session = this.sessions.get(turn.sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      session.messageCount++;
    }

    const turns = this.conversations.get(turn.sessionId) || [];
    turns.push(turn);
    this.conversations.set(turn.sessionId, turns);

    // If there were grammar corrections, log them in mistakes
    if (turn.corrections && turn.corrections.length > 0 && session) {
      const userMistakes = this.mistakes.get(session.userId) || [];
      for (const corr of turn.corrections) {
        userMistakes.unshift({
          id: `mstk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: session.userId,
          sessionId: turn.sessionId,
          category: corr.category,
          original: corr.original,
          corrected: corr.corrected,
          explanation: corr.explanation,
          timestamp: new Date().toISOString(),
        });
      }
      this.mistakes.set(session.userId, userMistakes.slice(0, 50));
    }
  }

  public async getUserMistakes(userId: string): Promise<MistakeLogEntry[]> {
    return this.mistakes.get(userId) || [];
  }

  public async getUserVocabulary(userId: string): Promise<VocabularyItem[]> {
    return this.vocabulary.get(userId) || [];
  }

  public async addVocabulary(userId: string, item: Omit<VocabularyItem, 'id' | 'userId' | 'srsLevel' | 'nextReviewDate'>): Promise<VocabularyItem> {
    const list = this.vocabulary.get(userId) || [];
    const newItem: VocabularyItem = {
      id: `voc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      ...item,
      srsLevel: 1,
      nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
    };
    list.unshift(newItem);
    this.vocabulary.set(userId, list);
    return newItem;
  }
}

export const postgresService = new PostgresService();
