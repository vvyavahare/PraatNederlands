import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Header } from '../../../src/components/Header.tsx';
import type { User } from '../../../src/types.ts';

describe('Frontend Component Unit Tests: <Header />', () => {
  const mockUser: User = {
    id: 'usr_test_1',
    name: 'Vishal (Java Backend Engineer)',
    email: 'vishal@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    provider: 'github',
    providerId: 'gh_12345',
    level: 'B1.2',
    xp: 650,
    dailyStreak: 7,
    lastActiveDate: '2026-09-07T00:00:00Z',
    createdAt: '2026-08-01T00:00:00Z',
  };

  const defaultProps = {
    user: mockUser,
    onOpenMistakes: vi.fn(),
    onOpenVocabulary: vi.fn(),
    onOpenArchitecture: vi.fn(),
    onSwitchPersona: vi.fn(),
    onOAuthLogin: vi.fn(),
    currentView: 'chat' as const,
    onToggleView: vi.fn(),
  };

  it('should render application branding and user progress', () => {
    render(<Header {...defaultProps} />);

    // Brand check
    expect(screen.getByText('PraatNederlands')).toBeInTheDocument();
    expect(screen.getByText(/B1-B2 Dutch Mastery/i)).toBeInTheDocument();

    // User XP & Name check
    expect(screen.getByText(/650 XP/i)).toBeInTheDocument();
    expect(screen.getByText('Vishal')).toBeInTheDocument();
  });

  it('should trigger modal callbacks when navigation action buttons are clicked', () => {
    render(<Header {...defaultProps} />);

    const mistakesButton = screen.getByRole('button', { name: /Grammatica/i });
    fireEvent.click(mistakesButton);
    expect(defaultProps.onOpenMistakes).toHaveBeenCalledTimes(1);

    const vocabButton = screen.getByRole('button', { name: /Woorden/i });
    fireEvent.click(vocabButton);
    expect(defaultProps.onOpenVocabulary).toHaveBeenCalledTimes(1);

    const archButton = screen.getByRole('button', { name: /Cloud Ops/i });
    fireEvent.click(archButton);
    expect(defaultProps.onOpenArchitecture).toHaveBeenCalledTimes(1);
  });

  it('should allow toggling between Live Chat and RAG Knowledge Studio views', () => {
    render(<Header {...defaultProps} />);

    const ragViewButton = screen.getByRole('button', { name: /RAG Studio/i });
    fireEvent.click(ragViewButton);
    expect(defaultProps.onToggleView).toHaveBeenCalledWith('rag');
  });
});
