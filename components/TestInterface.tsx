import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ArrowLeft, ArrowRight, Menu, Play, Pause, 
  Timer, Star, CheckCircle, XCircle, Languages, X, Home,
  Award, AlertCircle, BarChart3, List, ChevronRight, Clock, HelpCircle, CheckSquare
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
  // Reduced height from h-12 to h-10, px-6 to px-4 for a more compact look
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

// --- Modern Score Card Component ---
const ScoreCard: React.FC<{ result: QuizResult; onViewSolutions: () => void }> = ({ result, onViewSolutions }) => {
    const percentage = Math.round((result.score / result.total) * 100);
    const answered = Object.values(result.questionStats).filter((q) => (q as QuestionStatus).selectedOption).length;
    const skipped = result.total - answered;
    const wrong = answered - Math.floor(result.score); // Approximation if no partial marking logic changes
    
    // Theme determination
    let themeColor = 'text-blue-600';
    let ringColor = 'stroke-blue-600';
    let grade = 'Good Job!';
    
    if (percentage >= 80) {
        themeColor = 'text-emerald-600';
        ringColor = 'stroke-emerald-500';
        grade = 'Excellent!';
    } else if (percentage < 50) {
        themeColor = 'text-amber-600';
        ringColor = 'stroke-amber-500';
        grade = 'Keep Practicing';
    }
    
    // Circle Props
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const formatTimeTaken = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full p-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 p-8 w-full max-w-sm text-center relative overflow-hidden">
                
                {/* Background Decor */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{grade}</h2>
                    <p className="text-sm text-gray-500 font-medium mb-8">Assessment Complete</p>
                    
                    {/* Progress Circle */}
                    <div className="relative w-48 h-48 mx-auto mb-8">
                        {/* Outer Glow */}
                        <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${percentage >= 80 ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                        
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 140 140">
                            {/* Track */}
                            <circle cx="70" cy="70" r={radius} className="stroke-gray-100" strokeWidth="12" fill="transparent" />
                            {/* Indicator */}
                            <circle 
                                cx="70" cy="70" r={radius} 
                                className={`${ringColor} transition-all duration-1000 ease-out`} 
                                strokeWidth="12" 
                                strokeLinecap="round"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-5xl font-black tracking-tight ${themeColor}`}>
                                {percentage}%
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Score</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center">
                             <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Correct
                             </div>
                             <span className="text-xl font-black text-gray-900">{Math.floor(result.score)}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center">
                             <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-1">
                                <XCircle className="w-3.5 h-3.5 text-red-500" /> Wrong
                             </div>
                             <span className="text-xl font-black text-gray-900">{wrong}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center">
                             <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Skipped
                             </div>
                             <span className="text-xl font-black text-gray-900">{skipped}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center">
                             <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-1">
                                <Clock className="w-3.5 h-3.5 text-blue-500" /> Time
                             </div>
                             <span className="text-xl font-black text-gray-900">{result.timeTakenSeconds ? formatTimeTaken(result.timeTakenSeconds) : '--'}</span>
                        </div>
                    </div>

                    <Button onClick={onViewSolutions} className="w-full shadow-lg shadow-blue-200/50 h-12">
                        Detailed Solutions <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const TestInterface: React.FC<TestInterfaceProps> = ({ entry, mode, initialProgress, existingResult, onExit, onComplete }) => {
  const isSolutionMode = mode === 'solution';
  // Fallback if questions is not array
  const rawQuestions = entry.questions?.questions;
  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
  
  // State
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialProgress?.currentQuestionIndex || 0);

  // Memoize shuffled questions to persist order across re-renders (but shuffle on new entry/mount)
  const processedQuestions = useMemo(() => {
    return questions.map(q => {
        if (!q || !q.options) return q;
        const shuffled = [...q.options];
        // Fisher-Yates Shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return { ...q, options: shuffled };
    });
  }, [entry.id]); // Questions content is tied to entry.id
  
  const [questionStats, setQuestionStats] = useState<Record<number, QuestionStatus>>(() => {
    if (initialProgress) return initialProgress.questionStats;
    // Fix: Only use existing result if viewing solutions. If re-attempting, start fresh.
    if (mode === 'solution' && existingResult) return existingResult.questionStats;
    
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

  // Reset states when mode changes
  useEffect(() => {
    setShowSubmitDialog(false);
    setShowMenu(false);
    // Reset index when entering solution mode
    if (mode === 'solution') {
      setCurrentQuestionIndex(0);
    }
  }, [mode]);

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
    } else if (!isSolutionMode) {
        // Last question logic - only for attempts
        setShowSubmitDialog(true);
    }
  };
  
  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Hide dialog immediately to prevent bug where it shows on result screen
    setShowSubmitDialog(false);

    // Calculate Score
    let score = 0;
    questions.forEach((q, idx) => {
        // Safety check for question existence
        if (!q) return;

        const selected = questionStats[idx]?.selectedOption;
        // Safety check for answer existence
        if (selected && q.answer && selected.toLowerCase() === q.answer.toLowerCase()) {
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
  const renderFormattedText = (text: any) => {
    if (!text) return null;
    const stringText = String(text); // Force string to prevent crash
    const parts = stringText.split(/(\*\*.*?\*\*)/g);
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
            <header className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Award className="w-5 h-5" />
                    </div>
                    <h1 className="text-lg font-extrabold text-gray-900">Performance</h1>
                </div>
                <button 
                  onClick={onExit} 
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </header>
            <main className="flex-1 overflow-y-auto bg-white flex items-center justify-center">
                <ScoreCard 
                    result={existingResult} 
                    onViewSolutions={() => {
                        setCurrentQuestionIndex(0);
                        setShowSolutionDetails(true);
                    }} 
                />
            </main>
        </div>
      );
  }

  // 2. Active Test / Solution Detail View
  const currentQ = processedQuestions[currentQuestionIndex];
  // Safety check: if currentQ is null (e.g. data corruption), show error or skip
  if (!currentQ) {
      return (
         <div className="fixed inset-0 z-[1200] bg-white flex items-center justify-center">
            <div className="text-center">
               <p className="text-gray-500 mb-4">Question unavailable (Data Error).</p>
               <Button onClick={() => {
                  if (currentQuestionIndex < questions.length - 1) handleNext();
                  else handlePrev();
               }}>Skip Question</Button>
               <Button variant="ghost" className="mt-2" onClick={onExit}>Exit</Button>
            </div>
         </div>
      );
  }

  const currentStat = questionStats[currentQuestionIndex];
  const questionText = lang === 'en' ? (currentQ.question_en || "") : (currentQ.question_hi || "");
  const solutionTextEn = currentQ.explanation_en || currentQ.solution_en || currentQ.extra_details;
  const solutionTextHi = currentQ.explanation_hi || currentQ.solution_hi;

  // Determine status for Solution Mode Header
  let solutionStatusBadge = null;
  if (isSolutionMode) {
      const isCorrect = currentStat?.selectedOption && currentQ.answer && currentStat.selectedOption.toLowerCase() === currentQ.answer.toLowerCase();
      const isSkipped = !currentStat?.selectedOption;
      
      if (isCorrect) {
          solutionStatusBadge = (
            <div className="flex items-center text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 shadow-sm">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-bold uppercase tracking-wide">Correct</span>
            </div>
          );
      } else if (isSkipped) {
          solutionStatusBadge = (
            <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                <AlertCircle className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-bold uppercase tracking-wide">Skipped</span>
            </div>
          );
      } else {
          solutionStatusBadge = (
            <div className="flex items-center text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">
                <XCircle className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-bold uppercase tracking-wide">Wrong</span>
            </div>
          );
      }
  }

  return (
    <div 
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-[1200] w-full h-[100dvh] flex flex-col bg-white select-none overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
    >
      {/* HEADER */}
      <header className="shrink-0 bg-white shadow-sm border-b border-gray-200 z-20 relative">
        <div className="p-2 md:p-3 border-b border-gray-100">
          <div className="flex justify-between items-center max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-3">
               {/* Pause / Back Button */}
               {isSolutionMode ? (
                   <button 
                     onClick={() => setShowSolutionDetails(false)}
                     className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-600 border border-transparent hover:border-gray-200 transition-all"
                   >
                     <ArrowLeft className="w-5 h-5" />
                   </button>
               ) : (
                   <button 
                    onClick={handlePause}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-200 transition-all"
                   >
                     <Pause className="w-5 h-5 fill-current" />
                   </button>
               )}

              <div className="flex flex-col">
                {isSolutionMode ? (
                  <p className="text-base font-bold text-gray-900">Detailed Solutions</p>
                ) : (
                  <p className="text-base font-bold text-gray-800 tabular-nums flex items-center gap-2">
                    {formatTime(timeRemaining)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
               <button 
                 onClick={() => setLang(prev => prev === 'en' ? 'hi' : 'en')}
                 className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 hover:bg-white hover:shadow-sm transition-all"
               >
                 <Languages className="w-3.5 h-3.5" />
                 {lang === 'en' ? 'EN' : 'HI'}
               </button>

              <button 
                onClick={() => setShowMenu(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-600 border border-transparent hover:border-gray-200 transition-all"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-3 py-1.5 bg-gray-50/50 backdrop-blur-sm">
          <div className="flex justify-between items-center text-sm max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="bg-gray-900 text-white rounded-lg min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center font-bold text-xs shadow-sm">
                {currentQuestionIndex + 1}
              </div>
              
              {!isSolutionMode && (
                <div className="flex items-center gap-1 text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm">
                  <Timer className="w-3.5 h-3.5" />
                  <span className="tabular-nums text-xs font-bold">{formatTime(questionTime)}</span>
                </div>
              )}
              
              <div className="flex gap-2">
                <Badge className="bg-green-50 text-green-700 border-green-200">+1.0</Badge>
                <Badge className="bg-red-50 text-red-700 border-red-200">-0.25</Badge>
              </div>
            </div>
            
            {/* Right Side Controls / Status */}
            <div className="flex items-center gap-3">
                {!isSolutionMode ? (
                    <button onClick={handleMarkForReview} className={`transition-all p-1.5 rounded-lg ${currentStat?.isMarkedForReview ? "bg-purple-50 text-purple-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                        <Star className={`w-5 h-5 ${currentStat?.isMarkedForReview ? "fill-current" : ""}`} />
                    </button>
                ) : (
                    <div className="animate-in fade-in duration-300">
                        {solutionStatusBadge}
                    </div>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main 
        className={`flex-1 overflow-y-auto p-4 bg-gray-50 w-full transition-all duration-300 ${isPaused ? 'blur-sm pointer-events-none' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="max-w-6xl mx-auto pb-24">
            {/* Question Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                {/* Reduced font size for questions */}
                <p className={`text-base md:text-lg font-medium text-gray-900 leading-relaxed ${lang === 'hi' ? 'font-serif' : ''}`}>
                    {renderFormattedText(questionText)}
                </p>
            </div>
            
            {/* Options List */}
            <div className="space-y-3 pb-6" key={currentQuestionIndex}>
            {(currentQ.options || []).map((option, optIdx) => {
                if (!option) return null; // Safety check
                const key = option.label;
                const uniqueKey = `${currentQuestionIndex}-${key}`; 
                const optionText = lang === 'en' ? (option.text_en || "") : (option.text_hi || "");
                
                const isSelected = currentStat?.selectedOption === key;
                const isCorrectAnswer = currentQ.answer && currentQ.answer.toLowerCase() === key.toLowerCase();
                
                // Display label based on shuffled position (A, B, C, D)
                const displayLabel = String.fromCharCode(65 + optIdx);
                
                let containerClass = "border-gray-200 hover:border-gray-300 bg-white text-gray-700";
                let iconClass = "bg-gray-100 text-gray-500 border-gray-200";

                if (isSolutionMode) {
                    if (isCorrectAnswer) {
                        containerClass = "border-green-500 bg-green-50 ring-1 ring-green-500 text-green-900";
                        iconClass = "bg-green-500 text-white border-green-500";
                    } else if (isSelected && !isCorrectAnswer) {
                        containerClass = "border-red-500 bg-red-50 text-red-900";
                        iconClass = "bg-red-500 text-white border-red-500";
                    } else if (!isSelected && !isCorrectAnswer) {
                        containerClass = "opacity-60";
                    }
                } else if (isSelected) {
                    containerClass = "border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600 text-blue-900";
                    iconClass = "bg-blue-600 text-white border-blue-600";
                }

                return (
                <button 
                    key={uniqueKey} 
                    onClick={() => handleOptionSelect(key)} 
                    disabled={isSolutionMode || isPaused}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 shadow-sm active:scale-[0.99] ${containerClass}`}
                >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors uppercase ${iconClass}`}>
                        {displayLabel}
                    </span>
                    {/* Reduced font size for options */}
                    <div className={`flex-1 pt-0.5 text-sm font-medium ${lang === 'hi' ? 'font-serif' : ''}`}>
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
                    <div className="p-6 rounded-2xl bg-white border border-blue-100 shadow-lg shadow-blue-50/50">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-3 tracking-wider flex items-center">
                            <div className="bg-blue-100 p-1 rounded mr-2">
                                <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                            Explanation
                        </p>
                        <div className="text-base text-gray-800 leading-relaxed whitespace-pre-line space-y-2">
                           {lang === 'en' && solutionTextEn && <p>{renderFormattedText(solutionTextEn)}</p>}
                           {lang === 'hi' && solutionTextHi && <p className="font-serif text-gray-600">{renderFormattedText(solutionTextHi)}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className={`shrink-0 p-2 bg-white border-t border-gray-200 z-20 transition-all duration-300 ${isPaused ? 'blur-sm pointer-events-none' : ''}`}>
        <div className={`grid ${isSolutionMode ? 'grid-cols-2' : 'grid-cols-3'} gap-3 max-w-6xl mx-auto`}>
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
              <Button variant="ghost" onClick={handleClear} className="text-gray-500 hover:bg-gray-100">
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
        <div className="absolute inset-0 z-[1250] bg-white/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 max-w-sm w-full relative overflow-hidden text-center transform transition-all scale-100">
               
               <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                 <Pause className="w-10 h-10 text-amber-500 fill-current" />
               </div>
               
               <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Test Paused</h2>
               <p className="text-gray-500 mb-8 font-medium">Take a break! Your progress is safe.</p>
               
               <div className="space-y-3">
                   <Button onClick={handleResume} className="w-full h-12 text-base shadow-blue-200">
                     <Play className="w-5 h-5 mr-2 fill-current" /> Resume Test
                   </Button>
                   <Button variant="outline" onClick={handleHome} className="w-full h-12 text-base border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                     <Home className="w-5 h-5 mr-2" /> Save & Exit
                   </Button>
               </div>
          </div>
        </div>
      )}

      {/* PALETTE MENU */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowMenu(false)}></div>
          <div className="relative w-[85%] max-w-xs bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <List className="w-5 h-5 text-gray-500" /> Question Palette
              </h2>
              <button onClick={() => setShowMenu(false)} className="p-2 rounded-full hover:bg-gray-200/50 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="grid grid-cols-5 gap-3">
                {questions.map((_, idx) => {
                  const stats = questionStats[idx];
                  let stateClass = "border-gray-200 text-gray-600 bg-white hover:border-gray-300"; 
                  
                  if (isSolutionMode) {
                     // Check currentQ.answer existence safely
                     const currentAns = questions[idx]?.answer;
                     const isCorrect = currentAns && stats?.selectedOption?.toLowerCase() === currentAns.toLowerCase();
                     const isSkipped = !stats?.selectedOption;
                     
                     if (isCorrect) stateClass = "bg-green-500 text-white border-green-500 shadow-sm";
                     else if (isSkipped) stateClass = "bg-gray-100 text-gray-400 border-gray-200";
                     else stateClass = "bg-red-500 text-white border-red-500 shadow-sm";
                  } else {
                     if (stats?.isMarkedForReview) stateClass = "bg-purple-500 text-white border-purple-500 shadow-sm";
                     else if (stats?.selectedOption) stateClass = "bg-blue-600 text-white border-blue-600 shadow-sm";
                     else if (stats?.isVisited) stateClass = "border-blue-400 text-blue-600 bg-blue-50 border-dashed";
                  }
                  
                  if (idx === currentQuestionIndex) {
                     stateClass += " ring-2 ring-offset-2 ring-blue-500 z-10 scale-105";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => { setCurrentQuestionIndex(idx); setShowMenu(false); setQuestionTime(0); }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border transition-all active:scale-95 ${stateClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-5 bg-gray-50 border-t border-gray-200 text-xs space-y-3 text-gray-500 shrink-0">
               <div className="grid grid-cols-2 gap-3 mb-2">
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div> Answered</div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Review</div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border-2 border-dashed border-blue-400"></div> Visited</div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border border-gray-300"></div> Not Visited</div>
               </div>
               
               {/* Submit Button in Palette */}
               {!isSolutionMode && (
                  <Button 
                    onClick={() => { setShowMenu(false); setShowSubmitDialog(true); }}
                    className="w-full bg-gray-900 hover:bg-black text-white shadow-lg h-12"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowSubmitDialog(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 overflow-hidden">
            
            <div className="flex flex-col items-center text-center mb-6">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <HelpCircle className="w-8 h-8" />
                 </div>
                 <h3 className="text-2xl font-black text-gray-900 mb-2">Submit Assessment?</h3>
                 <p className="text-gray-500 text-sm font-medium">
                   You are about to end this test. This action cannot be undone.
                 </p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-8">
                 <div className="grid grid-cols-3 gap-2 text-center divide-x divide-gray-200">
                     <div className="flex flex-col">
                        <span className="text-2xl font-black text-blue-600">
                            {Object.values(questionStats).filter((s) => (s as QuestionStatus).selectedOption).length}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Answered</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-2xl font-black text-purple-600">
                            {Object.values(questionStats).filter((s) => (s as QuestionStatus).isMarkedForReview).length}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Review</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-2xl font-black text-gray-400">
                            {Object.values(questionStats).filter((s) => !(s as QuestionStatus).selectedOption).length}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Skipped</span>
                     </div>
                 </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowSubmitDialog(false)} className="flex-1 h-12 text-gray-600 hover:bg-gray-100">Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1 h-12 shadow-blue-200">Confirm Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};