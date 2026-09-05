import React, { useState, useEffect, useRef } from 'react';
import { User, RoleplayScenario, ConversationTurn, MistakeLogEntry, VocabularyItem } from './types.ts';
import { Header } from './components/Header.tsx';
import { ScenarioSelector } from './components/ScenarioSelector.tsx';
import { VoiceChatInterface } from './components/VoiceChatInterface.tsx';
import { MistakesReviewModal } from './components/MistakesReviewModal.tsx';
import { VocabularyModal } from './components/VocabularyModal.tsx';
import { ArchitectureModal } from './components/ArchitectureModal.tsx';
import { sounds } from './lib/audioEffects.ts';
import { AlertCircle, Sparkles, Trophy } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [scenarios, setScenarios] = useState<RoleplayScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals state
  const [isMistakesOpen, setIsMistakesOpen] = useState(false);
  const [isVocabularyOpen, setIsVocabularyOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [showMetricsSidebar, setShowMetricsSidebar] = useState(false);

  // Mistakes and Vocabulary state
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);

  // SSE EventSource ref
  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Initial Load: User, Scenarios, Mistakes, Vocabulary
  useEffect(() => {
    bootstrapApp();
  }, []);

  const bootstrapApp = async () => {
    try {
      // Fetch User
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      // Fetch Scenarios
      const scenariosRes = await fetch('/api/learning/scenarios');
      if (scenariosRes.ok) {
        const { scenarios: loadedScenarios } = await scenariosRes.json();
        setScenarios(loadedScenarios);
        if (loadedScenarios.length > 0) {
          const initial = loadedScenarios[0];
          setActiveScenario(initial);
          startConversationSession(initial.id);
        }
      }

      // Fetch Mistakes & Vocabulary
      loadMistakes();
      loadVocabulary();
    } catch (err) {
      console.error('Bootstrap error:', err);
    }
  };

  const loadMistakes = async () => {
    try {
      const res = await fetch('/api/learning/mistakes');
      if (res.ok) {
        const data = await res.json();
        setMistakes(data.mistakes || []);
      }
    } catch {}
  };

  const loadVocabulary = async () => {
    try {
      const res = await fetch('/api/learning/vocabulary');
      if (res.ok) {
        const data = await res.json();
        setVocabulary(data.vocabulary || []);
      }
    } catch {}
  };

  // 2. Start new isolated session for a scenario
  const startConversationSession = async (scenarioId: string) => {
    setIsLoading(true);
    // Close any existing SSE stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const res = await fetch('/api/conversation/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          userId: user?.id || 'usr_java_engineer_1',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session.sessionId);
        setTurns([data.initialTurn]);
        setSuggestedReplies(data.scenario.recommendedVocab?.map((v: any) => `Ik wil graag ${v.nl} bespreken`) || []);

        // Establish real-time SSE stream for this isolated session
        setupSseStream(data.session.sessionId);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupSseStream = (sessId: string) => {
    try {
      const sse = new EventSource(`/api/conversation/session/${sessId}/stream`);
      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'TUTOR_REPLY') {
            setSuggestedReplies(payload.suggestedQuickReplies || []);
            if (payload.user) setUser(payload.user);
          }
        } catch {}
      };
      eventSourceRef.current = sse;
    } catch {}
  };

  const handleSelectScenario = (scenario: RoleplayScenario) => {
    if (scenario.id === activeScenario?.id) return;
    setActiveScenario(scenario);
    startConversationSession(scenario.id);
  };

  // 3. Send message handler
  const handleSendMessage = async (text: string) => {
    if (!sessionId || !text.trim() || isLoading) return;

    // Optimistic turn addition
    const tempUserTurn: ConversationTurn = {
      id: `turn_temp_${Date.now()}`,
      sessionId,
      sender: 'user',
      dutchText: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, tempUserTurn]);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/conversation/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          userId: user?.id || 'usr_java_engineer_1',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace temp turn with actual turns from backend
        setTurns((prev) => {
          const filtered = prev.filter((t) => t.id !== tempUserTurn.id);
          return [...filtered, data.studentTurn, data.tutorTurn];
        });

        if (data.suggestedQuickReplies) {
          setSuggestedReplies(data.suggestedQuickReplies);
        }

        if (data.user) {
          const prevLevel = user?.level;
          setUser(data.user);
          if (prevLevel && data.user.level !== prevLevel) {
            sounds.triggerLevelUpConfetti();
          }
        }

        sounds.playXpChime();
        loadMistakes();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Switch persona for testing
  const handleSwitchPersona = async (persona: 'vishal' | 'sanne' | 'lars') => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (activeScenario) {
          startConversationSession(activeScenario.id);
        }
        loadMistakes();
        loadVocabulary();
      }
    } catch {}
  };

  // 5. OAuth Login handler
  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    try {
      const res = await fetch(`/api/auth/oauth/${provider}`);
      if (res.ok) {
        const data = await res.json();
        // Open OAuth popup window
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          data.authUrl,
          'oauth_popup',
          `width=${width},height=${height},top=${top},left=${left}`
        );

        // Listen for OAuth message callback
        const handleMessage = (e: MessageEvent) => {
          if (e.data?.type === 'OAUTH_SUCCESS') {
            setUser(e.data.user);
            window.removeEventListener('message', handleMessage);
            loadMistakes();
            loadVocabulary();
          }
        };
        window.addEventListener('message', handleMessage);
      }
    } catch (err) {
      console.error('OAuth trigger failed:', err);
    }
  };

  // 6. Add vocabulary card
  const handleAddVocabularyWord = async (word: {
    dutch: string;
    english: string;
    exampleSentenceNl: string;
    exampleSentenceEn: string;
    ruleCategory: string;
  }) => {
    try {
      const res = await fetch('/api/learning/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...word,
          userId: user?.id || 'usr_java_engineer_1',
        }),
      });
      if (res.ok) {
        loadVocabulary();
      }
    } catch {}
  };

  return (
    <div className="flex h-screen flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#FF4F00] selection:text-white overflow-hidden">
      {/* Top Header */}
      <Header
        user={user}
        onOpenMistakes={() => setIsMistakesOpen(true)}
        onOpenVocabulary={() => setIsVocabularyOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onSwitchPersona={handleSwitchPersona}
        onOAuthLogin={handleOAuthLogin}
        activeScenarioTitle={activeScenario?.titleNl}
      />

      {/* Main Workspace Area */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden p-3 sm:p-6 gap-4">
        {/* Scenario Carousel / Quick Selector */}
        {scenarios.length > 0 && (
          <ScenarioSelector
            scenarios={scenarios}
            selectedScenarioId={activeScenario?.id || ''}
            onSelectScenario={handleSelectScenario}
          />
        )}

        {/* Primary Workspace: Full-width Side-by-Side Voice & Grammar Studio */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Main Voice Chat & AI Grammar Lab Interface */}
          <section className="flex-1 w-full flex flex-col h-full overflow-hidden">
            {activeScenario && (
              <VoiceChatInterface
                scenario={activeScenario}
                sessionId={sessionId}
                turns={turns}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                suggestedReplies={suggestedReplies}
                user={user}
                onToggleMetrics={() => setShowMetricsSidebar(!showMetricsSidebar)}
                isMetricsOpen={showMetricsSidebar}
              />
            )}
          </section>

          {/* Performance & B2 Countdown Sidebar (Toggleable) */}
          {showMetricsSidebar && (
            <aside className="hidden xl:flex flex-col gap-6 w-80 shrink-0 h-full overflow-y-auto">
            {/* Performance Metrics Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Voortgang & Prestaties
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Actief
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-100/60">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Vloeiendheid</p>
                  <p className="text-xl font-black text-indigo-950 mt-0.5">74%</p>
                </div>
                <div
                  onClick={() => setIsMistakesOpen(true)}
                  className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-100/60 cursor-pointer hover:bg-emerald-100/80 transition shadow-2xs"
                  title="Klik om grammaticafouten te analyseren"
                >
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Grammatica</p>
                  <p className="text-xl font-black text-emerald-950 mt-0.5">{user?.level || 'B1.1'}</p>
                </div>
                <div
                  onClick={() => setIsVocabularyOpen(true)}
                  className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-100/60 cursor-pointer hover:bg-rose-100/80 transition shadow-2xs"
                  title="Klik om woordenbank te bekijken"
                >
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Woordenschat</p>
                  <p className="text-xl font-black text-rose-950 mt-0.5">{Math.max(1840, vocabulary.length * 40 + 1800)}</p>
                </div>
                <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-100/60">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Uitspraak</p>
                  <p className="text-xl font-black text-amber-950 mt-0.5">A-</p>
                </div>
              </div>
            </div>

            {/* B2 Exam Countdown & Study Tracker */}
            <div className="bg-slate-900 rounded-3xl p-6 flex-1 text-white relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Staatsexamen NT2 (B2)
                </h3>
                <div>
                  <p className="text-4xl font-light mb-1">
                    42 <span className="text-lg text-slate-500 font-normal">Dagen</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Gepland: 15 Oktober, Amsterdam DUO
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 my-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[10px] font-bold text-orange-400">
                    SP
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span>Spreken (Conversatie)</span>
                      <span className="text-[#FF4F00] font-bold">85%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-[85%] h-full bg-[#FF4F00] rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[10px] font-bold text-amber-300">
                    LE
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span>Lezen (B2 Woordenschat)</span>
                      <span className="text-amber-400 font-bold">78%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-[78%] h-full bg-[#FF4F00] rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                    LU
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span>Luisteren (Moedertaalspreker)</span>
                      <span className="text-cyan-400 font-bold">68%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-[68%] h-full bg-[#FF4F00] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Cloud Architecture telemetry peek for Vishal */}
              <button
                onClick={() => setIsArchitectureOpen(true)}
                className="w-full mt-2 rounded-2xl bg-white/10 hover:bg-white/15 px-3.5 py-2.5 text-xs text-slate-200 hover:text-white flex items-center justify-between border border-white/5 transition"
              >
                <span className="font-medium">Kubernetes & Redis Status</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  100% Up
                </span>
              </button>
            </div>
          </aside>
          )}
        </div>
      </main>

      {/* Modals */}
      <MistakesReviewModal
        isOpen={isMistakesOpen}
        onClose={() => setIsMistakesOpen(false)}
        mistakes={mistakes}
      />

      <VocabularyModal
        isOpen={isVocabularyOpen}
        onClose={() => setIsVocabularyOpen(false)}
        vocabulary={vocabulary}
        onAddWord={handleAddVocabularyWord}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
}
