import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ScenarioSelector } from '../../../src/components/ScenarioSelector.tsx';
import type { RoleplayScenario } from '../../../src/types.ts';

describe('Frontend Component Unit Tests: <ScenarioSelector />', () => {
  const mockScenarios: RoleplayScenario[] = [
    {
      id: 'standup_tech',
      titleNl: 'Dagelijkse Standup Tech Team',
      titleEn: 'Daily Tech Standup',
      category: 'Work & Career',
      level: 'B1.2',
      icon: 'Briefcase',
      characterName: 'Sanne de Jong',
      characterRole: 'Scrum Master & Tech Lead',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      description: 'Bespreek je sprint taken, blockers en datamigraties in het Nederlands.',
      briefing: 'Bespreek met Sanne je voortgang.',
      initialMessageNl: 'Goedemorgen team! Wie wil er beginnen?',
      learningGoals: ['Inversie toepassen', 'Agile terminologie gebruiken'],
      recommendedVocab: [{ nl: 'de belemmering', en: 'blocker' }],
    },
    {
      id: 'sollicitatie',
      titleNl: 'Sollicitatiegesprek Tech Scale-up',
      titleEn: 'Job Interview (Software Engineering)',
      category: 'Work & Career',
      level: 'B2.1',
      icon: 'Building2',
      characterName: 'Bram de Vries',
      characterRole: 'Engineering Lead',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      description: 'Bespreek je technische achtergrond en microservices.',
      briefing: 'Bespreek je B2 vaardigheden.',
      initialMessageNl: 'Welkom bij ons op kantoor. Kun je jezelf voorstellen?',
      learningGoals: ['B2-connectoren gebruiken'],
      recommendedVocab: [{ nl: 'de uitdaging', en: 'challenge' }],
    },
  ];

  it('should render all scenarios with their Dutch titles and CEFR levels', () => {
    const onSelect = vi.fn();
    render(
      <ScenarioSelector
        scenarios={mockScenarios}
        selectedScenarioId="standup_tech"
        onSelectScenario={onSelect}
      />
    );

    expect(screen.getByText('Dagelijkse Standup Tech Team')).toBeInTheDocument();
    expect(screen.getByText('Sollicitatiegesprek Tech Scale-up')).toBeInTheDocument();
    expect(screen.getByText('B1.2')).toBeInTheDocument();
    expect(screen.getByText('B2.1')).toBeInTheDocument();
  });

  it('should fire onSelectScenario callback when user clicks an unselected scenario card', () => {
    const onSelect = vi.fn();
    render(
      <ScenarioSelector
        scenarios={mockScenarios}
        selectedScenarioId="standup_tech"
        onSelectScenario={onSelect}
      />
    );

    const secondScenarioCard = screen.getByText('Sollicitatiegesprek Tech Scale-up');
    fireEvent.click(secondScenarioCard.closest('div[id]') || secondScenarioCard);

    expect(onSelect).toHaveBeenCalledWith(mockScenarios[1]);
  });
});
