import React, { useState } from 'react';
import { MistakeLogEntry } from '../types.ts';
import { CheckCircle, AlertCircle, X, Sparkles, BookOpen, Layers } from 'lucide-react';

interface MistakesReviewModalProps {
  mistakes: MistakeLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const MistakesReviewModal: React.FC<MistakesReviewModalProps> = ({
  mistakes,
  isOpen,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'Alle Fouten' },
    { id: 'inversion', label: 'Inversie (V2-regel)' },
    { id: 'word_order', label: 'Bijzin Woordvolgorde' },
    { id: 'de_het', label: 'De / Het Lidwoorden' },
    { id: 'separable_verb', label: 'Scheidbare Werkwoorden' },
    { id: 'er_construction', label: 'Er-constructies' },
  ];

  const filteredMistakes =
    selectedCategory === 'all'
      ? mistakes
      : mistakes.filter((m) => m.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-rose-600 shadow-2xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Grammatica Verbeteringen & Foutenanalyse</h2>
              <p className="text-xs text-slate-400">
                Overzicht van gedetecteerde patronen tijdens je B1-B2 gesprekken
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-white px-6 py-3 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-[#FF4F00] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]">
          {filteredMistakes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Geen fouten geregistreerd in deze categorie!</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Je beheerst deze grammaticale structuren uitstekend. Blijf oefenen in de verschillende rollenspellen om B2-niveau te consolideren.
              </p>
            </div>
          ) : (
            filteredMistakes.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2.5 text-xs">
                  <div className="rounded-xl bg-rose-50/70 border border-rose-200/80 p-3">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">
                      Oorspronkelijk:
                    </span>
                    <span className="line-through text-rose-800 font-medium">{item.original}</span>
                  </div>
                  <div className="rounded-xl bg-green-50/70 border border-green-200/80 p-3">
                    <span className="text-[10px] uppercase font-bold text-green-700 block mb-1">
                      B1/B2 Verbetering:
                    </span>
                    <span className="font-bold text-green-900">{item.corrected}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200/80 leading-relaxed">
                  💡 <strong>Uitleg:</strong> {item.explanation}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-white px-6 py-3.5 flex justify-between items-center text-xs text-slate-500">
          <span>Totaal {mistakes.length} geregistreerde leerpunten</span>
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
