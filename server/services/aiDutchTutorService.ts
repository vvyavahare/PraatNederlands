import { GoogleGenAI, Type } from '@google/genai';
import { ConversationTurn, DutchIdiom, DutchTutorResponse, GrammarCorrection, RoleplayScenario } from '../types/index.ts';
import { metricsService } from './metricsService.ts';
import { logger } from './logger.ts';
import { ragService } from './ragService.ts';

export class AiDutchTutorService {
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

  public async evaluateAndReply(
    userDutchInput: string,
    scenario: RoleplayScenario,
    conversationHistory: ConversationTurn[]
  ): Promise<DutchTutorResponse> {
    const startTime = Date.now();

    // 1. Fetch RAG-augmented context from vector knowledge base
    const ragContext = await ragService.getRagAugmentedContext(userDutchInput, scenario.category);

    // Context format for conversation turns
    const historyText = conversationHistory
      .slice(-8)
      .map((t) => `${t.sender === 'user' ? 'Student' : scenario.characterName}: ${t.dutchText}`)
      .join('\n');

    const ragContextSection = `
==================== RAG KNOWLEDGE BASE & SHARED MEMORY ====================
The user and team have recorded and uploaded authentic Dutch conversations, standups, technical briefings, and life situations into your persistent knowledge base.

MOST RELEVANT MATCHING CONVERSATIONS (Ranked by semantic vector similarity to the student's message):
${
  ragContext.relevantSnippets.length > 0
    ? ragContext.relevantSnippets
        .map(
          (s, idx) => `
[MATCH #${idx + 1} - ${Math.round(s.similarity * 100)}% Match: "${s.title}"]
Context / Location: ${s.context}
Participants: ${s.allSpeakers ? s.allSpeakers.join(', ') : s.speaker}
COMPLETE CONVERSATION DIALOGUE & TRANSCRIPT:
${s.fullTranscript || s.text}
Extracted Idioms & Phrases: ${s.extractedIdioms && s.extractedIdioms.length > 0 ? s.extractedIdioms.map((i) => `"${i.phrase}" (${i.meaning})`).join(', ') : 'Geen specifieke idiomen'}
`
        )
        .join('\n----------------------------------------\n')
    : 'No direct matching conversation for this specific query.'
}

ALL RECORDED SESSIONS IN YOUR COMPLETE KNOWLEDGE BASE CATALOG:
${ragContext.recentKnowledgeCatalog.length > 0 ? ragContext.recentKnowledgeCatalog.join('\n') : 'No prior recordings.'}

AUTHENTIC DUTCH IDIOMS & PHRASES:
${ragContext.authenticIdioms.length > 0 ? ragContext.authenticIdioms.map((i) => `• "${i.phrase}" (${i.meaning}) [Register: ${i.register}]`).join('\n') : 'None.'}

ACTIVE REAL-TIME DUTCH WORLD FACTS:
${ragContext.globalWorldFacts.length > 0 ? ragContext.globalWorldFacts.join('\n') : 'Standard Dutch environment.'}
=============================================================================
`;

    const systemPrompt = `
You are ${scenario.characterName} (${scenario.characterRole}), an engaging, native Dutch conversational tutor and dialogue partner in the Netherlands.
The user is a motivated professional (who already cleared the A2 exam) striving for conversational B1 to B2 proficiency.
Current roleplay scenario: "${scenario.titleNl}" (${scenario.titleEn}).
Context/Briefing: ${scenario.briefing}.
Target level: B1/B2.

${ragContextSection}

CRITICAL RAG KNOWLEDGE BASE & SHARED KNOWLEDGE DIRECTIVE (MANDATORY OVERRIDE):
You have direct, real-time access to the RAG Knowledge Base detailed above. It contains authentic recorded meetings, team standups (e.g. at Booking.com with Lars, Sanne, PostgreSQL datamigration, release planning), citizen registrations, and custom conversations inputted by the student.
- YOU HAVE COMPLETE, UNRESTRICTED ACCESS AND KNOWLEDGE of every fact, decision, person, and conversation in this knowledge base!
- If the student asks about ANY topic, person (e.g. Lars, Sanne, Mark, colleagues), company/organization (Booking.com, FinTech, Gemeente), technical event (PostgreSQL migration, Google Cloud Run, Kubernetes, staging latency < 50ms, release planning), or any custom note/recording:
  1. YOU MUST NEVER DEFLECT! NEVER say "Ik kan niet over andere bedrijven praten", NEVER say "Daar weet ik niets van", NEVER say "Laten we bij de rol blijven", and NEVER claim lack of knowledge!
  2. YOU MUST DIRECTLY ANSWER and confirm you know about it, quoting or using the exact details, facts, numbers, and decisions from the matched conversation in the RAG knowledge base!
     (Example: "Jazeker, ik ben daar helemaal van op de hoogte! In de standup gaf Lars inderdaad aan dat de datamigratie naar PostgreSQL succesvol is afgerond en dat de latency op de staging cluster stabiel onder de vijftig milliseconden ligt. Goed dat je dat ter sprake brengt!")
  3. Treat all RAG recordings as shared reality and memory between you and the student. Directly answer what the student asked before continuing!

YOUR PEDAGOGICAL INSTRUCTIONS:
1. Always stay in character as ${scenario.characterName} while actively coaching the student.
2. Directly answer or react to what the student just said. NEVER repeat previous replies. Move the dialogue forward realistically.
3. Formulate your spoken response in clear, authentic, natural Dutch at B1/B2 level. Keep it engaging, 2-3 sentences max, and ask a relevant question or prompt to keep the dialogue flowing naturally. Whenever relevant, naturally reference or use authentic Dutch idioms or real-time Dutch societal topics from the RAG knowledge base above.
4. METICULOUSLY EVALUATE THE STUDENT'S DUTCH GRAMMAR:
   - Analyze their sentence for grammatical accuracy:
     * Inversion / Verb-Second rule (e.g. "Gisteren ik ging" -> "Gisteren ging ik")
     * Subordinate clause word order after conjunctions ("omdat", "hoewel", "terwijl", "aangezien", "zodat", "als", "toen", "voordat") -> finite verbs and infinitives go to the end!
     * De / Het gender and adjective endings (-e or no -e)
     * Separable verbs ("opbellen", "meenemen", "inschrijven")
     * Verb conjugations, past participles, and tenses
   - grammarStatus: Set to 'perfect' if the student's message has ZERO grammatical mistakes. Set to 'needs_improvement' if there is any mistake.
   - grammarSummary: In 1-2 clear, encouraging sentences, state whether their sentence was grammatically correct or what specifically needs attention.
   - corrections: Array of detected errors. If grammarStatus is 'perfect', corrections MUST be an empty list [].
   - improvedDutch: Provide the optimal, natural, grammatically flawless version of the student's exact sentence in authentic B1/B2 Dutch.
5. Provide a "B2 Upgrade": Suggest a more sophisticated, natural Dutch idiom, connector, or phrasing (preferring idioms from the RAG knowledge base when fitting) that elevates their sentence from simple A2/B1 to polished B2 (e.g., replace "Ik denk dat" with "Ik ben van mening dat" or "Wat mij betreft", or "omdat" with "aangezien").
6. Provide a specific Pronunciation Tip for a Dutch sound present in their message or reply (e.g. 'ui' in 'huis/tuin', 'ij/ei', 'sch' in 'Scheveningen', guttural 'g', or diphthong 'eu').
7. Calculate XP earned: 15-35 XP based on sentence complexity and grammar accuracy.
8. Provide 2-3 short, natural Dutch quick reply suggestions that the student could choose to say next.
`;

    const aiClient = this.getAiClient();
    if (aiClient) {
      // Priority order: gemini-3.1-flash-lite (fastest, high availability), gemini-flash-latest, gemini-3.8-flash
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

      for (const model of candidateModels) {
        try {
          const response = await aiClient.models.generateContent({
            model,
            contents: `
Dialogue context:
${historyText || 'No prior turns.'}

Student's latest Dutch message:
"${userDutchInput}"

Evaluate and reply with strict JSON matching the schema.
`,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  grammarStatus: {
                    type: Type.STRING,
                    description: "Evaluation of the student's grammar: 'perfect' if zero errors, otherwise 'needs_improvement'.",
                  },
                  grammarSummary: {
                    type: Type.STRING,
                    description: "Clear pedagogical assessment of the student's grammar, acknowledging correctness or pinpointing errors.",
                  },
                  improvedDutch: {
                    type: Type.STRING,
                    description: "The optimal, natural, fluent version of what the student said in authentic B1/B2 Dutch.",
                  },
                  replyInDutch: {
                    type: Type.STRING,
                    description: 'Your conversational reply in authentic B1/B2 Dutch.',
                  },
                  englishTranslation: {
                    type: Type.STRING,
                    description: 'English translation of your reply for learner comprehension.',
                  },
                  corrections: {
                    type: Type.ARRAY,
                    description: 'List of grammar errors detected in the student sentence, if any.',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        original: { type: Type.STRING },
                        corrected: { type: Type.STRING },
                        category: {
                          type: Type.STRING,
                          description: 'Category: inversion, word_order, de_het, separable_verb, er_construction, vocabulary, or tense',
                        },
                        ruleName: { type: Type.STRING, description: 'Short Dutch or English grammatical rule name' },
                        explanation: { type: Type.STRING, description: 'Clear pedagogical explanation in English' },
                        explanationNl: { type: Type.STRING, description: 'Clear pedagogical explanation in Dutch' },
                      },
                      required: ['original', 'corrected', 'category', 'ruleName', 'explanation'],
                    },
                  },
                  b2Upgrade: {
                    type: Type.STRING,
                    description: 'A natural B2 upgrade or alternative way to phrase their thought.',
                  },
                  pronunciationTip: {
                    type: Type.STRING,
                    description: 'Pronunciation advice on Dutch phonemes.',
                  },
                  xpEarned: {
                    type: Type.INTEGER,
                    description: 'XP awarded (15-35)',
                  },
                  suggestedQuickReplies: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '2-3 Dutch sample phrases the user can answer with.',
                  },
                },
                required: [
                  'grammarStatus',
                  'grammarSummary',
                  'improvedDutch',
                  'replyInDutch',
                  'englishTranslation',
                  'corrections',
                  'b2Upgrade',
                  'pronunciationTip',
                  'xpEarned',
                  'suggestedQuickReplies',
                ],
              },
            },
          });

          const text = response.text?.trim();
          if (text) {
            const parsed = JSON.parse(text) as DutchTutorResponse;
            if (parsed.corrections) {
              for (const c of parsed.corrections) {
                metricsService.recordGrammarCorrection(c.category);
              }
            }
            const duration = Date.now() - startTime;
            metricsService.recordAiCall(duration, 450);
            logger.info(`AI tutor reply generated successfully via ${model} in ${duration}ms`);
            return parsed;
          }
        } catch (err) {
          logger.warn(`Gemini model ${model} request failed, attempting fallback`, { error: String(err) });
        }
      }
    }

    // High quality contextual pedagogical fallback engine
    return this.fallbackEvaluation(userDutchInput, scenario, conversationHistory, ragContext);
  }

  private fallbackEvaluation(
    userInput: string,
    scenario: RoleplayScenario,
    history: ConversationTurn[] = [],
    ragContext?: {
      relevantSnippets: { speaker: string; text: string; context: string; title: string; recordId: string }[];
      authenticIdioms: DutchIdiom[];
      globalWorldFacts: string[];
      recentKnowledgeCatalog: string[];
      allRecordsBrief: { id: string; title: string; summary: string; extractedPhrases: string[] }[];
    }
  ): DutchTutorResponse {
    const lower = userInput.toLowerCase();
    const corrections: GrammarCorrection[] = [];

    // Check inversion rule: e.g. "gisteren ik ging", "vandaag ik wil", "nu ik ben"
    const inversionRegex = /\b(gisteren|vandaag|morgen|nu|daarna|vervolgens|soms|vaak|plotseling|eigenlijk)\s+(ik|jij|je|hij|zij|ze|wij|we|jullie|u)\s+([a-z]+)/i;
    const invMatch = userInput.match(inversionRegex);
    if (invMatch) {
      const adverb = invMatch[1];
      const pronoun = invMatch[2];
      const verb = invMatch[3];
      corrections.push({
        original: `${adverb} ${pronoun} ${verb}`,
        corrected: `${adverb} ${verb} ${pronoun}`,
        category: 'inversion',
        ruleName: 'Inversie Regel (Verb-Second)',
        explanation: `When a Dutch sentence begins with an adverb or time indicator like "${adverb}", inversion occurs: the verb (${verb}) must precede the subject (${pronoun}).`,
        explanationNl: `Wanneer een zin begint met een bepaling (${adverb}), draaien onderwerp en persoonsvorm om: eerst de persoonsvorm (${verb}), dan het onderwerp (${pronoun}).`,
      });
      metricsService.recordGrammarCorrection('inversion');
    }

    // Check subordinate clause word order after 'omdat' or 'hoewel'
    const subordinateMatch = userInput.match(/\b(omdat|hoewel|terwijl|aangezien)\s+([a-z]+)\s+([a-z]+)\s+([a-z]+)\s+([a-z]+)/i);
    if (subordinateMatch && (lower.includes('omdat ik kan') || lower.includes('omdat ik moet') || lower.includes('omdat ik heb'))) {
      corrections.push({
        original: 'omdat ... [persoonsvorm in het midden]',
        corrected: 'omdat ... [persoonsvorm helemaal aan het einde]',
        category: 'word_order',
        ruleName: 'Bijzin Woordvolgorde (SOV)',
        explanation: 'In a Dutch subordinate clause introduced by "omdat", all verbs belong at the very end of the clause.',
        explanationNl: 'In een bijzin die begint met "omdat" verhuizen alle werkwoorden naar het einde van de bijzin.',
      });
      metricsService.recordGrammarCorrection('word_order');
    }

    // Check common de/het mixups
    if (lower.includes('de huis') || lower.includes('de werk') || lower.includes('de adres')) {
      corrections.push({
        original: 'de huis / werk / adres',
        corrected: 'het huis / het werk / het adres',
        category: 'de_het',
        ruleName: 'De / Het Lidwoord',
        explanation: '"Huis", "werk", en "adres" zijn onzijdige woorden en krijgen het lidwoord "het".',
        explanationNl: 'Dit zijn onzijdige zelfstandige naamwoorden (het-woorden).',
      });
      metricsService.recordGrammarCorrection('de_het');
    }

    // Contextual and dynamic response generation based on what the student actually said
    const userTurnCount = history.filter((t) => t.sender === 'user').length;
    let reply = '';
    let translation = '';
    let quickReplies: string[] = [];

    // 0. PRIORITY RAG CHECK: Did the user ask about, reference, or mention any RAG knowledge base entity?
    const queryTokens = lower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const isAskingAboutKnowledge =
      lower.includes('weet je') ||
      lower.includes('wat weet') ||
      lower.includes('wie is') ||
      lower.includes('wat is er') ||
      lower.includes('besproken') ||
      lower.includes('gebeurd') ||
      lower.includes('gehoord') ||
      lower.includes('gezegd') ||
      lower.includes('update') ||
      lower.includes('standup') ||
      lower.includes('booking') ||
      lower.includes('lars') ||
      lower.includes('sanne') ||
      lower.includes('migratie') ||
      lower.includes('database') ||
      lower.includes('postgresql') ||
      lower.includes('rag') ||
      lower.includes('kennis');

    let matchedSnippet: { speaker: string; text: string; context: string; title: string } | null = null;

    if (ragContext?.relevantSnippets && ragContext.relevantSnippets.length > 0) {
      for (const snip of ragContext.relevantSnippets) {
        const fullSnip = `${snip.title} ${snip.speaker} ${snip.text} ${snip.context}`.toLowerCase();
        if (queryTokens.some((t) => fullSnip.includes(t)) || isAskingAboutKnowledge) {
          matchedSnippet = snip;
          break;
        }
      }
      if (!matchedSnippet && isAskingAboutKnowledge) {
        matchedSnippet = ragContext.relevantSnippets[0];
      }
    }

    // Check against allRecordsBrief if still not found
    if (!matchedSnippet && ragContext?.allRecordsBrief && isAskingAboutKnowledge) {
      for (const rec of ragContext.allRecordsBrief) {
        const recText = `${rec.title} ${rec.summary}`.toLowerCase();
        if (queryTokens.some((t) => recText.includes(t))) {
          matchedSnippet = {
            speaker: 'Collega',
            title: rec.title,
            context: rec.title,
            text: rec.summary.slice(0, 160),
          };
          break;
        }
      }
    }

    if (matchedSnippet) {
      reply = `Jazeker, ik ben daar helemaal van op de hoogte! In onze recente opname/notitie over "${matchedSnippet.title}" werd besproken door ${matchedSnippet.speaker}: "${matchedSnippet.text}". Goed dat je ernaar vraagt! Hoe kunnen we hier volgens jou het beste op inspelen?`;
      translation = `Yes certainly, I am fully aware of that! In our recent recording/note about "${matchedSnippet.title}", ${matchedSnippet.speaker} discussed: "${matchedSnippet.text}". Good of you to ask! How do you think we can best act on this?`;
      quickReplies = [
        'Wat mij betreft kunnen we hier direct over sparren.',
        'Laten we de schouders eronder zetten om dit af te ronden.',
        'Ik vind dat we dit zorgvuldig moeten testen op de staging omgeving.',
      ];
    } else if (scenario.id === 'sollicitatie') {
      // Character: Bram de Vries (Engineering Manager)
      if (lower.includes('hallo') || lower.includes('hoi') || lower.includes('goedemorgen') || lower.includes('goedemiddag') || userTurnCount <= 1) {
        reply = `Goedemorgen! Aangenaam kennis te maken. Vertel me eens: wat trekt je het meest aan in onze cloud-architectuur en hoe pas je microservices toe?`;
        translation = `Good morning! Nice to meet you. Tell me: what appeals to you most in our cloud architecture and how do you apply microservices?`;
        quickReplies = [
          'Ik heb veel ervaring met schaalbare Java microservices.',
          'Ik vind de innovatieve cultuur bij FinTech Amsterdam geweldig.',
          'Wat mij betreft sluit mijn achtergrond naadloos aan bij jullie stack.',
        ];
      } else if (lower.includes('java') || lower.includes('ervaring') || lower.includes('spring') || lower.includes('tech') || lower.includes('cloud')) {
        reply = `Interessant! Wij werken hier met Kubernetes en Kafka voor hoge transactievolumes. Hoe waarborg je de datakwaliteit en monitoring in zo'n gedistribueerde omgeving?`;
        translation = `Interesting! We work here with Kubernetes and Kafka for high transaction volumes. How do you ensure data quality and monitoring in such a distributed environment?`;
        quickReplies = [
          'Wij gebruikten Prometheus en Grafana voor continue monitoring.',
          'Door middel van geautomatiseerde integratietests vangen we regressies vroeg op.',
          'In mijn vorige team hanteerden we strikte code review standaarden.',
        ];
      } else if (userTurnCount > 3) {
        reply = `Helder onderbouwd! Tot slot: hoe ga je om met meningsverschillen over architectuur binnen een multidisciplinair scrumteam?`;
        translation = `Clearly substantiated! Finally: how do you deal with architectural disagreements within a multidisciplinary scrum team?`;
        quickReplies = [
          'Ik ga altijd uit van meetbare feiten en gezamenlijk overleg.',
          'We bespreken alternatieven aan de hand van een proof-of-concept.',
          'Wat mij betreft is open communicatie de sleutel tot succes.',
        ];
      } else {
        reply = `Dank voor je toelichting! Dat sluit goed aan bij onze roadmap. Kun je een voorbeeld geven van een complexe productie-uitdaging die je hebt opgelost?`;
        translation = `Thanks for your explanation! That aligns well with our roadmap. Could you give an example of a complex production challenge you resolved?`;
        quickReplies = [
          'Jazeker, we hadden ooit te maken met een ernstig geheugenlek.',
          'Door database query-optimalisatie daalde de responstijd met 40%.',
          'Ik licht dat graag toe met een concreet projectvoorbeeld.',
        ];
      }
    } else if (lower.includes('hallo') || lower.includes('hoi') || lower.includes('goedemorgen') || lower.includes('goedemiddag')) {
      reply = `Goedendag! Welkom. Fijn dat u er bent. Waarmee kan ik u precies van dienst zijn voor ${scenario.titleNl}?`;
      translation = `Good day! Welcome. Good to have you here. How can I be of service to you regarding ${scenario.titleEn}?`;
      quickReplies = [
        'Ik kom me graag aanmelden voor mijn afspraak.',
        'Ik heb een vraag over de documenten.',
        'Zou u mij kunnen vertellen hoe de procedure werkt?',
      ];
    } else if (lower.includes('ja') || lower.includes('jazeker') || lower.includes('klopt') || lower.includes('inderdaad')) {
      reply = `Fijn dat dat in orde is! Laten we meteen naar de volgende stap kijken. Kunt u toelichten hoe u dit wilt aanpakken?`;
      translation = `Good to hear that is in order! Let's look at the next step right away. Could you elaborate on how you want to approach this?`;
      quickReplies = [
        'Wat mij betreft kunnen we direct beginnen.',
        'Ik heb hier alle benodigde formulieren bij me.',
        'Heeft u nog verdere gegevens van mij nodig?',
      ];
    } else if (lower.includes('nee') || lower.includes('niet') || lower.includes('helaas')) {
      reply = `Geen enkel probleem, dat lossen we samen op. Wat is voor u op dit moment de grootste belemmering of vraag?`;
      translation = `No problem at all, we can solve that together. What is currently your main obstacle or question?`;
      quickReplies = [
        'Ik weet niet zeker welke formulieren vereist zijn.',
        'Zou ik daar wat meer tijd voor kunnen krijgen?',
        'Wat raadt u mij in deze situatie aan?',
      ];
    } else if (userTurnCount > 2) {
      reply = `Dat is een heldere uitleg! Om dit gesprek goed af te ronden voor ${scenario.titleNl}: heeft u verder nog specifieke wensen of opmerkingen?`;
      translation = `That is a clear explanation! To wrap up this conversation for ${scenario.titleNl}: do you have any further specific requests or remarks?`;
      quickReplies = [
        'Nee, alles is volkomen duidelijk, hartelijk dank!',
        'Wanneer kan ik hierover een definitieve bevestiging verwachten?',
        'Prettige dag nog en bedankt voor uw hulp!',
      ];
    } else {
      reply = `Uitstekend verwoord! Ik begrijp uw situatie goed. Kunt u nog wat meer vertellen over de details en uw planning?`;
      translation = `Well phrased! I understand your situation well. Could you tell a bit more about the details and your schedule?`;
      quickReplies = [
        'Jazeker, ik licht dat graag nader toe.',
        'Wat mij betreft heeft dit de hoogste prioriteit.',
        'Ik wil dit zo spoedig mogelijk geregeld hebben.',
      ];
    }

    const isGrammarFlawless = corrections.length === 0;
    const grammarStatus: 'perfect' | 'needs_improvement' = isGrammarFlawless ? 'perfect' : 'needs_improvement';
    const grammarSummary = isGrammarFlawless
      ? 'Uitstekend! Je zin is grammaticaal correct. Woordvolgorde en vervoegingen kloppen.'
      : `Er ${corrections.length === 1 ? 'is 1 aandachtspunt' : `zijn ${corrections.length} aandachtspunten`} gevonden in je zinsopbouw of woordvolgorde.`;

    let improved = userInput;
    if (corrections.length > 0) {
      for (const c of corrections) {
        if (c.original && c.corrected) {
          improved = improved.replace(c.original, c.corrected);
        }
      }
    }

    return {
      grammarStatus,
      grammarSummary,
      improvedDutch: improved,
      replyInDutch: reply,
      englishTranslation: translation,
      corrections,
      b2Upgrade: 'Probeer in plaats van "Ik vind dat..." eens te beginnen met "Naar mijn mening..." of "Wat mij betreft...", dit klinkt direct een stuk professioneler op B2-niveau.',
      pronunciationTip: 'Let op de tweeklank "ui" (zoals in "huis", "tuin", "buiten"): je lippen zijn gerond alsof je "eu" zegt, terwijl je tong naar voren beweegt.',
      xpEarned: isGrammarFlawless ? 30 : 20,
      suggestedQuickReplies: quickReplies,
    };
  }
}

export const aiDutchTutorService = new AiDutchTutorService();
