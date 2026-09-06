import { Request, Response } from 'express';
import { ragService } from '../services/ragService.ts';
import { logger } from '../services/logger.ts';

export const getConversations = async (req: Request, res: Response) => {
  try {
    const list = ragService.getAllConversations();
    return res.json({
      total: list.length,
      conversations: list,
    });
  } catch (err) {
    logger.error('Failed to get RAG conversations', { error: String(err) });
    return res.status(500).json({ error: 'Failed to retrieve knowledge base conversations' });
  }
};

export const addConversation = async (req: Request, res: Response) => {
  try {
    const { title, category, tags, level, rawTranscript, turns, locationOrContext, worldContextTopic, source } = req.body;

    if (!rawTranscript || !rawTranscript.trim()) {
      return res.status(400).json({ error: 'rawTranscript is required' });
    }

    const record = await ragService.addConversationRecord({
      title,
      category,
      tags,
      level,
      rawTranscript,
      turns,
      locationOrContext,
      worldContextTopic,
      source: source || 'live_recorded',
    });

    return res.status(201).json({
      message: 'Gesprek succesvol verwerkt en toegevoegd aan de RAG vector kennisbank!',
      record,
    });
  } catch (err) {
    logger.error('Failed to ingest conversation into RAG knowledge base', { error: String(err) });
    return res.status(500).json({ error: 'Failed to process and index conversation' });
  }
};

export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = ragService.deleteConversation(id);
    if (!success) {
      return res.status(404).json({ error: 'Conversation record not found' });
    }
    return res.json({ message: 'Gesprek verwijderd uit de kennisbank' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

export const searchRAG = async (req: Request, res: Response) => {
  try {
    const { query, category, topK = 3 } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const matches = await ragService.searchKnowledgeBase(query, Number(topK) || 3, category);
    return res.json({
      query,
      matchCount: matches.length,
      matches,
    });
  } catch (err) {
    logger.error('RAG vector search failed', { error: String(err) });
    return res.status(500).json({ error: 'Failed to perform semantic search' });
  }
};

export const getWorldTopics = async (req: Request, res: Response) => {
  try {
    const topics = ragService.getAllWorldTopics();
    return res.json({ topics });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get world topics' });
  }
};

export const toggleWorldTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const active = ragService.toggleWorldTopic(id);
    return res.json({ topicId: id, activeInRAG: active });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle world topic' });
  }
};

export const getVectorDbStats = async (req: Request, res: Response) => {
  try {
    const stats = await ragService.getVectorDbStats();
    return res.json(stats);
  } catch (err) {
    logger.error('Failed to get vector database stats', { error: String(err) });
    return res.status(500).json({ error: 'Failed to fetch vector DB statistics' });
  }
};
