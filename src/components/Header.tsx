import React, { useState } from 'react';
import { User } from '../types.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import {
  Flame,
  Award,
  Server,
  BookOpen,
  CheckCircle2,
  Github,
  LogIn,
  LogOut,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onOpenMistakes: () => void;
  onOpenVocabulary: () => void;
  onOpenArchitecture: () => void;
  onSwitchPersona: (persona: 'vishal' | 'sanne' | 'lars') => void;
  onOAuthLogin: (provider: 'github' | 'google') => void;
  activeScenarioTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenMistakes,
  onOpenVocabulary,
  onOpenArchitecture,
  onSwitchPersona,
  onOAuthLogin,
}) => {
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);

  // Level thresholds
  const levelThresholds: Record<string, { current: number; max: number; label: string }> = {
    'B1.1': { current: user?.xp || 420, max: 800, label: 'B1.1 Beginner Conversational' },
    'B1.2': { current: user?.xp || 420, max: 1600, label: 'B1.2 Competent Speaker' },
    'B2.1': { current: user?.xp || 420, max: 2600, label: 'B2.1 Advanced Professional' },
    'B2.2': { current: user?.xp || 420, max: 4000, label: 'B2.2 Fluent Native Transition' },
  };

  const currentLevelInfo = levelThresholds[user?.level || 'B1.1'];
  const progressPercent = Math.min(100, Math.round(((user?.xp || 0) / (currentLevelInfo?.max || 800)) * 100));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        {/* Brand & Dutch flag badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF4F00] shadow-sm">
            <span className="text-white font-bold text-lg">P</span>
            {/* Dutch tricolor mini accent line */}
            <div className="absolute -bottom-0.5 flex h-0.5 w-5 overflow-hidden rounded-full">
              <div className="w-1/3 bg-[#ae1c28]" />
              <div className="w-1/3 bg-white" />
              <div className="w-1/3 bg-[#21468b]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                PraatNederlands <span className="text-[#FF4F00]">Pro</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              B1-B2 Dutch Mastery
            </p>
          </div>
        </div>

        {/* Gamification Counters: Multi-pill progress & Streak */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {/* Level & Segmented Pill Progress Indicator */}
          <div className="flex flex-col items-end">
            <div className="flex gap-1 mb-1">
              <div className={`w-8 sm:w-10 h-1.5 rounded-full ${progressPercent > 20 ? 'bg-[#FF4F00]' : 'bg-slate-200'}`} />
              <div className={`w-8 sm:w-10 h-1.5 rounded-full ${progressPercent > 50 ? 'bg-[#FF4F00]' : 'bg-slate-200'}`} />
              <div className={`w-8 sm:w-10 h-1.5 rounded-full ${progressPercent > 80 ? 'bg-[#FF4F00]' : 'bg-slate-200'}`} />
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              {progressPercent}% naar {user?.level === 'B2.1' ? 'B2.2' : user?.level === 'B1.2' ? 'B2.1' : 'B1.2'} ({user?.xp || 0} XP)
            </span>
          </div>

          {/* User profile preview & streak in header divider */}
          <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{user?.name?.split(' ')[0] || 'Vishal'}</p>
              <p className="text-[11px] text-green-600 font-semibold flex items-center justify-end gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {user?.dailyStreak || 5} Dagen Reeks
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {/* Mistakes review button */}
          <button
            id="btn-nav-mistakes"
            onClick={onOpenMistakes}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#FF4F00] hover:text-[#FF4F00] transition shadow-xs"
            title="Bekijk gecorrigeerde grammaticafouten"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Grammatica</span>
          </button>

          {/* Vocabulary bank button */}
          <button
            id="btn-nav-vocab"
            onClick={onOpenVocabulary}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#FF4F00] hover:text-[#FF4F00] transition shadow-xs"
            title="B1/B2 Woordenlijst & Flitskaarten"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Woorden</span>
          </button>

          {/* Cloud Architecture / Ops Inspector button */}
          <button
            id="btn-nav-architecture"
            onClick={onOpenArchitecture}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition shadow-xs"
            title="Prometheus metrics, Redis cache & Kubernetes cluster status"
          >
            <Server className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Cloud Ops</span>
          </button>

          {/* Auth & Profile dropdown */}
          <div className="relative">
            <button
              id="btn-user-profile"
              onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-800 hover:border-slate-300 transition shadow-xs"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-xs" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#FF4F00] flex items-center justify-center text-xs font-bold text-white shadow-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {authDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl text-slate-800 z-50 text-xs"
                onMouseLeave={() => setAuthDropdownOpen(false)}
              >
                <div className="border-b border-slate-100 pb-2.5 mb-2.5">
                  <p className="font-bold text-slate-900 truncate">{user?.name || 'Vishal'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || 'vishal@example.com'}</p>
                  <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    OAuth 2.0 • {user?.provider || 'GitHub'}
                  </span>
                </div>

                <p className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1.5 tracking-wider">
                  Wissel Gebruikersprofiel:
                </p>
                <div className="space-y-1 mb-3">
                  <button
                    onClick={() => {
                      onSwitchPersona('vishal');
                      setAuthDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-[11px] text-slate-700"
                  >
                    <span className="font-medium">Vishal (Java Backend)</span>
                    <span className="text-[10px] font-bold text-[#FF4F00] bg-orange-50 px-1.5 py-0.5 rounded">B1.1</span>
                  </button>
                  <button
                    onClick={() => {
                      onSwitchPersona('sanne');
                      setAuthDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-[11px] text-slate-700"
                  >
                    <span className="font-medium">Sanne (A2 Geslaagd)</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">B1.1</span>
                  </button>
                  <button
                    onClick={() => {
                      onSwitchPersona('lars');
                      setAuthDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-[11px] text-slate-700"
                  >
                    <span className="font-medium">Lars (Professional)</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">B2.1</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                  <button
                    onClick={() => {
                      onOAuthLogin('github');
                      setAuthDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>Inloggen met GitHub</span>
                  </button>
                  <button
                    onClick={() => {
                      onOAuthLogin('google');
                      setAuthDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition"
                  >
                    <LogIn className="w-3.5 h-3.5 text-rose-500" />
                    <span>Inloggen met Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
