import { describe, it, expect, beforeEach } from 'vitest';
import { ragService } from '../../../server/services/ragService.ts';

describe('RAG & Orama Vector Database Service Unit Tests', () => {
  beforeEach(async () => {
    // Ensure Orama engine is initialized
    await ragService.getOrInitOramaDb();
  });

  it('should expose healthy Orama Vector Database stats and schema', async () => {
    const stats = await ragService.getVectorDbStats();

    expect(stats).toBeDefined();
    expect(stats.engine).toContain('Orama Vector Database');
    expect(stats.status).toBe('HEALTHY');
    expect(stats.vectorDimensions).toBe(128);
    expect(stats.license).toContain('Apache-2.0');
    expect(stats.performance.retrievalLatency).toBeDefined();
  });

  it('should retrieve curated Dutch workplace conversations by keyword and vector search', async () => {
    const results = await ragService.searchKnowledgeBase('sparren standup sprint Zuidas', 3, 'workplace');

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const topResult = results[0];
    expect(topResult.category).toBe('workplace');
    expect(topResult.similarity).toBeGreaterThan(0);
    expect(topResult.matchedTurn).toBeDefined();
    expect(topResult.allSpeakers).toBeDefined();
    expect(topResult.allSpeakers.length).toBeGreaterThan(0);
  });

  it('should extract authentic Dutch idioms from retrieved conversations', async () => {
    const results = await ragService.searchKnowledgeBase('kortsluiten compliance', 2, 'workplace');

    expect(results.length).toBeGreaterThan(0);
    const idioms = results[0].extractedIdioms || [];
    expect(idioms.length).toBeGreaterThan(0);

    const hasKortsluiten = idioms.some((i) => i.phrase.toLowerCase().includes('kortsluiten'));
    expect(hasKortsluiten).toBe(true);
  });

  it('should support active global world topics in Dutch context', () => {
    const topics = ragService.getAllWorldTopics();

    expect(topics).toBeDefined();
    expect(topics.length).toBeGreaterThan(0);

    const firstTopic = topics[0];
    expect(firstTopic.id).toBeDefined();
    expect(firstTopic.topicTitle).toBeDefined();
    expect(firstTopic.summaryDutch).toBeDefined();
    expect(firstTopic.summaryEnglish).toBeDefined();
    expect(typeof firstTopic.activeInRAG).toBe('boolean');
  });

  it('should toggle active world topic state correctly', () => {
    const topics = ragService.getAllWorldTopics();
    const topicId = topics[0].id;
    const initialStatus = topics[0].activeInRAG;

    const updated = ragService.toggleWorldTopic(topicId);
    expect(updated).toBe(!initialStatus);

    // Revert back
    ragService.toggleWorldTopic(topicId);
  });
});
