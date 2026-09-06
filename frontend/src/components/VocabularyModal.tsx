import React, { useState } from 'react';
import { VocabularyItem } from '../types.ts';
import { dutchSpeech } from '../lib/speech.ts';
import { BookOpen, Volume2, Plus, X, Sparkles, Check } from 'lucide-react';

interface VocabularyModalProps {
  vocabulary: VocabularyItem[];
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: { dutch: string; english: string; exampleSentenceNl: string; exampleSentenceEn: string; ruleCategory: string }) => Promise<void>;
}

export const VocabularyModal: React.FC<VocabularyModalProps> = ({
  vocabulary,
  isOpen,
  onClose,
  onAddWord,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [dutch, setDutch] = useState('');
  const [english, setEnglish] = useState('');
  const [exampleNl, setExampleNl] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [category, setCategory] = useState('vocabulary');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutch.trim() || !english.trim()) return;

    setSaving(true);
    await onAddWord({
      dutch: dutch.trim(),
      english: english.trim(),
      exampleSentenceNl: exampleNl.trim(),
      exampleSentenceEn: exampleEn.trim(),
      ruleCategory: category,
    });
    setSaving(false);
    setDutch('');
    setEnglish('');
    setExampleNl('');
    setExampleEn('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-2 text-indigo-600 shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">B1/B2 Woordenbank & Zinsstructuren</h2>
              <p className="text-xs text-slate-400">
                Spaced Repetition (SRS) geheugenkaarten voor professioneel Nederlands
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 rounded-xl bg-[#FF4F00] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#e04500] transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nieuw Woord</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Word Form (Collapsible) */}
        {showAddForm && (
          <form onSubmit={handleSubmitNew} className="border-b border-slate-200 bg-slate-50/80 p-4 sm:p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF4F00]">Nieuwe Nederlandse Woordkaart Toevoegen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nederlands woord / uitdrukking *</label>
                <input
                  type="text"
                  required
                  placeholder="bijv. desalniettemin"
                  value={dutch}
                  onChange={(e) => setDutch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00] focus:outline-none shadow-2xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Engelse vertaling *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. nevertheless / nonetheless"
                  value={english}
                  onChange={(e) => setEnglish(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00] focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Voorbeeldzin (Nederlands)</label>
                <input
                  type="text"
                  placeholder="Het regende pijpenstelen, desalniettemin ging het feest door."
                  value={exampleNl}
                  onChange={(e) => setExampleNl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00] focus:outline-none shadow-2xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Voorbeeldzin (Engels)</label>
                <input
                  type="text"
                  placeholder="It was pouring rain, nevertheless the party went ahead."
                  value={exampleEn}
                  onChange={(e) => setExampleEn(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#FF4F00] focus:ring-1 focus:ring-[#FF4F00] focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#FF4F00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e04500] disabled:opacity-50 transition shadow-xs"
              >
                {saving ? 'Opslaan...' : 'Opslaan in PostgreSQL'}
              </button>
            </div>
          </form>
        )}

        {/* Vocabulary Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-[#F8FAFC]">
          {vocabulary.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">{item.dutch}</h3>
                    <button
                      onClick={() => dutchSpeech.speakDutch(item.dutch, 0.9)}
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-[#FF4F00] hover:text-white transition"
                      title="Beluister Nederlandse uitspraak"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      SRS Niveau {item.srsLevel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#FF4F00] font-semibold">{item.english}</p>
                </div>
              </div>

              {item.exampleSentenceNl && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-200/70 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">"{item.exampleSentenceNl}"</p>
                    <button
                      onClick={() => dutchSpeech.speakDutch(item.exampleSentenceNl, 0.9)}
                      className="text-slate-400 hover:text-[#FF4F00] shrink-0"
                      title="Luister naar voorbeeldzin"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {item.exampleSentenceEn && (
                    <p className="mt-1 text-[11px] text-slate-400 italic">"{item.exampleSentenceEn}"</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-white px-6 py-3.5 flex justify-between items-center text-xs text-slate-500">
          <span>{vocabulary.length} actieve B1/B2 woordkaarten</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 transition shadow-xs"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
