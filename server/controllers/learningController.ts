import { Request, Response } from 'express';
import { SCENARIOS } from '../services/scenarioData.ts';
import { postgresService } from '../services/postgresService.ts';

export const getScenarios = (req: Request, res: Response) => {
  return res.json({ scenarios: SCENARIOS });
};

export const getMistakes = async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_java_engineer_1';
  const mistakes = await postgresService.getUserMistakes(userId);
  return res.json({ mistakes });
};

export const getVocabulary = async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_java_engineer_1';
  const vocabulary = await postgresService.getUserVocabulary(userId);
  return res.json({ vocabulary });
};

export const addVocabularyWord = async (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || 'usr_java_engineer_1';
  const { dutch, english, exampleSentenceNl, exampleSentenceEn, ruleCategory } = req.body;

  if (!dutch || !english) {
    return res.status(400).json({ error: 'Dutch word and English translation required' });
  }

  const word = await postgresService.addVocabulary(userId, {
    dutch,
    english,
    exampleSentenceNl: exampleSentenceNl || '',
    exampleSentenceEn: exampleSentenceEn || '',
    ruleCategory: ruleCategory || 'vocabulary',
  });

  return res.json({ word });
};
