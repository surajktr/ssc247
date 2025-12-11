
import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { CurrentAffairEntry, QuizQuestion, QuizResult, QuestionStatus } from '../types';

interface QuizModalProps {
  entry: CurrentAffairEntry;
  initialMode: 'test' | 'review';
  existingResult?: QuizResult;
  onClose: () => void;
  onSaveResult: (result: QuizResult) => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ entry, initialMode, existingResult, onClose, onSaveResult }) => {
  const [mode, setMode] = useState<'test' | 'review'>(initialMode);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Access the questions array from the new structure
  const questionsList = entry.questions?.questions || [];

  // Initialize userAnswers from existingResult.questionStats if available
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(() => {
    if (existingResult?.questionStats) {
      const answers: Record<number, string> = {};
      Object.entries(existingResult.questionStats).forEach(([key, status]) => {
        const qs = status as QuestionStatus;
        if (qs.selectedOption) {
          answers[parseInt(key)] = qs.selectedOption;
        }
      });
      return answers;
    }
    return {};
  });
  
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Parse markdown-like syntax for extra details (bolding **text**)
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

  const handleOptionSelect = (optionKey: string) => {
    if (mode === 'review') return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionKey
    }));
  };

  const handleSubmit = () => {
    let score = 0;
    questionsList.forEach((q, idx) => {
      // Case-insensitive comparison
      if (userAnswers[idx]?.toLowerCase() === q.answer?.toLowerCase()) {
        score++;
      }
    });

    // Create questionStats from userAnswers
    const questionStats: Record<number, QuestionStatus> = {};
    questionsList.forEach((_, idx) => {
      questionStats[idx] = {
        selectedOption: userAnswers[idx] || null,
        isMarkedForReview: false,
        isVisited: true,
        timeSpent: 0
      };
    });

    const result: QuizResult = {
      score,
      total: questionsList.length,
      questionStats,
      timestamp: Date.now(),
      timeTakenSeconds: 0 // This modal doesn't track time
    };

    onSaveResult(result);
    setMode('review');
    setCurrentQuestionIndex(0); // Go back to start to review
  };

  if (questionsList.length === 0) {
      return (
          <div className="fixed inset-0 z-[1200] bg-white flex items-center justify-center">
              <div className="text-center">
                  <p className="text-gray-500 mb-4">No questions available for this entry.</p>
                  <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
              </div>
          </div>
      );
  }

  const currentQuestion = questionsList[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questionsList.length - 1;
  const progress = ((currentQuestionIndex + 1) / questionsList.length) * 100;

  // Render Logic for Test Mode
  const renderTestInterface = () => (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
            <span className="text-sm font-semibold text-gray-500 mr-2">Question {currentQuestionIndex + 1}/{questionsList.length}</span>
        </div>
        <button onClick={() => setShowExitConfirm(true)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1.5">
        <div className="bg-emerald-500 h-1.5 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
           <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-relaxed">
             {currentQuestion.question_en}
           </h3>
           <p className="text-base sm:text-lg text-gray-600 font-medium font-serif leading-relaxed">
             {currentQuestion.question_hi}
           </p>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = userAnswers[currentQuestionIndex] === option.label;
            return (
              <button
                key={option.label}
                onClick={() => handleOptionSelect(option.label)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${
                  isSelected 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm' 
                    : 'border-transparent bg-white hover:bg-gray-50 hover:border-gray-200 text-gray-700 shadow-sm'
                }`}
              >
                <div className="flex items-center">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 border transition-colors uppercase ${
                        isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-100 border-gray-200 text-gray-500 group-hover:border-gray-300'
                    }`}>
                        {option.label}
                    </span>
                    <div className="flex flex-col">
                        <span className="font-medium text-lg text-gray-800">{option.text_en}</span>
                        <span className="font-serif text-gray-600 text-sm">{option.text_hi}</span>
                    </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white p-4 border-t border-gray-200 flex justify-between items-center max-w-3xl mx-auto w-full sticky bottom-0">
        <button 
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-gray-500 font-medium disabled:opacity-30 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </button>

        {isLastQuestion ? (
          <button 
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-md flex items-center"
          >
            Submit Test
          </button>
        ) : (
          <button 
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questionsList.length - 1, prev + 1))}
            className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 active:scale-95 transition-all shadow-md flex items-center"
          >
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>

      {/* Exit Confirmation Overlay */}
      {showExitConfirm && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quit Quiz?</h3>
              <p className="text-gray-500 mb-6">Your progress will be lost if you exit now.</p>
              <div className="flex gap-3">
                  <button onClick={() => setShowExitConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={onClose} className="flex-1 px-4 py-2 bg-red-600 rounded-lg font-semibold text-white hover:bg-red-700">Quit</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  // Render Logic for Review/Result Mode
  const renderResultInterface = () => {
    const score = Object.keys(userAnswers).reduce((acc, idx) => {
        return userAnswers[parseInt(idx)]?.toLowerCase() === questionsList[parseInt(idx)].answer?.toLowerCase() ? acc + 1 : acc;
    }, 0);
    const percentage = Math.round((score / questionsList.length) * 100);

    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-800">Test Results</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-8">
            {/* Score Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-100 bg-emerald-50 mb-4 relative">
                    <span className="text-3xl font-extrabold text-emerald-600">{percentage}%</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    You scored {score} out of {questionsList.length}
                </h3>
                <p className="text-gray-500">
                    {percentage >= 80 ? 'Excellent work!' : percentage >= 50 ? 'Good effort!' : 'Keep practicing!'}
                </p>
            </div>

            {/* Solution List */}
            <div className="space-y-6">
                <h4 className="text-lg font-bold text-gray-800 flex items-center">
                    <RefreshCw className="w-5 h-5 mr-2 text-emerald-600" /> 
                    Detailed Solutions
                </h4>
                
                {questionsList.map((q, idx) => {
                    const userAnswer = userAnswers[idx];
                    const isCorrect = userAnswer?.toLowerCase() === q.answer?.toLowerCase();
                    const isSkipped = !userAnswer;

                    // Find text for user answer and correct answer
                    const userOptText = q.options.find(o => o.label === userAnswer)?.text_en;
                    const correctOptText = q.options.find(o => o.label.toLowerCase() === q.answer.toLowerCase())?.text_en;

                    return (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Question Header */}
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mt-1">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <h5 className="font-semibold text-gray-900 text-lg mb-1">{q.question_en}</h5>
                                        <p className="text-gray-600 font-serif">{q.question_hi}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Options & Status */}
                            <div className="p-5 bg-gray-50/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <div className={`p-3 rounded-lg border flex items-center justify-between ${isCorrect ? 'bg-emerald-50 border-emerald-200' : isSkipped ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                        <span className="text-sm text-gray-500 block uppercase tracking-wider text-[10px] font-bold mb-0.5">Your Answer</span>
                                        <span className={`font-semibold ${isCorrect ? 'text-emerald-700' : isSkipped ? 'text-amber-700' : 'text-red-700'}`}>
                                            {userAnswer ? `${userAnswer.toUpperCase()}. ${userOptText || ''}` : 'Skipped'}
                                        </span>
                                        {isCorrect ? <Check className="w-4 h-4 text-emerald-600" /> : !isSkipped && <X className="w-4 h-4 text-red-600" />}
                                    </div>
                                    <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 flex items-center justify-between">
                                        <span className="text-sm text-gray-500 block uppercase tracking-wider text-[10px] font-bold mb-0.5">Correct Answer</span>
                                        <span className="font-semibold text-emerald-700">{q.answer.toUpperCase()}. {correctOptText}</span>
                                        <Check className="w-4 h-4 text-emerald-600" />
                                    </div>
                                </div>

                                {/* Explanation */}
                                {(q.explanation_en || q.explanation_hi || q.extra_details) && (
                                    <div className="mt-4 pt-4 border-t border-gray-200/60">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <AlertCircle className="w-3 h-3 mr-1" /> Explanation
                                        </p>
                                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line space-y-2">
                                            {q.explanation_en && <p>{renderFormattedText(q.explanation_en)}</p>}
                                            {q.explanation_hi && <p className="font-serif text-gray-600">{renderFormattedText(q.explanation_hi)}</p>}
                                            {!q.explanation_en && !q.explanation_hi && q.extra_details && (
                                                <p>{renderFormattedText(q.extra_details)}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-white animate-in slide-in-from-bottom-5 duration-300">
      {mode === 'test' ? renderTestInterface() : renderResultInterface()}
    </div>
  );
};

export default QuizModal;
