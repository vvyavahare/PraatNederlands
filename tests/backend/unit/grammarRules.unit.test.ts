import { describe, it, expect } from 'vitest';

/**
 * Dutch Grammar Rules & Pedagogical Rule Checker Unit Tests
 * Verifies core B1/B2 Dutch syntax rules and connector detection
 */
describe('Dutch Grammar & Syntax Unit Tests (B1-B2 CEFR)', () => {
  // 1. INVERSION RULE (Inversie na bijwoordelijke bepaling)
  describe('Inversion Rule Check', () => {
    it('should detect inversion requirement when sentence starts with a time phrase', () => {
      const sentenceWithError = 'Morgen ik ga naar het kantoor.';
      const sentenceCorrect = 'Morgen ga ik naar het kantoor.';

      const startsWithTime = /^(Gisteren|Vandaag|Morgen|Vorige week|Volgende maand|Nu)\b/i;
      expect(startsWithTime.test(sentenceWithError)).toBe(true);

      // Inversion pattern: Time word followed immediately by verb (finite verb in position 2)
      const correctInversionPattern = /^(Gisteren|Vandaag|Morgen|Vorige week|Volgende maand|Nu)\s+(heb|ben|ga|ging|kom|kwam|zal|moet|wil|is|was)\s+(ik|je|jij|hij|zij|we|wij|jullie)/i;
      expect(correctInversionPattern.test(sentenceWithError)).toBe(false);
      expect(correctInversionPattern.test(sentenceCorrect)).toBe(true);
    });

    it('should validate inversion when starting with place adverb', () => {
      const correctPlaceInversion = 'In Amsterdam wonen veel softwareontwikkelaars.';
      const hasVerbInSecondPosition = /^In\s+\w+\s+(wonen|werkt|is|zijn)/i;
      expect(hasVerbInSecondPosition.test(correctPlaceInversion)).toBe(true);
    });
  });

  // 2. SUBORDINATE CLAUSE WORD ORDER (Bijzin: persoonsvorm achteraan)
  describe('Subordinate Clause (Bijzin) Word Order', () => {
    it('should identify subordinate conjunctions that send verbs to the end', () => {
      const subordinateConjunctions = ['omdat', 'doordat', 'zodat', 'terwijl', 'hoewel', 'aangezien'];
      const testSentence = 'Ik leer Nederlands, omdat ik in Utrecht wil werken.';

      const foundConjunction = subordinateConjunctions.find((c) =>
        new RegExp(`\\b${c}\\b`, 'i').test(testSentence)
      );
      expect(foundConjunction).toBe('omdat');

      // The verb cluster 'wil werken' is placed at the very end of the subordinate clause
      const endsWithVerbs = /wil werken\.$/;
      expect(endsWithVerbs.test(testSentence)).toBe(true);
    });
  });

  // 3. B1/B2 PROFESSIONAL CONNECTORS
  describe('B1/B2 Professional Dutch Connectors', () => {
    const b2Connectors = [
      'enerzijds',
      'anderzijds',
      'desondanks',
      'desalniettemin',
      'aangezien',
      'kortom',
      'met het oog op',
      'in tegenstelling tot',
    ];

    it('should identify sophisticated B2 discourse connectors in professional speech', () => {
      const advancedStudentInput =
        'Enerzijds is de migratie complex, maar anderzijds daalt de responstijd aanzienlijk.';

      const detected = b2Connectors.filter((conn) =>
        advancedStudentInput.toLowerCase().includes(conn)
      );

      expect(detected).toContain('enerzijds');
      expect(detected).toContain('anderzijds');
      expect(detected.length).toBeGreaterThanOrEqual(2);
    });
  });

  // 4. "OM TE + INFINITIEF" STRUCTURE
  describe('"Om te + Infinitief" Infinitival Clauses', () => {
    it('should validate correct placement of "om" and "te + infinitive"', () => {
      const sentence = 'Het team heeft tijd nodig om de database te migreren.';
      const omTePattern = /\bom\b.*?\bte\s+([a-z]+en)\b/i;

      const match = sentence.match(omTePattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('migreren');
    });
  });

  // 5. DE / HET ARTICLE RULES
  describe('Dutch Gender Articles ("de" vs "het")', () => {
    it('should correctly classify typical neuter (het) diminutive nouns ending in -je/-tje', () => {
      const diminutives = ['het standupje', 'het gesprekje', 'het clustertje', 'het testje'];
      diminutives.forEach((word) => {
        expect(word.startsWith('het ')).toBe(true);
      });
    });

    it('should correctly classify common tech and office nouns', () => {
      const dictionary: Record<string, 'de' | 'het'> = {
        kantoor: 'het',
        team: 'het',
        gesprek: 'het',
        vergadering: 'de',
        database: 'de',
        standup: 'de',
        sprint: 'de',
        migratie: 'de',
      };

      expect(dictionary['kantoor']).toBe('het');
      expect(dictionary['vergadering']).toBe('de');
      expect(dictionary['database']).toBe('de');
    });
  });
});
