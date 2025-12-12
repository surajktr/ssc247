import React, { useState } from 'react';
import { ArrowLeft, Languages, BookOpen } from 'lucide-react';
import { CurrentAffairEntry } from '../types';

interface ReadingInterfaceProps {
  entry: CurrentAffairEntry;
  onBack: () => void;
}

export const ReadingInterface: React.FC<ReadingInterfaceProps> = ({ entry, onBack }) => {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const questions = entry.questions?.questions || [];

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-white flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button 
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold text-gray-900 leading-tight line-clamp-1">
                        {entry.questions.title || "Daily Current Affairs"}
                    </h1>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Reading Mode</span>
                </div>
            </div>

            <button 
                onClick={() => setLang(prev => prev === 'en' ? 'hi' : 'en')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold hover:bg-gray-200 transition-colors"
            >
                <Languages className="w-3.5 h-3.5" />
                {lang === 'en' ? 'EN' : 'HI'}
            </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
            {questions.map((q, idx) => {
                const questionText = lang === 'en' ? q.question_en : q.question_hi;
                const explanation = lang === 'en' ? (q.explanation_en || q.extra_details) : q.explanation_hi;
                
                // Find correct answer text
                const correctOption = q.options.find(opt => opt.label.toLowerCase() === q.answer.toLowerCase());
                const answerText = correctOption ? (lang === 'en' ? correctOption.text_en : correctOption.text_hi) : q.answer;

                return (
                    <article key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-5">
                            <div className="flex gap-3 mb-4">
                                <span className="flex-shrink-0 w-6 h-6 rounded bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
                                    {idx + 1}
                                </span>
                                <h3 className={`font-bold text-gray-900 text-base sm:text-lg leading-snug ${lang === 'hi' ? 'font-serif' : ''}`}>
                                    {questionText}
                                </h3>
                            </div>

                            <div className="ml-9 mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-900">
                                <div className="flex items-start gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 flex-shrink-0 mt-0.5">Answer:</span>
                                    <p className={`font-medium text-sm sm:text-base ${lang === 'hi' ? 'font-serif' : ''}`}>
                                        {answerText}
                                    </p>
                                </div>
                            </div>

                            {explanation && (
                                <div className="ml-9 pt-3 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Explanation</p>
                                    <div className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${lang === 'hi' ? 'font-serif' : ''}`}>
                                        {renderFormattedText(explanation)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </article>
                );
            })}
            
            <div className="text-center py-8 text-gray-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">End of Reading</p>
            </div>
        </div>
      </main>
    </div>
  );
};