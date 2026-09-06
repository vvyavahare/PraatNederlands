import { GoogleGenAI } from '@google/genai';
import {
  RealtimeConversationRecord,
  RealtimeConversationTurn,
  DutchIdiom,
  RAGSearchMatch,
  GlobalWorldTopic,
} from '../types/index.ts';
import { logger } from './logger.ts';

// Initial curated real-world Dutch dialogues representing authentic native speech
const INITIAL_CONVERSATIONS: RealtimeConversationRecord[] = [
  {
    id: 'conv_curated_1',
    title: 'IT Standup & Sprint Review bij FinTech Zuidas',
    category: 'workplace',
    tags: ['it', 'standup', 'collegas', 'zuidas', 'B2'],
    level: 'B2',
    locationOrContext: 'Amsterdam Zuidas Tech Hub',
    rawTranscript: `Bram: Goedemorgen team! Zullen we even kort de stand van zaken doornemen voor de sprint van vandaag?
Sanne: Prima! Ik heb gisteren de pull request voor de betalingsmodule klaargezet, maar we moeten nog even afstemmen met het compliance team.
Lars: Goed punt. Zullen we daar na de standup even over sparren? Dan sluiten we dat meteen kort.
Bram: Uitstekend. Als we de schouders eronder zetten, kunnen we donderdag live gaan naar productie.`,
    turns: [
      { speaker: 'Bram', text: 'Goedemorgen team! Zullen we even kort de stand van zaken doornemen voor de sprint van vandaag?', translationEn: 'Good morning team! Shall we briefly go over the state of affairs for today\'s sprint?' },
      { speaker: 'Sanne', text: 'Prima! Ik heb gisteren de pull request voor de betalingsmodule klaargezet, maar we moeten nog even afstemmen met het compliance team.', translationEn: 'Fine! Yesterday I prepared the pull request for the payment module, but we still need to coordinate with the compliance team.' },
      { speaker: 'Lars', text: 'Goed punt. Zullen we daar na de standup even over sparren? Dan sluiten we dat meteen kort.', translationEn: 'Good point. Shall we brainstorm/spar about that after the standup? Then we can quickly align on it.' },
      { speaker: 'Bram', text: 'Uitstekend. Als we de schouders eronder zetten, kunnen we donderdag live gaan naar productie.', translationEn: 'Excellent. If we put our shoulders to the wheel (work hard together), we can go live to production on Thursday.' },
    ],
    extractedIdioms: [
      { phrase: 'even kortsluiten', meaning: 'Quickly coordinate or align with someone', register: 'workplace' },
      { phrase: 'ergens over sparren', meaning: 'To brainstorm or bounce ideas back and forth', register: 'workplace' },
      { phrase: 'de schouders eronder zetten', meaning: 'To buckle down, put effort into completing a task', register: 'informal' },
      { phrase: 'de stand van zaken', meaning: 'Current status or progress', register: 'formal' },
    ],
    worldContextTopic: 'Tech & FinTech banen in Amsterdam',
    source: 'curated_native',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'conv_curated_2',
    title: 'Woningbezichtiging & Huurvoorwaarden in De Pijp',
    category: 'housing',
    tags: ['wonen', 'makelaar', 'borgsom', 'amsterdam', 'B1'],
    level: 'B1',
    locationOrContext: 'Amsterdam De Pijp',
    rawTranscript: `Makelaar: Welkom! Dit is het tweekamerappartement op de tweede verdieping. Zoals je ziet, is er veel natuurlijk lichtinval.
Kandidaat: Het ziet er prachtig uit! Hoe zit het precies met de servicekosten en de borgsom?
Makelaar: De borg bedraagt twee maanden kale huur. Verder hanteert de verhuurder een inkomenseis van minstens drie keer de maandhuur.
Kandidaat: Dat is geen probleem met mijn vaste arbeidscontract. Kunt u me laten weten wanneer de beslissing valt?`,
    turns: [
      { speaker: 'Makelaar', text: 'Welkom! Dit is het tweekamerappartement op de tweede verdieping. Zoals je ziet, is er veel natuurlijk lichtinval.' },
      { speaker: 'Kandidaat', text: 'Het ziet er prachtig uit! Hoe zit het precies met de servicekosten en de borgsom?' },
      { speaker: 'Makelaar', text: 'De borg bedraagt twee maanden kale huur. Verder hanteert de verhuurder een inkomenseis van minstens drie keer de maandhuur.' },
      { speaker: 'Kandidaat', text: 'Dat is geen probleem met mijn vaste arbeidscontract. Kunt u me laten weten wanneer de beslissing valt?' },
    ],
    extractedIdioms: [
      { phrase: 'kale huur', meaning: 'Base rent excluding utilities and service charges', register: 'formal' },
      { phrase: 'inkomenseis hanteren', meaning: 'To enforce a gross income requirement (typically 3-4x rent)', register: 'formal' },
      { phrase: 'hoe zit het met...', meaning: 'What is the deal/situation regarding...', register: 'informal' },
    ],
    worldContextTopic: 'Woningcrisis in de Randstad',
    source: 'curated_native',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'conv_curated_3',
    title: 'Koffieautomaat & Weekendpraatje met Collega',
    category: 'social',
    tags: ['koffie', 'weekend', 'vrijmibo', 'smalltalk', 'B1'],
    level: 'B1',
    locationOrContext: 'Kantoor Utrecht Papendorp',
    rawTranscript: `Collega: Hey! Lekker bakkie troost halen? Hoe was je weekend trouwens?
Expats: Zeker! Mijn weekend was heerlijk, we zijn naar de Keukenhof gefietst. Het weer zat gelukkig erg mee.
Collega: Wat fijn! Ga je vanmiddag trouwens ook mee naar de borrel rond half vijf?
Expats: Nou en of! Eerste rondje bitterballen is voor mij. Gezellig even bijkletsen.`,
    turns: [
      { speaker: 'Collega', text: 'Hey! Lekker bakkie troost halen? Hoe was je weekend trouwens?' },
      { speaker: 'Expats', text: 'Zeker! Mijn weekend was heerlijk, we zijn naar de Keukenhof gefietst. Het weer zat gelukkig erg mee.' },
      { speaker: 'Collega', text: 'Wat fijn! Ga je vanmiddag trouwens ook mee naar de borrel rond half vijf?' },
      { speaker: 'Expats', text: 'Nou en of! Eerste rondje bitterballen is voor mij. Gezellig even bijkletsen.' },
    ],
    extractedIdioms: [
      { phrase: 'bakkie troost', meaning: 'Colloquial term for a fresh cup of coffee', register: 'informal' },
      { phrase: 'het weer zat mee', meaning: 'The weather was favorable / cooperating', register: 'informal' },
      { phrase: 'nou en of!', meaning: 'You bet! Absolutely!', register: 'informal' },
      { phrase: 'even bijkletsen', meaning: 'Catching up casually on life and news', register: 'informal' },
    ],
    worldContextTopic: 'Nederlandse Borrel- & Koffiecultuur',
    source: 'curated_native',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'conv_curated_4',
    title: 'Telefonisch Huisartsenbezoek & Recept Vernieuwen',
    category: 'healthcare',
    tags: ['dokter', 'huisarts', 'recept', 'zorgverzekering', 'B2'],
    level: 'B2',
    locationOrContext: 'Huisartsenpraktijk Centrum Utrecht',
    rawTranscript: `Assistente: Huisartsenpraktijk De Singel, goedemorgen met Monique. Wat kan ik voor u doen?
Patiënt: Goedemorgen Monique. Ik bel om een herhaalrecept aan te vragen voor mijn inhalator, en ik heb de laatste week last van aanhoudende hoest.
Assistente: Vervelend om te horen. Heeft u ook koorts of benauwdheidsklachten?
Patiënt: Geen koorts gelukkig, maar vooral 's avonds voel ik me kortademig.
Assistente: Dan plan ik voor morgenochtend om tien uur een fysiek consult in bij dokter Van Dijk.`,
    turns: [
      { speaker: 'Assistente', text: 'Huisartsenpraktijk De Singel, goedemorgen met Monique. Wat kan ik voor u doen?' },
      { speaker: 'Patiënt', text: 'Goedemorgen Monique. Ik bel om een herhaalrecept aan te vragen voor mijn inhalator, en ik heb de laatste week last van aanhoudende hoest.' },
      { speaker: 'Assistente', text: 'Vervelend om te horen. Heeft u ook koorts of benauwdheidsklachten?' },
      { speaker: 'Patiënt', text: 'Geen koorts gelukkig, maar vooral \'s avonds voel ik me kortademig.' },
      { speaker: 'Assistente', text: 'Dan plan ik voor morgenochtend om tien uur een fysiek consult in bij dokter Van Dijk.' },
    ],
    extractedIdioms: [
      { phrase: 'herhaalrecept aanvragen', meaning: 'To request a prescription refill', register: 'formal' },
      { phrase: 'last hebben van', meaning: 'To suffer from or be bothered by a physical symptom', register: 'formal' },
      { phrase: 'vervelend om te horen', meaning: 'Sorry / sympathetic to hear that', register: 'formal' },
    ],
    worldContextTopic: 'Nederlandse Gezondheidszorg & Huisarts',
    source: 'curated_native',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

// Curated live global world context topics
const INITIAL_WORLD_TOPICS: GlobalWorldTopic[] = [
  {
    id: 'topic_ns_trains',
    topicTitle: 'NS Treinstoringen & Spoorvernieuwing Randstad',
    category: 'Transport',
    summaryDutch: 'Regelmatige werkzaamheden op het traject Schiphol-Amsterdam Zuid-Utrecht Centraal. Reizigers moeten rekening houden met 15-30 minuten extra reistijd en vervangende bussen.',
    summaryEnglish: 'Frequent track maintenance on the Schiphol-Amsterdam Zuid-Utrecht line. Commuters need to anticipate 15-30 minutes extra travel time and replacement buses.',
    activeInRAG: true,
    sourceUrlOrEntity: 'ns.nl / ProRail actueel',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic_housing_market',
    topicTitle: 'Randstad Woningcrisis & Middeldure Huur',
    category: 'Society & Economy',
    summaryDutch: 'Extreme krapte op de huurmarkt in Amsterdam, Utrecht en Rotterdam. Verhuurders eisen 3x tot 4x bruto inkomen en bezichtigingen zitten binnen een uur vol.',
    summaryEnglish: 'Tight housing market across the Randstad. Landlords mandate 3-4x gross income and viewing slots book out within an hour.',
    activeInRAG: true,
    sourceUrlOrEntity: 'Funda / Pararius Market Monitor',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic_workplace_culture',
    topicTitle: 'Nederlandse Directe Communicatie & Vrijmibo',
    category: 'Workplace Culture',
    summaryDutch: 'Nederlanders waarderen eerlijkheid, open feedback ("geen blad voor de mond nemen") en het poldermodel (consensus). De vrijdagmiddagborrel (vrijmibo) is cruciaal voor teambinding.',
    summaryEnglish: 'Dutch colleagues value directness, constructive feedback, and the consensus model. The Friday afternoon drinks (vrijmibo) are key for bonding.',
    activeInRAG: true,
    sourceUrlOrEntity: 'Dutch Tech Workplace Insights',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic_dutch_weather',
    topicTitle: 'Wisselvallig Weer, Regen & Tegenwind op de Fiets',
    category: 'Daily Life',
    summaryDutch: 'Hét universele gespreksonderwerp bij de koffieautomaat: buienradar checken, harde tegenwind op de fietsbrug ("storm tegen"), en blij zijn als het zonnetje doorkomt.',
    summaryEnglish: 'The universal small-talk topic at coffee machines: checking Buienradar, battling severe headwind while cycling, and praising brief sunshine.',
    activeInRAG: true,
    sourceUrlOrEntity: 'KNMI & Buienradar',
    updatedAt: new Date().toISOString(),
  },
];

export class RAGKnowledgeBaseService {
  private conversations: Map<string, RealtimeConversationRecord> = new Map();
  private worldTopics: Map<string, GlobalWorldTopic> = new Map();

  constructor() {
    // Seed in-memory store
    for (const conv of INITIAL_CONVERSATIONS) {
      this.conversations.set(conv.id, {
        ...conv,
        embedding: this.generateLexicalVector(conv.rawTranscript + ' ' + conv.title),
      });
    }

    for (const topic of INITIAL_WORLD_TOPICS) {
      this.worldTopics.set(topic.id, topic);
    }
  }

  private getAiClient(): GoogleGenAI | null {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey || rawKey === 'your_gemini_api_key_here' || rawKey.trim() === '') {
      return null;
    }
    return new GoogleGenAI({
      apiKey: rawKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  /**
   * Fast high-dimensional lexical-semantic vector hashing fallback
   * Creates a normalized 64-dimensional float vector based on character n-grams and Dutch tokens
   */
  private generateLexicalVector(text: string): number[] {
    const dim = 64;
    const vector = new Array(dim).fill(0);
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let hash = 0;
      for (let j = 0; j < token.length; j++) {
        hash = (hash << 5) - hash + token.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dim;
      vector[idx] += 1;

      // Bi-gram hashing
      if (i > 0) {
        const bigram = `${tokens[i - 1]}_${token}`;
        let biHash = 0;
        for (let j = 0; j < bigram.length; j++) {
          biHash = (biHash << 5) - biHash + bigram.charCodeAt(j);
          biHash |= 0;
        }
        vector[Math.abs(biHash) % dim] += 1.5;
      }
    }

    // Normalize vector (L2 norm)
    let sumSq = 0;
    for (let i = 0; i < dim; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq) || 1;
    return vector.map((v) => v / norm);
  }

  /**
   * Generates embedding via Gemini Embedding API or robust lexical vector fallback
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const aiClient = this.getAiClient();
    if (aiClient) {
      try {
        const response = await aiClient.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text,
        });
        const anyResp = response as any;
        if (anyResp.embedding?.values && anyResp.embedding.values.length > 0) {
          return anyResp.embedding.values;
        }
        if (anyResp.embeddings?.[0]?.values && anyResp.embeddings[0].values.length > 0) {
          return anyResp.embeddings[0].values;
        }
      } catch (err) {
        logger.warn('Gemini embedding API fallback to lexical vector', { err: String(err) });
      }
    }
    return this.generateLexicalVector(text);
  }

  /**
   * Cosine similarity between two float vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB) return 0;
    const minLen = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLen; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Extracts Dutch idioms from conversation text using Gemini or lexical heuristics
   */
  public async extractIdioms(text: string): Promise<DutchIdiom[]> {
    const aiClient = this.getAiClient();
    if (aiClient) {
      try {
        const prompt = `You are an expert Dutch linguist. Read the following real Dutch conversation text and extract 2-4 authentic Dutch idioms, colloquial phrasings, or workplace expressions used (e.g., 'even kortsluiten', 'bakkie troost', 'ergens over sparren', 'schouders eronder', 'nou en of').
Return JSON format:
[
  { "phrase": "exact dutch idiom", "meaning": "English explanation", "register": "workplace" | "informal" | "formal" | "slang" }
]

Conversation:
"${text}"`;

        const res = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (res.text) {
          const parsed = JSON.parse(res.text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        logger.warn('Failed AI idiom extraction, using rule-based heuristics', { err: String(err) });
      }
    }

    // Rule-based fallback idioms
    const knownIdioms: DutchIdiom[] = [
      { phrase: 'even kortsluiten', meaning: 'To quickly align or coordinate', register: 'workplace' },
      { phrase: 'sparren over', meaning: 'To brainstorm together', register: 'workplace' },
      { phrase: 'bakkie doen', meaning: 'To grab a coffee and chat', register: 'informal' },
      { phrase: 'de schouders eronder', meaning: 'To commit and work hard together', register: 'informal' },
      { phrase: 'geen probleem', meaning: 'No problem at all', register: 'informal' },
      { phrase: 'hoe zit het met', meaning: 'What is the deal regarding', register: 'informal' },
    ];

    const lower = text.toLowerCase();
    const matches = knownIdioms.filter((i) => lower.includes(i.phrase.toLowerCase()));
    return matches.length > 0 ? matches : [knownIdioms[0]];
  }

  /**
   * Adds a new recorded or uploaded conversation into the knowledge base
   */
  public async addConversationRecord(
    input: Partial<RealtimeConversationRecord> & { rawTranscript: string }
  ): Promise<RealtimeConversationRecord> {
    const id = input.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawTranscript = input.rawTranscript.trim();

    // Generate turns if not provided
    let turns = input.turns || [];
    if (turns.length === 0) {
      const lines = rawTranscript.split('\n').filter(Boolean);
      turns = lines.map((line) => {
        const parts = line.split(':');
        if (parts.length > 1) {
          return {
            speaker: parts[0].trim(),
            text: parts.slice(1).join(':').trim(),
          };
        }
        return {
          speaker: 'Spreker',
          text: line.trim(),
        };
      });
    }

    // Extract idioms
    const extractedIdioms = input.extractedIdioms || (await this.extractIdioms(rawTranscript));

    // Generate embedding
    const embedding = await this.generateEmbedding(
      `${input.title || ''} ${input.category || ''} ${rawTranscript}`
    );

    const record: RealtimeConversationRecord = {
      id,
      title: input.title || `Opgenomen Gesprek (${new Date().toLocaleDateString('nl-NL')})`,
      category: input.category || 'workplace',
      tags: input.tags || ['opname', 'realtime', 'B2'],
      level: input.level || 'B2',
      turns,
      rawTranscript,
      extractedIdioms,
      worldContextTopic: input.worldContextTopic || 'Algemeen Nederlands Kantoor & Samenleving',
      embedding,
      source: input.source || 'live_recorded',
      locationOrContext: input.locationOrContext || 'Nederland (Realtime Opname)',
      createdAt: new Date().toISOString(),
    };

    this.conversations.set(id, record);
    logger.info('Added new conversation record to RAG Knowledge Base', {
      id,
      title: record.title,
      turnsCount: record.turns.length,
      idiomsCount: record.extractedIdioms.length,
    });

    return record;
  }

  /**
   * Search knowledge base using hybrid semantic vector and entity/keyword matching
   */
  public async searchKnowledgeBase(
    query: string,
    topK = 5,
    categoryFilter?: string
  ): Promise<RAGSearchMatch[]> {
    if (!query || !query.trim()) return [];

    const queryLower = query.toLowerCase().trim();
    const queryTokens = queryLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const queryEmbedding = await this.generateEmbedding(query);
    const matches: RAGSearchMatch[] = [];

    for (const record of this.conversations.values()) {
      let similarity = 0;
      if (record.embedding && record.embedding.length > 0) {
        similarity = this.cosineSimilarity(queryEmbedding, record.embedding);
      } else {
        // Simple token overlap fallback
        const rWords = record.rawTranscript.toLowerCase().split(/\s+/);
        const overlap = queryTokens.filter((w) => rWords.includes(w)).length;
        similarity = Math.min(1, overlap / Math.max(1, queryTokens.length));
      }

      // Keyword & Entity boosting (e.g. title, speakers, tags, locations)
      const recordTitleLower = record.title.toLowerCase();
      const recordTextLower = record.rawTranscript.toLowerCase();
      const recordLocationLower = (record.locationOrContext || '').toLowerCase();
      const recordTagsLower = (record.tags || []).map((t) => t.toLowerCase());

      let entityMatchBonus = 0;
      for (const token of queryTokens) {
        if (recordTitleLower.includes(token)) entityMatchBonus += 0.35;
        if (recordLocationLower.includes(token)) entityMatchBonus += 0.25;
        if (recordTagsLower.some((t) => t.includes(token))) entityMatchBonus += 0.3;
        if (recordTextLower.includes(token)) entityMatchBonus += 0.15;
      }

      // Check speaker names
      for (const turn of record.turns) {
        const speakerLower = turn.speaker.toLowerCase();
        for (const token of queryTokens) {
          if (speakerLower.includes(token)) {
            entityMatchBonus += 0.35;
            break;
          }
        }
      }

      // Boost user-created or live-recorded items slightly for recency
      if (record.source === 'live_recorded') {
        entityMatchBonus += 0.1;
      }

      // Category matching preference (soft boost rather than hard filter)
      if (categoryFilter && categoryFilter !== 'all' && record.category === categoryFilter) {
        entityMatchBonus += 0.1;
      }

      similarity = Math.min(0.99, similarity + entityMatchBonus);

      // Find the most relevant turn
      let bestTurn = record.turns[0]?.text || record.rawTranscript.slice(0, 150);
      let bestSpeaker = record.turns[0]?.speaker || 'Spreker';
      let highestTurnScore = 0;

      for (const turn of record.turns) {
        const tWords = turn.text.toLowerCase().split(/\s+/);
        let turnScore = 0;
        for (const qWord of queryTokens) {
          if (tWords.includes(qWord)) turnScore += 1;
        }
        if (turnScore > highestTurnScore) {
          highestTurnScore = turnScore;
          bestTurn = turn.text;
          bestSpeaker = turn.speaker;
        }
      }

      matches.push({
        recordId: record.id,
        title: record.title,
        category: record.category,
        similarity: Math.round(similarity * 100) / 100,
        matchedTurn: bestTurn,
        speaker: bestSpeaker,
        extractedIdioms: record.extractedIdioms,
        locationOrContext: record.locationOrContext,
      });
    }

    // Sort descending by similarity score
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Formats RAG-augmented context specifically to inject into the Gemini Dutch Tutor prompt
   */
  public async getRagAugmentedContext(
    userText: string,
    category?: string
  ): Promise<{
    relevantSnippets: { speaker: string; text: string; context: string; title: string; recordId: string }[];
    authenticIdioms: DutchIdiom[];
    globalWorldFacts: string[];
    recentKnowledgeCatalog: string[];
    allRecordsBrief: { id: string; title: string; summary: string; extractedPhrases: string[] }[];
  }> {
    // Search top matches without strict category exclusion so tutor knows cross-domain info
    const matches = await this.searchKnowledgeBase(userText, 4, category);

    const relevantSnippets = matches
      .filter((m) => m.similarity > 0.05)
      .map((m) => ({
        recordId: m.recordId,
        title: m.title,
        speaker: m.speaker,
        text: m.matchedTurn,
        context: `${m.title} (${m.locationOrContext || m.category})`,
      }));

    // Gather unique idioms from matches and all records
    const idiomsMap = new Map<string, DutchIdiom>();
    for (const m of matches) {
      for (const idiom of m.extractedIdioms) {
        idiomsMap.set(idiom.phrase, idiom);
      }
    }
    // Also include high-value workplace idioms
    for (const rec of this.conversations.values()) {
      for (const idiom of rec.extractedIdioms) {
        if (!idiomsMap.has(idiom.phrase)) {
          idiomsMap.set(idiom.phrase, idiom);
        }
      }
    }

    // Gather active global world context facts
    const activeWorldTopics = Array.from(this.worldTopics.values()).filter((t) => t.activeInRAG);
    const globalWorldFacts = activeWorldTopics.map(
      (t) => `• [${t.topicTitle}]: ${t.summaryDutch}`
    );

    // Build a knowledge catalog of all stored conversations so tutor is universally aware
    const recentKnowledgeCatalog: string[] = [];
    const allRecordsBrief: { id: string; title: string; summary: string; extractedPhrases: string[] }[] = [];

    const allRecords = Array.from(this.conversations.values());
    for (const rec of allRecords) {
      const summaryTurns = rec.turns.slice(0, 3).map((t) => `${t.speaker}: "${t.text}"`).join(' | ');
      recentKnowledgeCatalog.push(
        `• [${rec.title}] (${rec.category}, ${rec.locationOrContext || 'Nederland'}): ${summaryTurns}`
      );
      allRecordsBrief.push({
        id: rec.id,
        title: rec.title,
        summary: rec.rawTranscript.slice(0, 200),
        extractedPhrases: rec.extractedIdioms.map((i) => i.phrase),
      });
    }

    return {
      relevantSnippets,
      authenticIdioms: Array.from(idiomsMap.values()).slice(0, 5),
      globalWorldFacts,
      recentKnowledgeCatalog,
      allRecordsBrief,
    };
  }

  /**
   * Get all conversation records
   */
  public getAllConversations(): RealtimeConversationRecord[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get all world context topics
   */
  public getAllWorldTopics(): GlobalWorldTopic[] {
    return Array.from(this.worldTopics.values());
  }

  /**
   * Toggle a world topic active state
   */
  public toggleWorldTopic(topicId: string): boolean {
    const topic = this.worldTopics.get(topicId);
    if (topic) {
      topic.activeInRAG = !topic.activeInRAG;
      topic.updatedAt = new Date().toISOString();
      return topic.activeInRAG;
    }
    return false;
  }

  /**
   * Delete a conversation record
   */
  public deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }
}

export const ragService = new RAGKnowledgeBaseService();
