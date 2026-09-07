import type { DutchEvaluationResponse } from '../../server/types/index.ts';

export const mockTutorResponses: Record<string, DutchEvaluationResponse> = {
  perfect: {
    dutchReply: 'Wat een uitstekend antwoord! Je gebruikt de juiste werkwoordvolgorde.',
    englishTranslation: 'What an excellent response! You use the correct word order.',
    grammarStatus: 'perfect',
    grammarSummary: 'Je zinsbouw en woordvolgorde zijn foutloos.',
    improvedDutch: 'Ik ga morgen met mijn collega sparren over de nieuwe microservice architectuur.',
    corrections: [],
    b2Upgrade: 'Tip: Je kunt "desalniettemin" of "enerzijds... anderzijds" toevoegen voor extra diepgang.',
    pronunciationTip: 'Let op de uitspraak van de harde "g" in "morgen".',
    xpEarned: 35,
    suggestedQuickReplies: [
      'Kunnen we ook kijken naar de database latency?',
      'Hoe zit het met de monitoring via Prometheus?',
      'Laten we dat even kortsluiten.',
    ],
  },
  inversionError: {
    dutchReply: 'Bijna goed! Let op de inversie als je zin begint met een bijwoordelijke bepaling van tijd.',
    englishTranslation: 'Almost correct! Note inversion when starting with a time clause.',
    grammarStatus: 'needs_improvement',
    grammarSummary: 'Inversie ontbreekt na "Morgen": het werkwoord moet vóór het onderwerp staan.',
    improvedDutch: 'Morgen ga ik naar kantoor in plaats van "Morgen ik ga naar kantoor".',
    corrections: [
      {
        original: 'Morgen ik ga',
        corrected: 'Morgen ga ik',
        rule: 'inversion',
        explanationDutch: 'Wanneer een zin begint met een tijdstip (zoals "Morgen"), wisselen onderwerp en persoonsvorm van plaats.',
        explanationEnglish: 'Inversion rule: when a sentence starts with time/place, verb precedes subject.',
      },
    ],
    b2Upgrade: 'Probeer B2 connectoren zoals "Aangezien ik morgen naar kantoor ga...".',
    pronunciationTip: 'Let op de lange "aa"-klank in "kantoor".',
    xpEarned: 15,
    suggestedQuickReplies: [
      'Ah, ik snap de inversieregel nu!',
      'Kun je nog een voorbeeld geven met inversie?',
      'Dank voor de correctie.',
    ],
  },
};
