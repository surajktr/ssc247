import React, { useState, useEffect } from 'react';
import { ArrowLeft, Languages, BookOpen } from 'lucide-react';
import { CurrentAffairEntry } from '../types';

interface ReadingInterfaceProps {
  entry: CurrentAffairEntry;
  onBack: () => void;
}

export const ReadingInterface: React.FC<ReadingInterfaceProps> = ({ entry, onBack }) => {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const questions = entry.questions?.questions || [];

  // --- SEO Logic ---
  useEffect(() => {
    // 1. Update Document Title
    const originalTitle = document.title;
    const pageTitle = entry.questions.title 
        ? `${entry.questions.title} - SSC24x7` 
        : `Current Affairs ${new Date(entry.upload_date).toLocaleDateString()} - SSC24x7`;
    document.title = pageTitle;

    // 2. Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
    }
    // Use the first question as the description snippet for SEO
    const firstQuestion = questions[0]?.question_en || "Daily Current Affairs Questions and Answers";
    metaDescription.setAttribute('content', `Read current affairs: ${firstQuestion} and more on SSC24x7.`);

    // 3. Inject JSON-LD Schema (FAQPage)
    // This tells Google that this page contains specific Questions and Answers
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": questions.map(q => ({
            "@type": "Question",
            "name": q.question_en,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": `Answer: ${q.answer}. Explanation: ${q.explanation_en || q.extra_details || 'See details.'}`
            }
        }))
    };
    
    schemaScript.text = JSON.stringify(schemaData);
    document.head.appendChild(schemaScript);

    // Cleanup on unmount
    return () => {
        document.title = originalTitle;
        if (metaDescription) {
            metaDescription.setAttribute('content', 'A mobile-first news dashboard application featuring a modern, vibrant UI.');
        }
        if (document.head.contains(schemaScript)) {
            document.head.removeChild(schemaScript);
        }
    };
  }, [entry, questions]);

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-black bg-yellow-100 px-1 rounded-sm mx-0.5 shadow-sm">{part.slice(2, -2)}</strong>;
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
      <main className="flex-1 overflow-y-auto bg-white p-4">
        <div className="max-w-3xl mx-auto">
            {questions.map((q, idx) => {
                const questionText = lang === 'en' ? q.question_en : q.question_hi;
                const explanation = lang === 'en' ? (q.explanation_en || q.extra_details) : q.explanation_hi;
                
                // Find correct answer text
                const correctOption = q.options.find(opt => opt.label.toLowerCase() === q.answer.toLowerCase());
                const answerText = correctOption ? (lang === 'en' ? correctOption.text_en : correctOption.text_hi) : q.answer;

                return (
                    <div key={idx} className="py-6 border-b border-gray-100 last:border-0">
                        <div className="flex gap-2 mb-3">
                            <span className="font-bold text-gray-900 shrink-0">{idx + 1}.</span>
                            <h3 className={`font-bold text-gray-900 leading-snug ${lang === 'hi' ? 'font-serif' : ''}`}>
                                {questionText}
                            </h3>
                        </div>

                        <div className="ml-6 mb-3">
                            <p className={`text-emerald-700 font-bold text-sm ${lang === 'hi' ? 'font-serif' : ''}`}>
                                Answer: {answerText}
                            </p>
                        </div>

                        {explanation && (
                            <div className="ml-6 mt-3">
                                <h4 className="text-red-600 font-bold text-xs uppercase tracking-wider mb-2">Explanation</h4>
                                <div className={`text-sm text-black leading-relaxed ${lang === 'hi' ? 'font-serif font-bold' : 'font-sans font-semibold'}`}>
                                    {explanation.split('\n').filter(line => line.trim()).map((line, i) => (
                                        <div key={i} className="mb-2 last:mb-0">
                                            {renderFormattedText(line)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            
            <div className="text-center py-10 text-gray-400">
                <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-20" />
                <p className="text-xs">End of Reading</p>
            </div>
        </div>
      </main>
    </div>
  );
};