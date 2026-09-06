import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import {
  RealtimeConversationRecord,
  RealtimeConversationTurn,
  DutchIdiom,
  RAGSearchMatch,
  GlobalWorldTopic,
} from '../types/index.ts';
import { logger } from './logger.ts';

const STORE_FILE_PATH = path.join(process.cwd(), 'server', 'data', 'rag_conversations_store.json');

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

  // High-frequency Dutch stop words to avoid false positive keyword matches
  private static readonly DUTCH_STOP_WORDS = new Set([
    'de', 'het', 'een', 'der', 'des', 'den', 'van', 'in', 'op', 'te', 'naar',
    'met', 'voor', 'over', 'aan', 'bij', 'uit', 'door', 'tot', 'om', 'als',
    'dan', 'en', 'maar', 'want', 'of', 'dus', 'dat', 'die', 'dit', 'deze',
    'wat', 'wie', 'waar', 'wanneer', 'hoe', 'welk', 'welke', 'waarom',
    'is', 'was', 'zijn', 'waren', 'ben', 'bent', 'wordt', 'werd', 'worden',
    'heb', 'hebt', 'heeft', 'hadden', 'gehad', 'kan', 'kunnen', 'kon', 'konden',
    'zou', 'zouden', 'zal', 'zullen', 'moet', 'moeten', 'mocht', 'mochten',
    'ik', 'je', 'jij', 'jou', 'jouw', 'u', 'uw', 'hij', 'hem',
    'zij', 'ze', 'haar', 'we', 'wij', 'ons', 'onze', 'jullie', 'hen', 'hun',
    'weet', 'weten', 'wist', 'vertel', 'vertellen', 'zeg', 'zeggen', 'zei',
    'gezegd', 'staat', 'staan', 'kennisbank', 'gesprek', 'gesprekken', 'opname',
    'iets', 'niets', 'alles', 'veel', 'weinig', 'nog', 'al', 'ook', 'niet', 'wel'
  ]);

  // High-frequency English stop words
  private static readonly ENGLISH_STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
    'about', 'of', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'can', 'could', 'may', 'might', 'must', 'what', 'who', 'whom',
    'which', 'where', 'when', 'why', 'how', 'know', 'tell', 'say', 'said',
    'talk', 'talked', 'conversation', 'rag', 'knowledge', 'base', 'any', 'some'
  ]);

  constructor() {
    this.ensureStorageLoaded();
    for (const topic of INITIAL_WORLD_TOPICS) {
      this.worldTopics.set(topic.id, topic);
    }
  }

  /**
   * Loads persisted conversation records from disk file or initializes default seeds
   */
  private ensureStorageLoaded(): void {
    try {
      const dataDir = path.dirname(STORE_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE_PATH)) {
        const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
        const stored: RealtimeConversationRecord[] = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length > 0) {
          for (const rec of stored) {
            this.conversations.set(rec.id, rec);
          }
          logger.info(`Loaded ${stored.length} RAG conversation records from disk storage`);
          return;
        }
      }
    } catch (err) {
      logger.warn('Failed to load stored conversations from disk, seeding defaults', { err: String(err) });
    }

    // Seed defaults if no file exists
    for (const conv of INITIAL_CONVERSATIONS) {
      this.conversations.set(conv.id, {
        ...conv,
        embedding: this.generateLexicalVector(conv.rawTranscript + ' ' + conv.title),
      });
    }
    this.persistStorage();
  }

  /**
   * Persists all active conversation records to local disk
   */
  private persistStorage(): void {
    try {
      const dataDir = path.dirname(STORE_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const list = Array.from(this.conversations.values());
      fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Failed to persist RAG conversations to disk', { err: String(err) });
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
   * High-dimensional lexical-semantic vector fallback (128 dimensions)
   */
  private generateLexicalVector(text: string): number[] {
    const dim = 128;
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
      vector[Math.abs(hash) % dim] += 1;

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
   * Generates embedding via Gemini Embedding API (gemini-embedding-001 -> 3072 dimensions)
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const aiClient = this.getAiClient();
    if (aiClient) {
      const candidateModels = ['gemini-embedding-001', 'gemini-embedding-2', 'gemini-embedding-2-preview'];
      for (const model of candidateModels) {
        try {
          const response = await aiClient.models.embedContent({
            model,
            contents: text,
          });
          const anyResp = response as any;
          if (anyResp.embeddings?.[0]?.values && anyResp.embeddings[0].values.length > 0) {
            return anyResp.embeddings[0].values;
          }
          if (anyResp.embedding?.values && anyResp.embedding.values.length > 0) {
            return anyResp.embedding.values;
          }
        } catch (err) {
          // try next model
        }
      }
    }
    return this.generateLexicalVector(text);
  }

  /**
   * Cosine similarity between two float vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    if (vecA.length !== vecB.length) {
      return 0;
    }
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
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
   * Adds a new recorded or uploaded conversation into the knowledge base and persists to disk
   */
  public async addConversationRecord(
    input: Partial<RealtimeConversationRecord> & { rawTranscript: string }
  ): Promise<RealtimeConversationRecord> {
    const id = input.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawTranscript = input.rawTranscript.trim();

    // Parse dialogue turns from transcript
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

    // Generate high-dimensional vector embedding for semantic search
    const embeddingText = `${input.title || ''} ${input.locationOrContext || ''} ${rawTranscript}`;
    const embedding = await this.generateEmbedding(embeddingText);

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
    this.persistStorage();

    logger.info('Added new conversation record to RAG Knowledge Base and saved to disk', {
      id,
      title: record.title,
      turnsCount: record.turns.length,
      idiomsCount: record.extractedIdioms.length,
      embeddingDim: embedding.length,
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
    // Filter out stop words for high-signal entity matching
    const rawTokens = queryLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    const meaningfulTokens = rawTokens.filter(
      (w) => !RAGKnowledgeBaseService.DUTCH_STOP_WORDS.has(w) && !RAGKnowledgeBaseService.ENGLISH_STOP_WORDS.has(w)
    );

    // Fall back to raw tokens if all were stop words (e.g. very short query)
    const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

    const queryEmbedding = await this.generateEmbedding(query);
    const matches: RAGSearchMatch[] = [];

    for (const record of this.conversations.values()) {
      let semanticScore = 0;
      if (record.embedding && record.embedding.length > 0 && queryEmbedding.length === record.embedding.length) {
        semanticScore = this.cosineSimilarity(queryEmbedding, record.embedding);
      }

      // Keyword & Entity matching (Speakers, Title, Location, Tags, Transcript)
      const recordTitleLower = record.title.toLowerCase();
      const recordTextLower = record.rawTranscript.toLowerCase();
      const recordLocationLower = (record.locationOrContext || '').toLowerCase();
      const recordTagsLower = (record.tags || []).map((t) => t.toLowerCase());
      const speakersLower = record.turns.map((t) => t.speaker.toLowerCase());

      let entityScore = 0;
      for (const token of queryTokens) {
        // Speaker name matches receive top priority (e.g. Lars, Sanne, Mark, Klaas)
        if (speakersLower.some((s) => s.includes(token))) {
          entityScore += 0.55;
        }
        // Title matches (e.g. Booking, PostgreSQL, Gemeente, Huur)
        if (recordTitleLower.includes(token)) {
          entityScore += 0.45;
        }
        // Tags matches
        if (recordTagsLower.some((t) => t.includes(token))) {
          entityScore += 0.35;
        }
        // Location matches
        if (recordLocationLower.includes(token)) {
          entityScore += 0.30;
        }
        // Body transcript matches
        if (recordTextLower.includes(token)) {
          entityScore += 0.20;
        }
      }

      // Recency & User-Uploaded boost (+0.20 to favor live user notes/recordings)
      let userBoost = 0;
      if (record.source === 'live_recorded' || record.source === 'uploaded_transcript') {
        userBoost += 0.20;
      }

      // Category soft boost
      let categoryBoost = 0;
      if (categoryFilter && categoryFilter !== 'all' && record.category === categoryFilter) {
        categoryBoost += 0.05;
      }

      // Combined hybrid score
      let combinedScore: number;
      if (semanticScore > 0) {
        combinedScore = (semanticScore * 0.55) + (Math.min(1.0, entityScore) * 0.35) + userBoost + categoryBoost;
      } else {
        combinedScore = (Math.min(1.0, entityScore) * 0.75) + userBoost + categoryBoost;
      }

      combinedScore = Math.min(0.99, Math.max(0.01, combinedScore));

      // Find the single most relevant turn for quick quote
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
        similarity: Math.round(combinedScore * 100) / 100,
        matchedTurn: bestTurn,
        speaker: bestSpeaker,
        extractedIdioms: record.extractedIdioms,
        locationOrContext: record.locationOrContext,
        fullTranscript: record.rawTranscript,
        allSpeakers: Array.from(new Set(record.turns.map((t) => t.speaker))),
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
    relevantSnippets: {
      speaker: string;
      text: string;
      context: string;
      title: string;
      recordId: string;
      fullTranscript: string;
      allSpeakers: string[];
      extractedIdioms: DutchIdiom[];
      similarity: number;
    }[];
    authenticIdioms: DutchIdiom[];
    globalWorldFacts: string[];
    recentKnowledgeCatalog: string[];
    allRecordsBrief: { id: string; title: string; summary: string; extractedPhrases: string[]; fullTranscript: string }[];
  }> {
    // Search top matches
    const matches = await this.searchKnowledgeBase(userText, 4, category);

    const relevantSnippets = matches.map((m) => ({
      recordId: m.recordId,
      title: m.title,
      speaker: m.speaker,
      text: m.matchedTurn,
      context: `${m.title} (${m.locationOrContext || m.category})`,
      fullTranscript: m.fullTranscript || m.matchedTurn,
      allSpeakers: m.allSpeakers || [m.speaker],
      extractedIdioms: m.extractedIdioms || [],
      similarity: m.similarity,
    }));

    // Gather unique idioms from matches and all records
    const idiomsMap = new Map<string, DutchIdiom>();
    for (const m of matches) {
      for (const idiom of m.extractedIdioms) {
        idiomsMap.set(idiom.phrase, idiom);
      }
    }
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
    const allRecordsBrief: { id: string; title: string; summary: string; extractedPhrases: string[]; fullTranscript: string }[] = [];

    const allRecords = Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const rec of allRecords) {
      const speakerList = Array.from(new Set(rec.turns.map((t) => t.speaker))).join(', ');
      recentKnowledgeCatalog.push(
        `• [${rec.title}] (${rec.category}, ${rec.locationOrContext || 'Nederland'} | Sprekers: ${speakerList}): "${rec.rawTranscript.slice(0, 240).replace(/\n/g, ' ')}..."`
      );
      allRecordsBrief.push({
        id: rec.id,
        title: rec.title,
        summary: rec.rawTranscript.slice(0, 200),
        extractedPhrases: rec.extractedIdioms.map((i) => i.phrase),
        fullTranscript: rec.rawTranscript,
      });
    }

    return {
      relevantSnippets,
      authenticIdioms: Array.from(idiomsMap.values()).slice(0, 6),
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
   * Delete a conversation record and persist changes to disk
   */
  public deleteConversation(id: string): boolean {
    const deleted = this.conversations.delete(id);
    if (deleted) {
      this.persistStorage();
    }
    return deleted;
  }
}

export const ragService = new RAGKnowledgeBaseService();
