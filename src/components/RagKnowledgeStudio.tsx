import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Database,
  Globe,
  Upload,
  Search,
  Trash2,
  Sparkles,
  Play,
  Square,
  RefreshCw,
  Plus,
  CheckCircle2,
  Check,
  Radio,
  FileText,
  Sliders,
  Layers,
  Cpu,
  Tag,
  Volume2,
  ArrowRight,
  Info,
  Server,
  BookOpen,
} from 'lucide-react';
import {
  RealtimeConversationRecord,
  GlobalWorldTopic,
  RAGSearchMatch,
  DutchIdiom,
} from '../types';

interface RagKnowledgeStudioProps {
  onBackToChat?: () => void;
}

// Preset authentic Dutch dialogue samples for quick testing/recording
const SAMPLE_PRESETS = [
  {
    title: 'Standup bij Booking.com Amsterdam',
    category: 'workplace' as const,
    level: 'B2' as const,
    location: 'Amsterdam Oosterdokseiland',
    tags: ['it', 'booking', 'standup', 'B2', 'microservices'],
    transcript: `Sanne: Goedemorgen team! Wie wil er vandaag aftrappen met de standup?
Lars: Ik kan wel beginnen. Ik heb gisteren de datamigratie naar de nieuwe PostgreSQL database afgerond. Er waren wat bottlenecks, maar we hebben die getackeld.
Bram: Goed werk Lars! Hoe zit het met de latency op de staging cluster?
Lars: Die ligt nu stabiel onder de vijftig milliseconden. Zullen we vanmiddag even kortsluiten over de release planning?
Sanne: Prima, laten we daar na de lunch even over sparren. Dan zetten we er samen de schouders onder.`,
  },
  {
    title: 'Baliegesprek Inschrijving Gemeente Utrecht',
    category: 'administration' as const,
    level: 'B1' as const,
    location: 'Stadskantoor Utrecht Jaarbeurs',
    tags: ['gemeente', 'bsn', 'inschrijving', 'huurcontract'],
    transcript: `Baliemedewerker: Goedemorgen meneer, welkom bij de balie Burgerzaken. Waar kan ik u mee helpen?
Burger: Goedemorgen. Ik kom me graag inschrijven op mijn nieuwe woonadres in Utrecht en mijn BSN-registratie afronden.
Baliemedewerker: Heeft u een geldig legitimatiebewijs en uw getekende huurovereenkomst bij de hand?
Burger: Jazeker, hier zijn mijn paspoort en de verhuurdersverklaring. Kunt u me vertellen hoe lang de verwerking duurt?
Baliemedewerker: Dat wordt direct in het systeem verwerkt. U ontvangt binnen vijf werkdagen uw officiële uittreksel per post.`,
  },
  {
    title: 'Vrijdagmiddagborrel (Vrijmibo) in De Pijp',
    category: 'social' as const,
    level: 'B1' as const,
    location: 'Café De Eland Amsterdam',
    tags: ['borrel', 'vrijmibo', 'bitterballen', 'weekend', 'gezellig'],
    transcript: `Collega: Zo Vishal! Laptop dicht, tijd voor een lekker koud pilsje en een portie bitterballen.
Vishal: Heerlijk idee! Het was een pittige sprint deze week, dus ik ben echt toe aan het weekend.
Collega: Wat zijn je plannen voor zaterdag? Het weer schijnt fantastisch te worden, weinig regen en zacht voor de tijd van het jaar.
Vishal: We gaan een fietstocht maken langs de Vecht. Als de wind tenminste een beetje meezit!
Collega: Proost op het weekend, geniet ervan!`,
  },
];

export const RagKnowledgeStudio: React.FC<RagKnowledgeStudioProps> = ({ onBackToChat }) => {
  // State for data from backend
  const [conversations, setConversations] = useState<RealtimeConversationRecord[]>([]);
  const [worldTopics, setWorldTopics] = useState<GlobalWorldTopic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'record' | 'library' | 'world' | 'search'>('record');

  // Recording & Transcription state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  // Form state for new conversation record
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<RealtimeConversationRecord['category']>('workplace');
  const [level, setLevel] = useState<'B1' | 'B2' | 'C1'>('B2');
  const [locationOrContext, setLocationOrContext] = useState<string>('Amsterdam Zuidas Tech Hub');
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('kantoor, B2, gesprek, sparren');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Semantic Vector Search testbench state
  const [searchQuery, setSearchQuery] = useState<string>('even kortsluiten over de sprint');
  const [searchCategory, setSearchCategory] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<RAGSearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Refs for audio & speech recognition
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Load knowledge base data from backend
  useEffect(() => {
    loadData();

    // Check Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }

    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [convRes, topicsRes] = await Promise.all([
        fetch('/api/rag/conversations'),
        fetch('/api/rag/world-topics'),
      ]);

      if (convRes.ok) {
        const convData = await convRes.json();
        setConversations(convData.conversations || []);
      }
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setWorldTopics(topicsData.topics || []);
      }
    } catch (err) {
      console.error('Failed to load RAG knowledge base from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  // Start live audio recording + Dutch speech recognition
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Audio analysis for real-time sound meter
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;
      const sourceNode = audioCtx.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      // Start duration counter
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);

      // Start Web Speech Recognition in Dutch if available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'nl-NL';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
          if (fullTranscript.trim()) {
            setRawTranscript((prev) => {
              // Append speech to transcript
              return prev ? `${prev.trim()}\nSpreker: ${fullTranscript.trim()}` : `Spreker: ${fullTranscript.trim()}`;
            });
          }
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn('Speech recognition start failed:', e);
        }
      }

      mediaRecorder.start();
      setIsRecording(true);

      if (!title) {
        setTitle(`Live Gespreksopname (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
      }
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      alert('Microfoontoegang niet beschikbaar of geweigerd. U kunt ook handmatig een transcript invoeren of een voorbeeld laden.');
    }
  };

  const handleStopRecording = () => {
    stopRecordingCleanup();
  };

  // Push new conversation to backend RAG vector knowledge base
  const handleSubmitConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawTranscript.trim()) {
      alert('Voer eerst een gespreksverslag of opname in.');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccessMsg(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/rag/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Nederlands Gesprek',
          category,
          level,
          locationOrContext,
          rawTranscript: rawTranscript.trim(),
          tags,
          source: isRecording || recordDuration > 0 ? 'live_recorded' : 'uploaded_transcript',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitSuccessMsg(`Gesprek '${data.record?.title}' succesvol geïndexeerd met ${data.record?.extractedIdioms?.length || 0} Nederlandse uitdrukkingen!`);
        // Refresh conversations list
        loadData();
        // Clear form
        setTitle('');
        setRawTranscript('');
        setRecordDuration(0);
        // Auto switch to library tab after 1.5s
        setTimeout(() => {
          setActiveTab('library');
          setSubmitSuccessMsg(null);
        }, 1800);
      } else {
        const err = await res.json();
        alert(`Fout bij toevoegen: ${err.error || 'Onbekende fout'}`);
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Kan het gesprek niet uploaden naar de backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a conversation from RAG store
  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Weet u zeker dat u dit gesprek wilt verwijderen uit de kennisbank?')) return;
    try {
      const res = await fetch(`/api/rag/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Toggle active status of a global world topic in RAG
  const handleToggleWorldTopic = async (topicId: string) => {
    try {
      const res = await fetch(`/api/rag/world-topics/${topicId}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWorldTopics((prev) =>
          prev.map((t) => (t.id === topicId ? { ...t, activeInRAG: data.activeInRAG } : t))
        );
      }
    } catch (err) {
      console.error('Toggle topic failed:', err);
    }
  };

  // Run semantic vector search test
  const handleRunSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          category: searchCategory,
          topK: 4,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.matches || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadSamplePreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setLevel(preset.level);
    setLocationOrContext(preset.location);
    setTagsInput(preset.tags.join(', '));
    setRawTranscript(preset.transcript);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-slate-50 overflow-hidden text-slate-800">
      {/* Top Banner & Navigation Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF4F00] to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">RAG Kennisbank & Live Gespreksopname</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                Vector Augmented
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Voed realtime gesprekken, Nederlandse spreektaal en actuele wereldgebeurtenissen direct aan de AI Tutor
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'record'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#FF4F00]" />
            <span>Opnemen & Toevoegen</span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'library'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Kennisbank ({conversations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('world')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'world'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Wereldcontext ({worldTopics.filter((t) => t.activeInRAG).length} Actief)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('search');
              handleRunSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'search'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-sky-600" />
            <span>Vector Zoeken</span>
          </button>
        </div>

        {onBackToChat && (
          <button
            onClick={onBackToChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-[#FF4F00] hover:text-[#FF4F00] transition"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>Terug naar AI Tutor</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* ==================== TAB 1: RECORD & INGEST ==================== */}
        {activeTab === 'record' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side: Live Recorder & Sample Presets */}
            <div className="lg:col-span-5 space-y-6">
              {/* Live Audio Recording Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-orange-50 text-[#FF4F00]">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">Live Gesprek Opnemen</h3>
                  </div>
                  {isRecording && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      REC {formatSeconds(recordDuration)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  Neem een echt gesprek op (bijvoorbeeld een meeting, borrelpraat of baliegesprek) met de microfoon. De gesproken zinnen worden automatisch getranscribeerd.
                </p>

                {/* Sound wave visualizer bar */}
                <div className="bg-slate-900 rounded-2xl p-4 mb-5 text-white flex flex-col items-center justify-center min-h-[90px] relative overflow-hidden">
                  {isRecording ? (
                    <div className="w-full flex flex-col items-center gap-2">
                      <div className="w-full flex items-center justify-center gap-1.5 h-10">
                        {Array.from({ length: 24 }).map((_, i) => {
                          const height = Math.max(
                            8,
                            Math.min(36, Math.sin(i * 0.4 + audioLevel * 0.1) * (audioLevel * 0.35) + 12)
                          );
                          return (
                            <div
                              key={i}
                              className="w-1.5 bg-[#FF4F00] rounded-full transition-all duration-75"
                              style={{ height: `${height}px` }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[11px] font-mono text-emerald-400">
                        Microfoon actief • Geluidsniveau {audioLevel}%
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 text-xs">
                      <p className="font-medium text-slate-300 mb-1">Microfoon gereed</p>
                      <p className="text-[11px] text-slate-500">Klik op Start Opname om realtime spraak op te nemen</p>
                    </div>
                  )}
                </div>

                {/* Recording Controls */}
                <div className="flex gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF4F00] text-white text-xs font-bold hover:bg-[#e04500] transition shadow-sm cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Opname (Microfoon)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm cursor-pointer"
                    >
                      <Square className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <span>Stop Opname</span>
                    </button>
                  )}
                </div>

                {speechSupported && (
                  <p className="text-[10px] text-emerald-600 font-medium mt-3 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Nederlandse Spraakherkenning (Web Speech nl-NL) actief
                  </p>
                )}
              </div>

              {/* Instant Native Dutch Dialogue Presets */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Snelle Authentieke Voorbeelden
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Geen microfoon bij de hand? Laad met 1 klik een native kantoor- of straatdialoog in:
                </p>

                <div className="space-y-2">
                  {SAMPLE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => loadSamplePreset(preset)}
                      className="w-full text-left p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-orange-50 hover:border-orange-200 transition group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#FF4F00]">
                          {preset.title}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          {preset.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{preset.location}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: Metadata Form & Push to Backend Button */}
            <div className="lg:col-span-7">
              <form
                onSubmit={handleSubmitConversation}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900">Gesprek Categoriseren & Aanbieden</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    De backend analyseert de tekst, extraheert typische uitdrukkingen en berekent vector-embeddings.
                  </p>
                </div>

                {submitSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{submitSuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Titel van het Gesprek</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="bv. Sprint Standup bij Booking.com"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Categorie</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00]"
                    >
                      <option value="workplace">Werkplek & IT Kantoor (Workplace)</option>
                      <option value="daily_life">Dagelijks Leven & Boodschappen (Daily Life)</option>
                      <option value="housing">Huurmarkt & Makelaar (Housing)</option>
                      <option value="healthcare">Zorg & Huisarts (Healthcare)</option>
                      <option value="administration">Gemeente & Overheid (Administration)</option>
                      <option value="social">Sociaal, Borrel & Koffiepraat (Social)</option>
                      <option value="news">Actuele Discussie & Nieuws (News)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Locatie / Context</label>
                    <input
                      type="text"
                      value={locationOrContext}
                      onChange={(e) => setLocationOrContext(e.target.value)}
                      placeholder="bv. Amsterdam Zuidas Tech Hub"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Doelniveau</label>
                    <div className="flex gap-2">
                      {(['B1', 'B2', 'C1'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setLevel(lvl)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                            level === lvl
                              ? 'bg-[#FF4F00] text-white border-[#FF4F00]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tags (komma-gescheiden)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="kantoor, IT, standup, B2, kortsluiten"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Gesprekstranscript (Spreeklabels & Dialogen)
                    </label>
                    <span className="text-[10px] text-slate-400">Gebruik 'Spreker: tekst' per regel</span>
                  </div>
                  <textarea
                    rows={6}
                    value={rawTranscript}
                    onChange={(e) => setRawTranscript(e.target.value)}
                    placeholder="Bram: Goedemorgen! Zullen we even kortsluiten over de sprint backlog?&#10;Sanne: Prima idee, laten we na de lunch even samen sparren."
                    required
                    className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-mono leading-relaxed focus:outline-hidden focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00]"
                  />
                </div>

                {/* Push to Backend RAG Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !rawTranscript.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF4F00] to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verwerken in Backend Vector Store...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Push naar Backend RAG Kennisbank (Genereer Embeddings & Idiomen)</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: LIBRARY / KNOWLEDGE CATALOG ==================== */}
        {activeTab === 'library' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Geïndexeerde Realtime Gesprekken</h3>
                <p className="text-xs text-slate-500">
                  {conversations.length} authentieke Nederlandse dialogen opgeslagen in de semantische vector store
                </p>
              </div>
              <button
                onClick={() => setActiveTab('record')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF4F00] text-white text-xs font-bold hover:bg-[#e04500] transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nieuw Gesprek Opnemen</span>
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#FF4F00]" />
                Kennisbank laden uit backend...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
                <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Nog geen gesprekken opgeslagen</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Neem uw eerste realtime gesprek op of laad een voorbeeld.
                </p>
                <button
                  onClick={() => setActiveTab('record')}
                  className="px-4 py-2 rounded-xl bg-[#FF4F00] text-white text-xs font-bold"
                >
                  Start Nu
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 mb-1.5">
                            {conv.category} • {conv.level}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{conv.title}</h4>
                          <p className="text-[11px] text-slate-400">{conv.locationOrContext || 'Nederland'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteConversation(conv.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                          title="Verwijder gesprek"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Conversation Turn Excerpt */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 my-3 text-[11px] text-slate-700 font-mono space-y-1">
                        {conv.turns.slice(0, 2).map((t, idx) => (
                          <p key={idx} className="truncate">
                            <span className="font-bold text-slate-900">{t.speaker}:</span> {t.text}
                          </p>
                        ))}
                        {conv.turns.length > 2 && (
                          <p className="text-[10px] text-slate-400 font-sans italic">
                            + {conv.turns.length - 2} meer dialogen in RAG index
                          </p>
                        )}
                      </div>

                      {/* Extracted Authentic Dutch Idioms */}
                      {conv.extractedIdioms && conv.extractedIdioms.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Geëxtraheerde Idiomen & Uitdrukkingen
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {conv.extractedIdioms.map((idiom, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded-lg bg-orange-50 text-orange-950 text-[10px] font-semibold border border-orange-100"
                                title={idiom.meaning}
                              >
                                "{idiom.phrase}"
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Bron: {conv.source === 'live_recorded' ? '🎙️ Live Opname' : '📄 Transcript'}</span>
                      <span>{new Date(conv.createdAt).toLocaleDateString('nl-NL')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: REALTIME GLOBAL WORLD CONTEXT ==================== */}
        {activeTab === 'world' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Actuele Nederlandse Wereldcontext & Maatschappij</h3>
              </div>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
                Deze actuele maatschappelijke thema’s worden continu meegewogen in het prompt van de AI Tutor. Hierdoor kan uw gesprekspartner realistisch reageren op de woningmarkt, treinstoringen, kantoorcultuur of het Nederlandse weer!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {worldTopics.map((topic) => (
                <div
                  key={topic.id}
                  className={`bg-white rounded-3xl p-6 border transition shadow-xs flex flex-col justify-between ${
                    topic.activeInRAG ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-1">
                          {topic.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{topic.topicTitle}</h4>
                      </div>
                      <button
                        onClick={() => handleToggleWorldTopic(topic.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                          topic.activeInRAG
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            topic.activeInRAG ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'
                          }`}
                        />
                        {topic.activeInRAG ? 'Actief in RAG' : 'Gepauzeerd'}
                      </button>
                    </div>

                    <div className="space-y-2.5 my-3">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Nederlandse Context</p>
                        <p className="text-xs text-slate-800 leading-relaxed">{topic.summaryDutch}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100/60">
                        <p className="text-[10px] font-bold uppercase text-amber-600 mb-0.5">Engelse Toelichting</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{topic.summaryEnglish}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Bron: {topic.sourceUrlOrEntity}</span>
                    <span>Bijgewerkt: {new Date(topic.updatedAt).toLocaleDateString('nl-NL')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: SEMANTIC VECTOR SEARCH EXPLORER ==================== */}
        {activeTab === 'search' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">RAG Semantische Vector Zoeker</h3>
              <p className="text-xs text-slate-500 mb-4">
                Test hoe de backend semantische overeenkomsten vindt tussen uw zoekterm en de opgenomen Nederlandse gesprekken.
              </p>

              <form onSubmit={handleRunSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Typ een Nederlandse zin of trefwoord, bv. 'kortsluiten standup' of 'trein vertraagd'..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>

                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:border-[#FF4F00]"
                >
                  <option value="all">Alle Categorieën</option>
                  <option value="workplace">Werkplek (Workplace)</option>
                  <option value="housing">Wonen (Housing)</option>
                  <option value="social">Sociaal (Social)</option>
                  <option value="healthcare">Zorg (Healthcare)</option>
                </select>

                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#FF4F00] text-white text-xs font-bold hover:bg-[#e04500] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Zoek in Vector Store</span>
                </button>
              </form>
            </div>

            {/* Results */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Gevonden Overeenkomsten ({searchResults.length})
              </h4>

              {searchResults.length === 0 && !isSearching ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
                  Geen resultaten voor deze zoekopdracht. Probeer woorden zoals "sparren", "kortsluiten", "huisarts" of "huur".
                </div>
              ) : (
                searchResults.map((match, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs hover:border-orange-200 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{match.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {match.category}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {Math.round(match.similarity * 100)}% Match
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-orange-50/50 border border-orange-100 my-2">
                      <p className="text-[11px] font-bold text-orange-950 mb-0.5">
                        Overeenkomend Gespreksdeel ({match.speaker}):
                      </p>
                      <p className="text-xs text-slate-800 italic">"{match.matchedTurn}"</p>
                    </div>

                    {match.extractedIdioms && match.extractedIdioms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {match.extractedIdioms.map((idiom, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            💡 {idiom.phrase} ({idiom.meaning})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
