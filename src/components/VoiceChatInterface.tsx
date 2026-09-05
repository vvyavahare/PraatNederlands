import React, { useState, useEffect, useRef } from 'react';
import { ConversationTurn, RoleplayScenario, User, GrammarCorrection } from '../types.ts';
import { dutchSpeech } from '../lib/speech.ts';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Languages,
  Zap,
  Columns,
  History,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCheck,
  BarChart2,
  X,
  Square,
  Edit3,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';

interface VoiceChatInterfaceProps {
  scenario: RoleplayScenario;
  sessionId: string;
  turns: ConversationTurn[];
  isLoading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  suggestedReplies: string[];
  user: User | null;
  onToggleMetrics?: () => void;
  isMetricsOpen?: boolean;
}

export const VoiceChatInterface: React.FC<VoiceChatInterfaceProps> = ({
  scenario,
  sessionId,
  turns,
  isLoading,
  onSendMessage,
  suggestedReplies,
  user,
  onToggleMetrics,
  isMetricsOpen,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.92);
  const [autoSpeakTutor, setAutoSpeakTutor] = useState<boolean>(true);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [currentlyPlayingTurnId, setCurrentlyPlayingTurnId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Side panel states for Expanded Grammar & Correction Studio
  const [isCorrectionsPanelOpen, setIsCorrectionsPanelOpen] = useState<boolean>(true);
  const [activeStudioTab, setActiveStudioTab] = useState<'turn' | 'session'>('turn');
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const turnsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<string>('');
  const recordingTimerRef = useRef<any>(null);

  // Auto-scroll conversation stream to latest turn
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length, isLoading]);

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Evaluated turns where tutor gave feedback or is tutor response
  const tutorTurns = turns.filter((t) => t.sender === 'tutor');
  const evaluatedTurns = turns.filter(
    (t) =>
      t.sender === 'tutor' &&
      (t.grammarStatus ||
        (t.corrections && t.corrections.length > 0) ||
        t.improvedDutch ||
        t.b2Upgrade)
  );

  const latestTutorTurn = tutorTurns.length > 0 ? tutorTurns[tutorTurns.length - 1] : null;

  // Active tutor turn in inspection studio (defaults to latest tutor turn, or first turn)
  const activeTutorTurn = selectedTurnId
    ? turns.find((t) => t.id === selectedTurnId && t.sender === 'tutor') || latestTutorTurn
    : latestTutorTurn;

  // Find corresponding student turn that was evaluated before this tutor turn
  const activeTutorIndex = activeTutorTurn
    ? turns.findIndex((t) => t.id === activeTutorTurn.id)
    : -1;
  const activeStudentTurn =
    activeTutorIndex > 0 &&
    (turns[activeTutorIndex - 1]?.sender === 'user' || turns[activeTutorIndex - 1]?.sender === 'student')
      ? turns[activeTutorIndex - 1]
      : null;

  // Index within tutor turns for navigation
  const activeNavIndex = activeTutorTurn
    ? tutorTurns.findIndex((t) => t.id === activeTutorTurn.id)
    : -1;

  // Auto-sync selected turn when a new tutor turn arrives
  useEffect(() => {
    if (latestTutorTurn) {
      setSelectedTurnId(latestTutorTurn.id);
    }
  }, [turns.length]);

  // Auto-speak latest tutor reply if autoSpeakTutor is enabled
  useEffect(() => {
    if (turns.length > 0 && autoSpeakTutor) {
      const latest = turns[turns.length - 1];
      if (latest.sender === 'tutor' && latest.id !== currentlyPlayingTurnId) {
        setCurrentlyPlayingTurnId(latest.id);
        dutchSpeech.speakDutch(latest.dutchText, speechSpeed, () => {
          setCurrentlyPlayingTurnId(null);
        });
      }
    }
  }, [turns.length]);

  // Session-wide errors list
  const allSessionCorrections = turns.flatMap((t) =>
    (t.corrections || []).map((c) => ({
      ...c,
      turnId: t.id,
      timestamp: t.timestamp,
    }))
  );

  // ===================== MANUAL RECORDING CONTROLS =====================

  const handleStartRecording = () => {
    setMicError(null);
    dutchSpeech.stopSpeaking();
    setCurrentlyPlayingTurnId(null);
    transcriptRef.current = '';
    setSpeechTranscript('');

    const started = dutchSpeech.startListening(
      (fullLiveTranscript) => {
        transcriptRef.current = fullLiveTranscript;
        setSpeechTranscript(fullLiveTranscript);
      },
      (errMsg) => {
        setIsRecording(false);
        setMicError(errMsg);
      },
      (finalTranscript) => {
        // Called when recording has been stopped
        setIsRecording(false);
      }
    );

    if (started) {
      setIsRecording(true);
    }
  };

  const handleStopAndEvaluate = async () => {
    const finalSpoken = dutchSpeech.stopListening();
    setIsRecording(false);
    const raw = (finalSpoken || transcriptRef.current || speechTranscript).trim();
    const textToSend = dutchSpeech.cleanConsecutiveDuplicates(raw);
    transcriptRef.current = '';
    setSpeechTranscript('');

    if (textToSend) {
      await onSendMessage(textToSend);
    } else {
      setMicError('Geen spraak opgevangen. Probeer opnieuw of typ je antwoord.');
    }
  };

  const handleStopAndEdit = () => {
    const finalSpoken = dutchSpeech.stopListening();
    setIsRecording(false);
    const raw = (finalSpoken || transcriptRef.current || speechTranscript).trim();
    const textToEdit = dutchSpeech.cleanConsecutiveDuplicates(raw);
    transcriptRef.current = '';
    setSpeechTranscript('');

    if (textToEdit) {
      setInputText(textToEdit);
      inputRef.current?.focus();
    }
  };

  const handleCancelRecording = () => {
    dutchSpeech.cancelListening();
    setIsRecording(false);
    transcriptRef.current = '';
    setSpeechTranscript('');
  };

  const handleToggleMic = () => {
    if (isRecording) {
      handleStopAndEvaluate();
    } else {
      handleStartRecording();
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    await onSendMessage(text);
    inputRef.current?.focus();
  };

  const handlePlayAudio = (turn: ConversationTurn) => {
    if (currentlyPlayingTurnId === turn.id) {
      dutchSpeech.stopSpeaking();
      setCurrentlyPlayingTurnId(null);
    } else {
      setCurrentlyPlayingTurnId(turn.id);
      dutchSpeech.speakDutch(turn.dutchText, speechSpeed, () => {
        setCurrentlyPlayingTurnId(null);
      });
    }
  };

  const handlePlaySentence = (text: string) => {
    dutchSpeech.speakDutch(text, speechSpeed);
  };

  const insertDutchCharacter = (char: string) => {
    setInputText((prev) => prev + char);
    inputRef.current?.focus();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <img
              src={scenario.avatar}
              alt={scenario.characterName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {scenario.characterName}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {scenario.level}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{scenario.characterRole}</p>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Toggle Translations */}
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition shadow-xs ${
              showTranslations
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
            }`}
            title="Schakel Nederlandse/Engelse vertaling in of uit"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Vertaling</span>
          </button>

          {/* Toggle Auto-Speech */}
          <button
            onClick={() => setAutoSpeakTutor(!autoSpeakTutor)}
            className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition shadow-xs ${
              autoSpeakTutor
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
            }`}
            title="Automatisch Nederlandse spraak van Bram afspelen"
          >
            {autoSpeakTutor ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Auto-audio</span>
          </button>

          {/* Speech Rate Control */}
          <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs text-slate-600 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Tempo:</span>
            <select
              value={speechSpeed}
              onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="0.8">0.8x (Rustig)</option>
              <option value="0.92">0.9x (Aanbevolen)</option>
              <option value="1.0">1.0x (Normaal)</option>
            </select>
          </div>

          {/* Side Panel Toggle Button */}
          <button
            onClick={() => setIsCorrectionsPanelOpen(!isCorrectionsPanelOpen)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition shadow-xs ${
              isCorrectionsPanelOpen
                ? 'border-[#FF4F00] bg-[#FF4F00] text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
            title="Toon of verberg Grammatica Studio"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Correctie Studio</span>
            {allSessionCorrections.length > 0 && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isCorrectionsPanelOpen ? 'bg-white text-[#FF4F00]' : 'bg-[#FF4F00] text-white'
                }`}
              >
                {allSessionCorrections.length}
              </span>
            )}
          </button>

          {/* Optional NT2 Stats toggle */}
          {onToggleMetrics && (
            <button
              onClick={onToggleMetrics}
              className={`hidden sm:flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition shadow-xs ${
                isMetricsOpen
                  ? 'border-slate-800 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
              }`}
              title="Toon of verberg NT2 statistieken sidebar"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>
          )}
        </div>
      </div>

      {/* Scenario Briefing & Goals Banner */}
      <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">
            <strong className="text-slate-700">Leerdoel:</strong> {scenario.learningGoals[0]}
          </span>
        </div>
      </div>

      {/* Main Split Layout: Speaking/Conversation Stream (Left) + Expanded Grammar Studio (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* ========================================================= */}
        {/* COLUMN 1 (LEFT): SPREEK- EN GESPREKSZONE (Active Speaker) */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
          {/* Conversation turns stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {turns.map((turn) => {
              const isUser = turn.sender === 'user' || turn.sender === 'student';
              const isPlaying = currentlyPlayingTurnId === turn.id;
              const hasEvaluation =
                turn.sender === 'tutor' &&
                (turn.grammarStatus || (turn.corrections && turn.corrections.length > 0) || turn.improvedDutch);

              return (
                <div
                  key={turn.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-2xl ${
                    isUser ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div className={`flex gap-3 max-w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar Icon */}
                    {isUser ? (
                      <div className="w-9 h-9 rounded-full bg-[#FF4F00] flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                        {user?.name?.charAt(0) || 'J'}
                      </div>
                    ) : (
                      <img
                        src={scenario.avatar}
                        alt={scenario.characterName}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-indigo-200 shadow-xs"
                      />
                    )}

                    <div className="space-y-1.5 max-w-[88%] sm:max-w-[84%]">
                      {/* Bubble Container */}
                      <div
                        className={`p-4 rounded-2xl shadow-xs transition-all ${
                          isUser
                            ? 'bg-[#FF4F00] text-white rounded-tr-none shadow-md'
                            : 'bg-slate-50 text-slate-900 rounded-tl-none border border-slate-200'
                        }`}
                      >
                        {/* Header line inside bubble */}
                        <div className="flex items-center justify-between gap-3 mb-1.5 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${isUser ? 'text-orange-100' : 'text-slate-800'}`}>
                              {isUser ? 'Jij (Nederlands)' : scenario.characterName}
                            </span>
                            {!isUser && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                • {scenario.characterRole.split(' ')[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!isUser && (
                              <button
                                onClick={() => handlePlayAudio(turn)}
                                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                                  isPlaying
                                    ? 'bg-[#FF4F00] text-white animate-pulse'
                                    : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                                title="Luister naar Nederlandse uitspraak"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>{isPlaying ? 'Aan het spreken...' : 'Luister'}</span>
                              </button>
                            )}
                            <span className={`font-mono text-[10px] ${isUser ? 'text-orange-200' : 'text-slate-400'}`}>
                              {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Spoken Text */}
                        <p
                          className={`text-sm sm:text-base leading-relaxed ${
                            isUser ? 'italic font-medium text-white' : 'font-normal text-slate-900'
                          }`}
                        >
                          {turn.dutchText}
                        </p>

                        {/* English translation for Tutor response */}
                        {!isUser && turn.englishTranslation && showTranslations && (
                          <div className="mt-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600 bg-white/60 rounded-xl p-2 font-normal">
                            <span className="font-semibold text-slate-500 mr-1.5">Engelse vertaling:</span>
                            {turn.englishTranslation}
                          </div>
                        )}
                      </div>

                      {/* Quick grammar feedback badge for student turns */}
                      {hasEvaluation && (
                        <div className="pt-0.5">
                          {turn.grammarStatus === 'perfect' ? (
                            <button
                              onClick={() => {
                                setSelectedTurnId(turn.id);
                                setIsCorrectionsPanelOpen(true);
                                setActiveStudioTab('turn');
                              }}
                              className="w-full flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs group"
                            >
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>✓ 100% Foutloos Gesproken</span>
                              </div>
                              <span className="text-[11px] text-emerald-700 font-medium group-hover:underline flex items-center gap-1">
                                Bekijk op zijpaneel <ArrowRight className="w-3 h-3" />
                              </span>
                            </button>
                          ) : turn.corrections && turn.corrections.length > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedTurnId(turn.id);
                                setIsCorrectionsPanelOpen(true);
                                setActiveStudioTab('turn');
                              }}
                              className="w-full flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition shadow-2xs group"
                            >
                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  ⚠ {turn.corrections.length} Grammaticale{' '}
                                  {turn.corrections.length === 1 ? 'Correctie' : 'Correcties'}
                                </span>
                              </div>
                              <span className="text-[11px] text-amber-800 font-medium group-hover:underline flex items-center gap-1">
                                Bekijk op zijpaneel <ArrowRight className="w-3 h-3" />
                              </span>
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Live Loading / AI Thinking Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 text-slate-400 text-xs py-2">
                <img
                  src={scenario.avatar}
                  alt={scenario.characterName}
                  className="w-8 h-8 rounded-full object-cover animate-pulse ring-2 ring-indigo-200"
                />
                <div className="flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3.5 py-1.5 shadow-xs">
                  <span className="text-slate-700 font-medium">{scenario.characterName} formuleert antwoord</span>
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF4F00] animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF4F00] animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF4F00] animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={turnsEndRef} />
          </div>

          {/* Suggested Quick Replies */}
          {suggestedReplies.length > 0 && !isLoading && !isRecording && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#FF4F00]" />
                <span>Voorgestelde antwoorden aan {scenario.characterName}:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(reply)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-[#FF4F00] hover:border-[#FF4F00] hover:text-white transition duration-150 active:scale-95 shadow-2xs"
                  >
                    "{reply}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Speaker Dock & Continuous Microphone Centerpiece */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200">
            {/* LIVE RECORDING ACTIVE STATE: USER IN TOTAL MANUAL CONTROL */}
            {isRecording ? (
              <div className="rounded-2xl border-2 border-[#FF4F00] bg-orange-50/70 p-4 shadow-md space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                    <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      ● Opname Actief ({formatTimer(recordingSeconds)})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Blijft luisteren zolang je wilt — klik op Stop wanneer je klaar bent
                  </span>
                </div>

                {/* Live accumulating transcript display */}
                <div className="rounded-xl bg-white p-3.5 border border-orange-200 shadow-inner min-h-[56px] flex items-center">
                  <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                    {speechTranscript ? (
                      `"${speechTranscript}"`
                    ) : (
                      <span className="italic text-slate-400">
                        Aan het luisteren... spreek je Nederlandse zin in. Neem gerust je tijd.
                      </span>
                    )}
                  </p>
                </div>

                {/* Action Buttons: Stop & Evaluate / Stop & Edit / Cancel */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {/* Primary Button: Stop & Send/Evaluate */}
                    <button
                      type="button"
                      onClick={handleStopAndEvaluate}
                      className="flex items-center gap-2 rounded-xl bg-[#FF4F00] hover:bg-[#e04500] text-white px-4 py-2.5 text-xs font-bold shadow-md transition active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop opname & Evalueer</span>
                    </button>

                    {/* Secondary Button: Stop & Edit text */}
                    <button
                      type="button"
                      onClick={handleStopAndEdit}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2.5 text-xs font-semibold shadow-xs transition"
                      title="Plaats de tekst in het invoerveld om eerst te bewerken"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Stop & Bewerk tekst</span>
                    </button>
                  </div>

                  {/* Cancel */}
                  <button
                    type="button"
                    onClick={handleCancelRecording}
                    className="flex items-center gap-1 rounded-xl text-slate-500 hover:text-slate-800 px-3 py-2 text-xs font-medium transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Annuleren</span>
                  </button>
                </div>
              </div>
            ) : (
              /* IDLE STATE: MICROPHONE BUTTON & TEXT INPUT */
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center justify-center h-16 relative w-full">
                  {/* Wave Visualizer bars */}
                  <div className="absolute flex items-end gap-1.5">
                    <div className="w-1 rounded-full bg-slate-200 h-2" />
                    <div className="w-1 rounded-full bg-slate-300 h-5" />
                    <div className="w-1 rounded-full bg-[#FF4F00] h-9" />
                    <div className="w-1 rounded-full bg-[#FF4F00] h-5" />
                    <div className="w-1 rounded-full bg-[#FF4F00] h-8" />
                    <div className="w-1 rounded-full bg-slate-300 h-3" />
                    <div className="w-1 rounded-full bg-slate-200 h-2" />
                  </div>

                  {/* Big Microphone Start Button */}
                  <button
                    type="button"
                    id="btn-voice-mic"
                    onClick={handleToggleMic}
                    disabled={isLoading}
                    className="z-10 w-14 h-14 rounded-full flex items-center justify-center text-white bg-[#FF4F00] hover:bg-[#e04500] transition-transform duration-200 hover:scale-105 active:scale-95 shadow-md shadow-orange-200 disabled:opacity-50"
                    title="Klik om te spreken (handmatige stop & evaluatie)"
                  >
                    <Mic className="w-7 h-7" />
                  </button>
                </div>

                <p className="text-center text-[11px] text-slate-600 mt-1 font-semibold tracking-wide">
                  Klik op de microfoon om te spreken • Blijft opnemen tot jij handmatig stopt
                </p>

                {micError && (
                  <div className="mt-2 text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg py-1 px-3 max-w-md mx-auto flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                    <span>{micError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Special Dutch Character Helpers & Text Input */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between pb-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Speciale tekens:</span>
                  {['ë', 'é', 'è', 'ij', 'ĳ', 'ï'].map((char) => (
                    <button
                      key={char}
                      onClick={() => insertDutchCharacter(char)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shadow-2xs"
                    >
                      {char}
                    </button>
                  ))}
                </div>
                <span className="hidden sm:inline text-[10px] text-slate-400">
                  Enter om te versturen
                </span>
              </div>

              <form onSubmit={handleSendText} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    id="input-dutch-message"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Typ je Nederlandse antwoord aan ${scenario.characterName}...`}
                    disabled={isRecording || isLoading}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF4F00] focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20 disabled:opacity-50 transition shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-send-message"
                  disabled={!inputText.trim() || isLoading || isRecording}
                  className="flex h-10 px-4 items-center justify-center gap-1.5 rounded-2xl bg-[#FF4F00] text-white hover:bg-[#e04500] disabled:opacity-40 disabled:hover:bg-[#FF4F00] transition active:scale-95 shadow-xs font-semibold text-xs"
                  title="Verstuur bericht"
                >
                  <span>Verstuur</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2 (RIGHT): EXPANDED LIVE GRAMMATICA & CORRECTIE STUDIO (Side Panel) */}
        {/* ========================================================================= */}
        {isCorrectionsPanelOpen && (
          <aside className="w-full lg:w-[480px] xl:w-[540px] shrink-0 flex flex-col h-full border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/80 overflow-hidden shadow-xs">
            {/* Side Panel Header */}
            <div className="border-b border-slate-200 bg-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Grammatica & Correctie Studio</h3>
                    <span className="bg-[#FF4F00]/10 text-[#FF4F00] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Antwoorden van {scenario.characterName} & woord-voor-woord analyse
                  </p>
                </div>
              </div>

              {/* Close / Minimize button */}
              <button
                onClick={() => setIsCorrectionsPanelOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Sluit paneel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Studio Navigation Tabs & Turn Selector */}
            <div className="border-b border-slate-200 bg-white/70 px-4 py-2 flex items-center justify-between gap-2">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveStudioTab('turn')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activeStudioTab === 'turn'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Gespreksbeurt</span>
                </button>
                <button
                  onClick={() => setActiveStudioTab('session')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activeStudioTab === 'session'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Sessie Fouten ({allSessionCorrections.length})</span>
                </button>
              </div>

              {/* Turn Navigator (when in 'turn' tab) */}
              {activeStudioTab === 'turn' && tutorTurns.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <button
                    onClick={() => {
                      if (activeNavIndex > 0) {
                        setSelectedTurnId(tutorTurns[activeNavIndex - 1].id);
                      }
                    }}
                    disabled={activeNavIndex <= 0}
                    className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Vorige beurt"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-[11px] font-mono">
                    {activeNavIndex + 1} / {tutorTurns.length}
                  </span>
                  <button
                    onClick={() => {
                      if (activeNavIndex < tutorTurns.length - 1) {
                        setSelectedTurnId(tutorTurns[activeNavIndex + 1].id);
                      }
                    }}
                    disabled={activeNavIndex >= tutorTurns.length - 1}
                    className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Volgende beurt"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Studio Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* TAB 1: CURRENT TURN DETAILED INSPECTION */}
              {activeStudioTab === 'turn' && (
                <>
                  {activeTutorTurn ? (
                    <>
                      {/* CARD 1: ANTWOORD VAN BRAM DE VRIES (THE TUTOR'S SPOKEN RESPONSE) */}
                      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={scenario.avatar}
                              alt={scenario.characterName}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-300 shadow-2xs"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-indigo-950">
                                  Antwoord van {scenario.characterName}
                                </span>
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.2 rounded">
                                  {scenario.characterRole.split(' ')[0]}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {new Date(activeTutorTurn.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Listen to Bram Button */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePlaySentence(activeTutorTurn.dutchText)}
                              className="flex items-center gap-1 rounded-xl bg-white border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition shadow-2xs"
                              title={`Luister naar de reactie van ${scenario.characterName}`}
                            >
                              <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Luister</span>
                            </button>
                            <button
                              onClick={() => handleCopy(activeTutorTurn.dutchText)}
                              className="p-1 rounded-xl hover:bg-white text-slate-400 hover:text-slate-700 transition"
                              title="Kopieer tekst"
                            >
                              {copiedText === activeTutorTurn.dutchText ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Bram's Dutch text */}
                        <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed bg-white/80 p-3 rounded-xl border border-indigo-100/80">
                          "{activeTutorTurn.dutchText}"
                        </p>

                        {/* English translation */}
                        {activeTutorTurn.englishTranslation && (
                          <div className="text-xs text-slate-600 bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100">
                            <span className="font-semibold text-indigo-900 mr-1.5">🇬🇧 Vertaling:</span>
                            {activeTutorTurn.englishTranslation}
                          </div>
                        )}
                      </div>

                      {/* CARD 2: STUDENT'S SPOKEN SENTENCE (IF AVAILABLE FOR THIS TURN) */}
                      {activeStudentTurn ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                            <span>Jouw Uitspraak (Wat je sprak)</span>
                            <span className="font-mono">
                              {new Date(activeStudentTurn.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base font-bold text-slate-800 italic leading-relaxed">
                            "{activeStudentTurn.dutchText}"
                          </p>
                        </div>
                      ) : (
                        /* If on Turn 0 before student speaks */
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-center space-y-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Reageer op {scenario.characterName} hierboven
                          </p>
                          <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
                            Klik op de microfoon links om je antwoord in te spreken. Je kunt zo lang spreken als je wilt en stopt handmatig wanneer je klaar bent!
                          </p>
                        </div>
                      )}

                      {/* CARD 3: GRAMMAR CORRECTNESS STATUS */}
                      {activeTutorTurn.grammarStatus === 'perfect' ? (
                        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-emerald-950">
                                100% Grammaticaal Correct!
                              </h4>
                              <p className="text-xs text-emerald-800 mt-0.5">
                                {activeTutorTurn.grammarSummary ||
                                  'Je zinsbouw, inversie en woordvolgorde kloppen helemaal.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : activeTutorTurn.grammarStatus === 'needs_improvement' ? (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                              <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-amber-950">
                                Grammaticale Aandachtspunten
                              </h4>
                              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                                {activeTutorTurn.grammarSummary}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* CARD 4: DETAILED ERROR CORRECTIONS DIFF */}
                      {activeTutorTurn.corrections && activeTutorTurn.corrections.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 px-1">
                            <span>Gedetailleerde Foutanalyse & Regels</span>
                            <span className="text-[11px] font-semibold text-amber-700">
                              {activeTutorTurn.corrections.length}{' '}
                              {activeTutorTurn.corrections.length === 1 ? 'verbetering' : 'verbeteringen'}
                            </span>
                          </div>

                          {activeTutorTurn.corrections.map((corr, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                                  {corr.ruleName || corr.category}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5">
                                  <span className="text-[10px] font-bold uppercase text-rose-500 block mb-0.5">
                                    Wat je zei:
                                  </span>
                                  <span className="line-through text-rose-700 font-mono font-medium">
                                    "{corr.original}"
                                  </span>
                                </div>

                                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
                                  <span className="text-[10px] font-bold uppercase text-emerald-600 block mb-0.5">
                                    Correct Nederlands:
                                  </span>
                                  <span className="text-emerald-800 font-mono font-bold">
                                    "{corr.corrected}"
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                <strong className="text-slate-800">Uitleg:</strong>{' '}
                                {corr.explanationNl || corr.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CARD 5: IMPROVED NATIVE REWRITING */}
                      {activeTutorTurn.improvedDutch && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                              Zo klinkt je zin vloeiend & natuurlijk:
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handlePlaySentence(activeTutorTurn.improvedDutch!)}
                                className="flex items-center gap-1 text-emerald-800 hover:text-emerald-950 text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-100/80 transition"
                                title="Luister naar vloeiende uitspraak"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Luister</span>
                              </button>
                              <button
                                onClick={() => handleCopy(activeTutorTurn.improvedDutch!)}
                                className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
                                title="Kopieer tekst"
                              >
                                {copiedText === activeTutorTurn.improvedDutch ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-800" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm sm:text-base font-bold text-emerald-950 font-serif leading-relaxed">
                            "{activeTutorTurn.improvedDutch}"
                          </p>
                        </div>
                      )}

                      {/* CARD 6: B2 LEVEL UPGRADE */}
                      {activeTutorTurn.b2Upgrade && (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-xs space-y-1.5">
                          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span>B2 Verrijking (Zakelijk & Natuurlijk)</span>
                          </div>
                          <p className="text-xs text-indigo-950 leading-relaxed">
                            {activeTutorTurn.b2Upgrade}
                          </p>
                        </div>
                      )}

                      {/* CARD 7: PRONUNCIATION TIP */}
                      {activeTutorTurn.pronunciationTip && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 flex items-center gap-3 shadow-xs">
                          <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold">Uitspraaktip:</span>{' '}
                            {activeTutorTurn.pronunciationTip}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3 my-auto">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                        <Mic className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">Klaar voor het gesprek</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        Klik op de microfoon links om te antwoorden op {scenario.characterName}.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: SESSION-WIDE ERROR LOG */}
              {activeStudioTab === 'session' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Alle Fouten in dit Gesprek ({allSessionCorrections.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {allSessionCorrections.length === 0 ? 'Geen fouten gemaakt!' : 'Overzicht per regel'}
                    </span>
                  </div>

                  {allSessionCorrections.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">Geen grammaticafouten</p>
                      <p className="text-xs text-slate-500">
                        Je hebt in deze actieve sessie nog geen fouten gemaakt. Blijf zo doorgaan!
                      </p>
                    </div>
                  ) : (
                    allSessionCorrections.map((corr, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedTurnId(corr.turnId);
                          setActiveStudioTab('turn');
                        }}
                        className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-[#FF4F00] transition cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded uppercase">
                            {corr.ruleName || corr.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(corr.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="line-through text-rose-600 font-mono font-medium">
                            "{corr.original}"
                          </span>
                          <span className="text-slate-400 font-bold">→</span>
                          <span className="text-emerald-700 font-bold font-mono">
                            "{corr.corrected}"
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {corr.explanationNl || corr.explanation}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
