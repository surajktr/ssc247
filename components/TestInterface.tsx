import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, Menu, Play, Pause, 
  Timer, Star, CheckCircle, XCircle, Languages, X, Home,
  Award, AlertCircle, BarChart3, List, ChevronRight
} from "lucide-react";
import { CurrentAffairEntry, QuizResult, QuestionStatus, QuizProgress } from "../types";

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
  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 ${className}`}>
    {children}
  </span>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'secondary' }> = ({ 
  className = "", 
  variant = 'default', 
  children, 
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-11 px-6 active:scale-95";
  const variants = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200",
    secondary: "bg-gray-900 text-white hover:bg-black shadow-lg",
    outline: "border-2 border-gray-200 bg-transparent hover:bg-gray-50 text-gray-700",
    ghost: "hover:bg-gray-100 text-gray-700 h-10 px-3"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Score Card Component
const ScoreCard: React.FC<{ result: QuizResult; onViewSolutions: () => void }> = ({ result, onViewSolutions }) => {
    const percentage = Math.round((result.score / result.total) * 100);
    const answered = Object.values(result.questionStats).filter((q) => (q as QuestionStatus).selectedOption).length;
    const skipped = result.total - answered;
    
    // Determine color based on percentage
    const colorClass = percentage >= 80 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-500' : 'text-red-500';
    const strokeClass = percentage >= 80 ? 'stroke-emerald-500' : percentage >= 50 ? 'stroke-amber-500' : 'stroke-red-500';
    
    // Circle Props
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 w-full max-w-md text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                
                <h2 className="text-2xl font-black text-gray-900 mb-6">Test Submitted!</h2>
                
                {/* Score Circle */}
                <div className="relative w-40 h-40 mx-auto mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r={radius} className="stroke-gray-100" strokeWidth="10" fill="transparent" />
                        <circle 
                            cx="70" cy="70" r={radius} 
                            className={`${strokeClass} transition-all duration-1000 ease-out`} 
                            strokeWidth="10" 
                            strokeLinecap="round"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-black ${colorClass}`}>{percentage}%</span>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Accuracy</span>
                    </div>
                </div>

                <div className="text-lg font-medium text-gray-600 mb-8">
                    You scored <span className="font-bold text-gray-900">{result.score}</span> out of <span className="font-bold text-gray-900">{result.total}</span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="text-emerald-600 font-black text-xl">{Math.floor(result.score)}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Correct</div>
                    </div>
                     <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="text-red-500 font-black text-xl">{answered - Math.floor(result.score)}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Wrong</div>
                    </div>
                     <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="text-gray-500 font-black text-xl">{skipped}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Skipped</div>
                    </div>
                </div>

                <Button onClick={onViewSolutions} className="w-full">
                    Review Solutions <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
};

export const TestInterface: React.FC<TestInterfaceProps> = ({ entry, mode, initialProgress, existingResult, onExit, onComplete }) => {
  const isSolutionMode = mode === 'solution';
  const questions = entry.questions?.questions || [];
  
  // State
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialProgress?.currentQuestionIndex || 0);
  
  const [questionStats, setQuestionStats] = useState<Record<number, QuestionStatus>>(() => {
    if (existingResult) return existingResult.questionStats;
    if (initialProgress) return initialProgress.questionStats;
    
    const initial: Record<number, QuestionStatus> = {};
    questions.forEach((_, idx) => {
      initial[idx] = { selectedOption: null, isMarkedForReview: false, isVisited: idx === 0, timeSpent: 0 };
    });
    return initial;
  });
  
  const [timeRemaining, setTimeRemaining] = useState<number>(initialProgress?.timeRemaining ?? questions.length * 60); 
  const [isPaused, setIsPaused] = useState(false);
  const [questionTime, setQuestionTime] = useState(0);
  
  // UI State
  const [showMenu, setShowMenu] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showSolutionDetails, setShowSolutionDetails] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Swipe State
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  // --- Timers ---
  useEffect(() => {
    if (!isSolutionMode && !isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, timeRemaining, isSolutionMode]);

  useEffect(() => {
    if (!isSolutionMode && !isPaused) {
      questionTimerRef.current = setInterval(() => {
        setQuestionTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [isPaused, currentQuestionIndex, isSolutionMode]);

  // Update time spent when switching questions
  useEffect(() => {
    if (!isSolutionMode) {
        setQuestionStats(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                ...prev[currentQuestionIndex],
                timeSpent: (prev[currentQuestionIndex]?.timeSpent || 0) + questionTime
            }
        }));
        setQuestionTime(0);
        
        // Mark as visited
        setQuestionStats(prev => ({
            ...prev,
            [currentQuestionIndex]: { ...prev[currentQuestionIndex], isVisited: true }
        }));
    }
  }, [currentQuestionIndex]);

  // --- Handlers ---
  const handlePause = () => setIsPaused(true);

  const handleResume = () => setIsPaused(false);

  const handleHome = () => {
      // Save progress to localStorage
      const progress: QuizProgress = {
          entryId: entry.id,
          questionStats,
          timeRemaining,
          currentQuestionIndex,
          timestamp: Date.now()
      };
      localStorage.setItem(`quiz_progress_${entry.id}`, JSON.stringify(progress));
      onExit();
  };

  const handleOptionSelect = (optionKey: string) => {
    if (isSolutionMode) return;
    setQuestionStats(prev => ({
      ...prev,
      [currentQuestionIndex]: { ...prev[currentQuestionIndex], selectedOption: optionKey }
    }));
  };

  const handleMarkForReview = () => {
    if (isSolutionMode) return;
    setQuestionStats(prev => ({
      ...prev,
      [currentQuestionIndex]: { 
        ...prev[currentQuestionIndex], 
        isMarkedForReview: !prev[currentQuestionIndex].isMarkedForReview 
      }
    }));
  };

  const handleClear = () => {
    setQuestionStats(prev => ({
      ...prev,
      [currentQuestionIndex]: { ...prev[currentQuestionIndex], selectedOption: null }
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } 
  };
  
  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate Score
    let score = 0;
    questions.forEach((q, idx) => {
        const selected = questionStats[idx]?.selectedOption;
        if (selected && selected.toLowerCase() === q.answer.toLowerCase()) {
            score += 1;
        } else if (selected) {
            score -= 0.25;
        }
    });

    const result: QuizResult = {
        score,
        total: questions.length,
        questionStats,
        timestamp: Date.now(),
        timeTakenSeconds: (questions.length * 60) - timeRemaining
    };
    onComplete(result);
  };

  // --- Swipe Handlers ---
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => { touchEnd.current = null; touchStart.current = e.targetTouches[0].clientX; };
  const onTouchMove = (e: React.TouchEvent) => { touchEnd.current = e.targetTouches[0].clientX; };
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > minSwipeDistance && currentQuestionIndex < questions.length - 1) handleNext();
    if (distance < -minSwipeDistance && currentQuestionIndex > 0) handlePrev();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to render formatted text (bolding)
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

  // Empty State
  if (questions.length === 0) return (
      <div className="fixed inset-0 z-[1200] bg-white flex items-center justify-center">
          <div className="text-center">
              <p className="text-gray-500 mb-4">No questions available.</p>
              <Button onClick={onExit}>Exit</Button>
          </div>
      </div>
  );

  // --- Render Logic ---

  // 1. Result Summary View
  if (isSolutionMode && !showSolutionDetails && existingResult) {
      return (
        <div className="fixed inset-0 z-[1200] bg-white overflow-hidden flex flex-col">
            {/* Simple Header for Result */}
            <header className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                <h1 className="text-lg font-bold text-gray-800">Result Analysis</h1>
                <button 
                  onClick={onExit} 
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </header>
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <ScoreCard result={existingResult} onViewSolutions={() => setShowSolutionDetails(true)} />
            </main>
        </div>
      );
  }

  // 2. Active Test / Solution Detail View
  const currentQ = questions[currentQuestionIndex];
  const currentStat = questionStats[currentQuestionIndex];
  const questionText = lang === 'en' ? currentQ.question_en : currentQ.question_hi;
  const solutionTextEn = currentQ.explanation_en || currentQ.solution_en || currentQ.extra_details;
  const solutionTextHi = currentQ.explanation_hi || currentQ.solution_hi;

  return (
    <div 
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-[1200] w-full h-[100dvh] flex flex-col bg-white select-none overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
    >
      {/* HEADER */}
      <header className="shrink-0 bg-white shadow-sm border-b border-gray-200 z-20 relative">
        <div className="p-2 md:p-3 border-b border-gray-100">
          <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-3">
               {/* Pause / Back Button */}
               {isSolutionMode ? (
                   <button 
                     onClick={() => setShowSolutionDetails(false)}
                     className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                   >
                     <ArrowLeft className="w-6 h-6" />
                   </button>
               ) : (
                   <button 
                    onClick={handlePause}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                   >
                     <Pause className="w-5 h-5 fill-current" />
                   </button>
               )}

              <div className="flex flex-col">
                {isSolutionMode ? (
                  <p className="text-base font-bold text-gray-800">Detailed Solutions</p>
                ) : (
                  <p className="text-base font-bold text-gray-800 tabular-nums flex items-center gap-2">
                    {formatTime(timeRemaining)}
                    {!isPaused && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
               <button 
                 onClick={() => setLang(prev => prev === 'en' ? 'hi' : 'en')}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
               >
                 <Languages className="w-3.5 h-3.5" />
                 {lang === 'en' ? 'English' : 'हिंदी'}
               </button>

              <button 
                onClick={() => setShowMenu(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-3 py-1.5 bg-gray-50">
          <div className="flex justify-between items-center text-sm max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="bg-emerald-600 text-white rounded-md w-6 h-6 flex items-center justify-center font-bold text-xs shadow-sm">
                {currentQuestionIndex + 1}
              </div>
              
              {!isSolutionMode && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Timer className="w-4 h-4" />
                  <span className="tabular-nums">{formatTime(questionTime)}</span>
                </div>
              )}
              
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-700 border-green-200">+1.0</Badge>
                <Badge className="bg-red-100 text-red-700 border-red-200">-0.25</Badge>
              </div>
            </div>
            
            {!isSolutionMode && (
              <div className="flex items-center gap-3">
                <button onClick={handleMarkForReview} className={`transition-colors ${currentStat?.isMarkedForReview ? "text-purple-600" : "text-gray-400 hover:text-gray-600"}`}>
                  <Star className={`w-5 h-5 ${currentStat?.isMarkedForReview ? "fill-current" : ""}`} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main 
        className={`flex-1 overflow-y-auto p-4 bg-gray-50 w-full transition-all duration-300 ${isPaused ? 'blur-sm pointer-events-none' : ''}`}
        onTouchStart={!isSolutionMode ? onTouchStart : undefined}
        onTouchMove={!isSolutionMode ? onTouchMove : undefined}
        onTouchEnd={!isSolutionMode ? onTouchEnd : undefined}
      >
        <div className="max-w-3xl mx-auto pb-10">
            {/* Question Card */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mb-6">
                <p className={`text-lg md:text-xl font-medium text-gray-900 leading-relaxed ${lang === 'hi' ? 'font-serif' : ''}`}>
                    {questionText}
                </p>
            </div>
            
            {/* Options List */}
            <div className="space-y-3 pb-6">
            {currentQ.options.map((option) => {
                const key = option.label;
                const optionText = lang === 'en' ? option.text_en : option.text_hi;
                
                const isSelected = currentStat?.selectedOption === key;
                const isCorrectAnswer = currentQ.answer.toLowerCase() === key.toLowerCase();
                
                let containerClass = "border-gray-200 hover:border-emerald-200 bg-white";
                let iconClass = "bg-gray-100 text-gray-500 border-gray-200";

                if (isSolutionMode) {
                    if (isCorrectAnswer) {
                        containerClass = "border-green-500 bg-green-50 ring-1 ring-green-500";
                        iconClass = "bg-green-500 text-white border-green-500";
                    } else if (isSelected && !isCorrectAnswer) {
                        containerClass = "border-red-500 bg-red-50";
                        iconClass = "bg-red-500 text-white border-red-500";
                    } else if (!isSelected && !isCorrectAnswer) {
                        containerClass = "opacity-60";
                    }
                } else if (isSelected) {
                    containerClass = "border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-600";
                    iconClass = "bg-emerald-600 text-white border-emerald-600";
                }

                return (
                <button 
                    key={key} 
                    onClick={() => handleOptionSelect(key)} 
                    disabled={isSolutionMode || isPaused}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 ${containerClass}`}
                >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border transition-colors uppercase ${iconClass}`}>
                        {key}
                    </span>
                    <div className={`flex-1 pt-1 text-gray-800 text-base font-medium ${lang === 'hi' ? 'font-serif' : ''}`}>
                        {optionText}
                    </div>
                    {isSolutionMode && isCorrectAnswer && <CheckCircle className="text-green-600 w-6 h-6 shrink-0" />}
                    {isSolutionMode && isSelected && !isCorrectAnswer && <XCircle className="text-red-600 w-6 h-6 shrink-0" />}
                </button>
                );
            })}
            </div>
            
            {/* Solution Box */}
            {isSolutionMode && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-5 rounded-xl bg-white border border-emerald-100 shadow-sm ring-1 ring-emerald-50">
                        <p className="text-xs font-bold text-emerald-600 uppercase mb-3 tracking-wider flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Correct Solution
                        </p>
                        <div className="text-base text-gray-800 leading-relaxed whitespace-pre-line space-y-2">
                           {solutionTextEn && <p>{renderFormattedText(solutionTextEn)}</p>}
                           {solutionTextHi && <p className="font-serif text-gray-600">{renderFormattedText(solutionTextHi)}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className={`shrink-0 p-3 bg-white border-t border-gray-200 z-20 transition-all duration-300 ${isPaused ? 'blur-sm pointer-events-none' : ''}`}>
        <div className={`grid ${isSolutionMode ? 'grid-cols-2' : 'grid-cols-3'} gap-3 max-w-3xl mx-auto`}>
          {isSolutionMode ? (
            <>
              <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
                <ArrowLeft className="mr-2 w-4 h-4" /> Previous
              </Button>
              <Button onClick={handleNext} disabled={currentQuestionIndex === questions.length - 1}>
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
                <ArrowLeft className="mr-2 w-4 h-4" /> Prev
              </Button>
              <Button variant="ghost" onClick={handleClear} className="text-gray-500">
                Clear
              </Button>
              <Button onClick={handleNext}>
                {currentQuestionIndex === questions.length - 1 ? "Submit" : "Save & Next"}
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </footer>

      {/* PAUSE OVERLAY */}
      {isPaused && !isSolutionMode && (
        <div className="absolute inset-0 z-[1250] bg-white/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center border border-gray-100 max-w-sm w-full relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
               
               <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-12">
                 <Pause className="w-8 h-8 text-emerald-600" />
               </div>
               
               <h2 className="text-2xl font-black text-gray-900 mb-2">Test Paused</h2>
               <p className="text-gray-500 mb-8 font-medium">Your progress is saved securely.</p>
               
               <div className="space-y-3">
                   <Button onClick={handleResume} className="w-full text-base h-12">
                     Resume Test
                   </Button>
                   <Button variant="outline" onClick={handleHome} className="w-full text-base h-12 border-gray-300">
                     <Home className="w-4 h-4 mr-2" /> Home (Save & Exit)
                   </Button>
               </div>
          </div>
        </div>
      )}

      {/* PALETTE MENU */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}></div>
          <div className="relative w-[85%] max-w-xs bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-gray-800">Question Palette</h2>
              <button onClick={() => setShowMenu(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-3">
                {questions.map((_, idx) => {
                  const stats = questionStats[idx];
                  let stateClass = "border-gray-200 text-gray-600 bg-white"; 
                  
                  if (isSolutionMode) {
                     const isCorrect = stats?.selectedOption?.toLowerCase() === questions[idx].answer.toLowerCase();
                     const isSkipped = !stats?.selectedOption;
                     
                     if (isCorrect) stateClass = "bg-green-500 text-white border-green-500";
                     else if (isSkipped) stateClass = "bg-gray-200 text-gray-500 border-gray-200";
                     else stateClass = "bg-red-500 text-white border-red-500";
                  } else {
                     if (stats?.isMarkedForReview) stateClass = "bg-purple-500 text-white border-purple-500";
                     else if (stats?.selectedOption) stateClass = "bg-emerald-500 text-white border-emerald-500";
                     else if (stats?.isVisited) stateClass = "border-emerald-500 text-emerald-600 border-dashed";
                  }
                  
                  if (idx === currentQuestionIndex) {
                     stateClass += " ring-2 ring-offset-1 ring-emerald-500";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => { setCurrentQuestionIndex(idx); setShowMenu(false); setQuestionTime(0); }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border shadow-sm transition-all active:scale-95 ${stateClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs space-y-2 text-gray-500 shrink-0">
               <div className="grid grid-cols-2 gap-2 mb-3">
                   <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Answered</div>
                   <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Review</div>
                   <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-white border border-gray-400"></span> Not Visited</div>
               </div>
               
               {/* Submit Button in Palette */}
               {!isSolutionMode && (
                  <Button 
                    onClick={() => { setShowMenu(false); setShowSubmitDialog(true); }}
                    className="w-full bg-gray-900 hover:bg-black text-white"
                  >
                    Submit Test
                  </Button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT DIALOG */}
      {showSubmitDialog && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSubmitDialog(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Test?</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Are you sure you want to submit?
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-3 rounded-lg text-center text-sm">
                 <div>
                    <span className="block font-bold text-gray-800 text-lg">
                        {Object.values(questionStats).filter((s) => (s as QuestionStatus).selectedOption).length}
                    </span>
                    <span className="text-gray-500 text-xs uppercase">Answered</span>
                 </div>
                 <div>
                    <span className="block font-bold text-gray-800 text-lg">
                        {Object.values(questionStats).filter((s) => !(s as QuestionStatus).selectedOption).length}
                    </span>
                    <span className="text-gray-500 text-xs uppercase">Skipped</span>
                 </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Submit Test</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};