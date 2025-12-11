import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, Menu, Play, Pause, 
  Timer, Star, CheckCircle, XCircle, Languages, X, Home,
  Award, AlertCircle, BarChart3, List, ChevronRight, Clock, HelpCircle, CheckSquare
} from "lucide-react";
import { CurrentAffairEntry, QuizResult, QuestionStatus, QuizProgress, QuizQuestion } from "../types";

interface TestInterfaceProps {
  entry: CurrentAffairEntry;
  mode: 'attempt' | 'solution';
  initialProgress?: QuizProgress;
  existingResult?: QuizResult;
  onExit: () => void;
  onComplete: (result: QuizResult) => void;
}

// Helper Components
const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset ring-gray-500/10 ${className}`}>
    {children}
  </span>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'danger' }> = ({ 
  className = "", 
  variant = 'default', 
  children, 
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 active:scale-[0.98] whitespace-nowrap shadow-sm";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 border border-transparent",
    secondary: "bg-gray-900 text-white hover:bg-black border border-transparent",
    outline: "border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300",
    ghost: "hover:bg-gray-100 text-gray-600 px-3 shadow-none",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const formatTimeTaken = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

// Score Card Component
const ScoreCard: React.FC<{ result: QuizResult; onViewSolutions: () => void }> = ({ result, onViewSolutions }) => {
    const percentage = Math.round((result.score / result.total) * 100);
    const answered = Object.values(result.questionStats).filter((q) => (q as QuestionStatus).selectedOption).length;
    
    let themeColor = 'text-blue-600';
    let grade = 'Good Job!';
    
    if (percentage >= 80) {
        themeColor = 'text-emerald-600';
        grade = 'Excellent!';
    } else if (percentage < 50) {
        themeColor = 'text-amber-600';
        grade = 'Keep Practicing';
    }
    
    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 animate-in zoom-in-95 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
                <div className={`text-4xl font-extrabold mb-2 ${themeColor}`}>{percentage}%</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{grade}</h3>
                <p className="text-gray-500 mb-6">You scored {result.score} out of {result.total}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-6">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Time</div>
                        <div className="text-lg font-bold text-gray-800">{formatTimeTaken(result.timeTakenSeconds)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Attempted</div>
                        <div className="text-lg font-bold text-gray-800">{answered}/{result.total}</div>
                    </div>
                </div>

                <Button onClick={onViewSolutions} className="w-full">
                    Review Solutions <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
};

export const TestInterface: React.FC<TestInterfaceProps> = ({
  entry,
  mode: initialMode,
  initialProgress,
  existingResult,
  onExit,
  onComplete
}) => {
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialProgress?.currentQuestionIndex || 0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(() => {
    if (initialProgress?.questionStats) {
        const answers: Record<number, string> = {};
        Object.entries(initialProgress.questionStats).forEach(([key, stat]) => {
            const qs = stat as QuestionStatus;
            if (qs.selectedOption) answers[Number(key)] = qs.selectedOption;
        });
        return answers;
    }
    return {};
  });
  
  // Timer State (in seconds)
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(initialMode === 'solution');
  
  const questions = entry.questions?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Timer Effect
  useEffect(() => {
    if (isReviewMode || isPaused) return;
    const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isReviewMode, isPaused]);

  // Initial Review Mode Setup
  useEffect(() => {
    if (initialMode === 'solution') {
        setIsReviewMode(true);
        if (existingResult) {
            setTimeElapsed(existingResult.timeTakenSeconds);
            const answers: Record<number, string> = {};
            Object.entries(existingResult.questionStats).forEach(([key, stat]) => {
                const qs = stat as QuestionStatus;
                if (qs.selectedOption) answers[Number(key)] = qs.selectedOption;
            });
            setUserAnswers(answers);
        }
    }
  }, [initialMode, existingResult]);

  // Save Progress Effect (Debounced)
  useEffect(() => {
      if (isReviewMode) return;
      const timeout = setTimeout(() => {
        const stats: Record<number, QuestionStatus> = {};
        questions.forEach((_, idx) => {
            stats[idx] = {
                selectedOption: userAnswers[idx] || null,
                isMarkedForReview: false,
                isVisited: idx === currentQuestionIndex,
                timeSpent: 0
            };
        });
        
        const progress: QuizProgress = {
            entryId: entry.id,
            questionStats: stats,
            timeRemaining: 0, // Not using countdown
            currentQuestionIndex,
            timestamp: Date.now()
        };
        localStorage.setItem(`quiz_progress_${entry.id}`, JSON.stringify(progress));
      }, 1000);
      return () => clearTimeout(timeout);
  }, [userAnswers, currentQuestionIndex, isReviewMode, entry.id, questions]);

  const handleOptionSelect = (optionLabel: string) => {
    if (isReviewMode) return;
    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionLabel }));
  };

  const handleSubmit = () => {
    let score = 0;
    questions.forEach((q, idx) => {
        if (userAnswers[idx]?.toLowerCase() === q.answer?.toLowerCase()) {
            score++;
        }
    });

    const stats: Record<number, QuestionStatus> = {};
    questions.forEach((_, idx) => {
        stats[idx] = {
            selectedOption: userAnswers[idx] || null,
            isMarkedForReview: false,
            isVisited: true,
            timeSpent: 0
        };
    });

    const result: QuizResult = {
        score,
        total: questions.length,
        questionStats: stats,
        timestamp: Date.now(),
        timeTakenSeconds: timeElapsed
    };

    onComplete(result);
    // Switch to local review mode immediately to show result card
    setIsReviewMode(true);
  };

  const renderQuestion = () => {
    if (!currentQuestion) return <div>No question data.</div>;

    const selectedOption = userAnswers[currentQuestionIndex];
    const correctAnswer = currentQuestion.answer;

    return (
        <div className="max-w-3xl mx-auto w-full pb-24">
            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                     <Badge className="bg-gray-100 text-gray-600">
                        Q{currentQuestionIndex + 1} of {questions.length}
                     </Badge>
                     {isReviewMode && (
                         <Badge className={selectedOption?.toLowerCase() === correctAnswer?.toLowerCase() ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}>
                            {selectedOption ? (selectedOption.toLowerCase() === correctAnswer.toLowerCase() ? "Correct" : "Incorrect") : "Skipped"}
                         </Badge>
                     )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 leading-relaxed">
                    {currentQuestion.question_en}
                </h3>
                {currentQuestion.question_hi && (
                    <p className="text-base sm:text-lg text-gray-600 font-serif leading-relaxed">
                        {currentQuestion.question_hi}
                    </p>
                )}
            </div>

            {/* Options */}
            <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                    const isSelected = selectedOption === opt.label;
                    const isAnswer = isReviewMode && opt.label.toLowerCase() === correctAnswer.toLowerCase();
                    const isWrongSelection = isReviewMode && isSelected && !isAnswer;
                    
                    let cardClass = "border-transparent bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-200";
                    let indicatorClass = "bg-gray-100 border-gray-200 text-gray-500";
                    
                    if (!isReviewMode) {
                        if (isSelected) {
                            cardClass = "border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-1 ring-blue-500";
                            indicatorClass = "bg-blue-500 border-blue-500 text-white";
                        }
                    } else {
                        if (isAnswer) {
                            cardClass = "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-500";
                            indicatorClass = "bg-emerald-500 border-emerald-500 text-white";
                        } else if (isWrongSelection) {
                            cardClass = "border-red-500 bg-red-50 text-red-800 shadow-sm ring-1 ring-red-500";
                            indicatorClass = "bg-red-500 border-red-500 text-white";
                        } else if (isSelected) {
                             // Selected but not wrong/right (should cover wrong case but good for fallback)
                        } else {
                            cardClass = "border-gray-100 bg-white opacity-60";
                        }
                    }

                    return (
                        <button
                            key={opt.label}
                            onClick={() => handleOptionSelect(opt.label)}
                            disabled={isReviewMode}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${cardClass}`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border transition-colors uppercase ${indicatorClass}`}>
                                    {opt.label}
                                </span>
                                <div>
                                    <div className="font-medium text-lg">{opt.text_en}</div>
                                    {opt.text_hi && <div className="font-serif text-sm opacity-80 mt-0.5">{opt.text_hi}</div>}
                                </div>
                            </div>
                            {isReviewMode && isAnswer && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                            {isReviewMode && isWrongSelection && <XCircle className="w-5 h-5 text-red-600" />}
                        </button>
                    );
                })}
            </div>

            {/* Explanation Section */}
            {isReviewMode && (currentQuestion.explanation_en || currentQuestion.explanation_hi) && (
                <div className="mt-6 p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 mb-3 text-blue-800 font-bold uppercase text-xs tracking-wider">
                        <HelpCircle className="w-4 h-4" /> Explanation
                    </div>
                    <div className="prose prose-sm prose-blue max-w-none">
                        {currentQuestion.explanation_en && <p className="text-gray-800 leading-relaxed">{currentQuestion.explanation_en}</p>}
                        {currentQuestion.explanation_hi && <p className="text-gray-600 font-serif mt-2">{currentQuestion.explanation_hi}</p>}
                    </div>
                </div>
            )}
        </div>
    );
  };

  // View Score Mode
  const [viewingScore, setViewingScore] = useState(initialMode === 'solution' && !!existingResult);
  
  if (viewingScore && existingResult) {
      return (
        <div className="fixed inset-0 z-[1200] bg-white flex flex-col">
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
                <h2 className="font-bold text-lg">Results</h2>
                <button onClick={onExit} className="p-2 rounded-full hover:bg-gray-100">
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <ScoreCard result={existingResult} onViewSolutions={() => setViewingScore(false)} />
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[1200] bg-gray-50 flex flex-col animate-in slide-in-from-bottom-5 duration-300 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <button onClick={() => setShowExitConfirm(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
                <h1 className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[150px] sm:max-w-md">
                    {entry.questions?.title || "Quiz"}
                </h1>
                {!isReviewMode && (
                    <div className="flex items-center text-xs font-mono text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeTaken(timeElapsed)}
                    </div>
                )}
            </div>
        </div>

        <div className="flex items-center gap-2">
            {!isReviewMode && (
                <Button 
                    variant="default" 
                    onClick={handleSubmit}
                    className="h-9 px-3 text-xs"
                >
                    Submit
                </Button>
            )}
            <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 border border-gray-200"
            >
                <List className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
          {renderQuestion()}
      </main>

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <Button 
                variant="outline" 
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex-1"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            
            <span className="text-xs font-bold text-gray-400 hidden sm:block">
                {currentQuestionIndex + 1} / {questions.length}
            </span>

            <Button 
                variant="secondary"
                onClick={() => {
                    if (currentQuestionIndex < questions.length - 1) {
                        setCurrentQuestionIndex(prev => prev + 1);
                    } else if (!isReviewMode) {
                        handleSubmit();
                    }
                }}
                className="flex-1"
            >
                {currentQuestionIndex === questions.length - 1 ? (isReviewMode ? "Finish" : "Submit") : "Next"} 
                {currentQuestionIndex < questions.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
        </div>
      </footer>

      {/* Sidebar (Question Palette) */}
      {sidebarOpen && (
          <div className="fixed inset-0 z-[1300] bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
              <div 
                className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200"
                onClick={e => e.stopPropagation()}
              >
                  <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold">Questions</h2>
                      <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-3">
                      {questions.map((_, idx) => {
                          const isAnswered = !!userAnswers[idx];
                          const isCurrent = idx === currentQuestionIndex;
                          const isCorrect = isReviewMode && userAnswers[idx]?.toLowerCase() === questions[idx].answer.toLowerCase();
                          
                          let bgClass = "bg-gray-100 text-gray-600 hover:bg-gray-200";
                          if (isCurrent) bgClass = "ring-2 ring-blue-500 ring-offset-2 bg-white text-blue-600 border border-blue-200";
                          else if (isReviewMode) {
                             if (isCorrect) bgClass = "bg-emerald-100 text-emerald-700 border border-emerald-200";
                             else if (isAnswered) bgClass = "bg-red-100 text-red-700 border border-red-200";
                             else bgClass = "bg-gray-100 text-gray-400";
                          }
                          else if (isAnswered) bgClass = "bg-blue-600 text-white shadow-sm";
                          
                          return (
                              <button
                                key={idx}
                                onClick={() => {
                                    setCurrentQuestionIndex(idx);
                                    setSidebarOpen(false);
                                }}
                                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${bgClass}`}
                              >
                                  {idx + 1}
                              </button>
                          );
                      })}
                  </div>
                  
                  <div className="mt-8 border-t pt-6">
                      <div className="grid grid-cols-2 gap-3 text-xs font-medium text-gray-500">
                          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div> Answered</div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-gray-100 mr-2 border border-gray-200"></div> Unanswered</div>
                          {isReviewMode && (
                              <>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 mr-2"></div> Correct</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-2"></div> Incorrect</div>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[1400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {isReviewMode ? "Exit Solutions?" : "Quit Quiz?"}
              </h3>
              <p className="text-gray-500 mb-6 leading-relaxed">
                  {isReviewMode 
                    ? "You can come back to review these solutions later." 
                    : "Your progress will be saved, but you can't resume the timer exactly where you left off."}
              </p>
              <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowExitConfirm(false)} className="flex-1">
                      Cancel
                  </Button>
                  <Button variant="default" onClick={onExit} className="flex-1 bg-red-600 hover:bg-red-700 shadow-red-200">
                      {isReviewMode ? "Exit" : "Quit"}
                  </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};