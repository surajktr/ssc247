import React, { useEffect, useState, useRef, useMemo } from 'react';
import Header from './components/Header';
import CategoryCard from './components/CategoryCard';
import PostItem from './components/PostItem';
import { TestInterface } from './components/TestInterface';
import { BlogPost, Category, CurrentAffairEntry, QuizResult, QuizQuestion, QuizProgress, VocabEntry, VocabQuestionRaw } from './types';
import { supabase } from './lib/supabase';
import { 
  Loader2, Calendar, PlayCircle, RotateCcw, 
  Lock, ChevronDown, ChevronRight, ChevronUp, FileText, ArrowLeft, 
  ZoomOut, ZoomIn, Eye, EyeOff, BookOpen, Globe, Clock, Trophy, Play
} from 'lucide-react';

const App: React.FC = () => {
  // --- State: UI & Data ---
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('current-affairs');
  
  // State: Current Affairs
  const [currentAffairsTab, setCurrentAffairsTab] = useState<'Daily' | 'Weekly'>('Daily');
  const [currentAffairsList, setCurrentAffairsList] = useState<CurrentAffairEntry[]>([]);
  const [loadingCurrentAffairs, setLoadingCurrentAffairs] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  
  // State: Vocab
  const [vocabTab, setVocabTab] = useState<string>('Synonyms');
  const [vocabList, setVocabList] = useState<VocabEntry[]>([]);
  
  // State: Saved Progress (for Resume functionality)
  const [savedProgressIds, setSavedProgressIds] = useState<Set<string>>(new Set());

  // State: Accordions (Stores "Month Year" strings)
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());
  
  // State: Modals (Quiz & Reader)
  const [activeQuiz, setActiveQuiz] = useState<{ entry: CurrentAffairEntry; mode: 'attempt' | 'solution'; initialProgress?: QuizProgress } | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  
  // State: Reader Settings
  const [zoomLevel, setZoomLevel] = useState(1);
  const [readerDarkMode, setReaderDarkMode] = useState(false);
  
  // State: Recent Posts (Legacy / Fallback)
  const [posts, setPosts] = useState<BlogPost[]>([]);

  // Refs
  const articleContainerRef = useRef<HTMLDivElement>(null);

  // Constants: Categories
  const categories: Category[] = [
    {
      id: 'current-affairs',
      label: 'Current Affairs',
      iconType: 'svg',
      iconContent: 'globe',
      gradientClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
      shadowClass: 'shadow-blue-200'
    },
    {
      id: 'vocab',
      label: 'Vocab',
      iconType: 'svg',
      iconContent: 'book',
      gradientClass: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      shadowClass: 'shadow-indigo-200'
    }
  ];

  // Constants: Weeks
  const WEEK_RANGES = [
      { id: 1, label: 'Week 1 (1st - 7th)', start: 1, end: 7 },
      { id: 2, label: 'Week 2 (8th - 14th)', start: 8, end: 14 },
      { id: 3, label: 'Week 3 (15th - 21st)', start: 15, end: 21 },
      { id: 4, label: 'Week 4 (22nd - End)', start: 22, end: 31 }
  ];

  // --- Helpers ---
  
  const getCurrentMonthKey = () => {
      return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Cleans the title by removing " - Month Year" or similar date suffixes
  const cleanTitle = (title: string) => {
    if (!title) return '';
    return title.replace(/\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\d,]*$/i, '');
  };

  const getVirtualWeekEntry = (weekItem: any, monthKey: string): CurrentAffairEntry => {
    return {
        id: weekItem.id,
        upload_date: new Date().toISOString(),
        questions: {
            title: `${monthKey} - ${weekItem.label}`,
            description: `Aggregated Current Affairs for ${weekItem.label}`,
            questions: weekItem.questions
        }
    };
  };

  const checkAndLoadProgress = (entry: CurrentAffairEntry): QuizProgress | undefined => {
      const savedKey = `quiz_progress_${entry.id}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
          try {
              return JSON.parse(saved) as QuizProgress;
          } catch (e) {
              console.error("Failed to parse saved progress", e);
              return undefined;
          }
      }
      return undefined;
  };

  const refreshSavedProgress = () => {
      const keys = Object.keys(localStorage);
      const progressIds = keys
          .filter(k => k.startsWith('quiz_progress_'))
          .map(k => k.replace('quiz_progress_', ''));
      setSavedProgressIds(new Set(progressIds));
  };

  // --- Effects ---

  // Initial Load: Fetch Local Data & Saved Progress
  useEffect(() => {
    const savedResults = localStorage.getItem('dailygraph_quiz_results');
    if (savedResults) {
        try {
            setQuizResults(JSON.parse(savedResults));
        } catch (e) { console.error("Failed to parse quiz results", e); }
    }
    refreshSavedProgress();
  }, []);

  // Refresh progress when a quiz is closed (to update Resume buttons)
  useEffect(() => {
    if (!activeQuiz) {
        refreshSavedProgress();
    }
  }, [activeQuiz]);

  // Handle Browser Back Button for Modals
  useEffect(() => {
    const isModalOpen = !!activeQuiz || !!selectedPost;

    if (isModalOpen) {
        // Push state when opening modal to allow back button to close it
        window.history.pushState({ modalOpen: true }, '', window.location.href);

        const handlePopState = () => {
            // Close modals on back button
            setActiveQuiz(null);
            setSelectedPost(null);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }
  }, [!!activeQuiz, !!selectedPost]);

  // Fetch Current Affairs when active
  useEffect(() => {
    if (activeCategory === 'current-affairs') {
        fetchCurrentAffairs();
    } else if (activeCategory === 'vocab') {
        fetchVocabQuestions();
    }
  }, [activeCategory]);

  // Handle Tab Switch: Default to Current Month Expansion
  useEffect(() => {
    const currentMonth = getCurrentMonthKey();
    setExpandedAccordions(new Set([currentMonth]));
  }, [currentAffairsTab, activeCategory]);

  // Lock Body Scroll for Modals
  useEffect(() => {
    if (selectedPost || activeQuiz) {
      document.body.style.overflow = 'hidden';
      if (selectedPost) {
        setZoomLevel(1);
        setReaderDarkMode(false);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedPost, activeQuiz]);

  // --- Data Fetching ---

  const fetchVocabQuestions = async () => {
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('vocab_questions')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      if (data) {
        setVocabList(data as VocabEntry[]);
      }
    } catch (error) {
      console.error('Error fetching vocab:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchCurrentAffairs = async () => {
      setLoadingCurrentAffairs(true);
      try {
          const { data, error } = await supabase
              .from('current_affairs')
              .select('id, upload_date, questions')
              .order('upload_date', { ascending: false });
          
          if (error) throw error;

          if (data) {
              const formatted = data.map((item: any) => ({
                  id: item.id,
                  upload_date: item.upload_date,
                  questions: item.questions
              }));
              setCurrentAffairsList(formatted);
          }
      } catch (error) {
          console.error('Error fetching CA:', error);
      } finally {
          setLoadingCurrentAffairs(false);
      }
  };

  const fetchPostContent = async (post: BlogPost) => {
      // Legacy support for any old blog posts, though new flow uses Quiz
      try {
          const { data, error } = await supabase
            .from('daily_graphs')
            .select('content_html, css')
            .eq('id', post.id)
            .single();
            
          if (error) throw error;
          
          if (data) {
              setSelectedPost({
                  ...post,
                  htmlContent: data.content_html,
                  styles: data.css
              });
          }
      } catch (e) {
          console.error("Error fetching post content", e);
      }
  };

  // --- Logic for Grouping Current Affairs ---
  
  const toggleAccordion = (key: string) => {
    const newSet = new Set(expandedAccordions);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedAccordions(newSet);
  };

  // --- Aggregated Data Logic ---
  
  const getDailyGrouped = useMemo(() => {
    if (currentAffairsTab === 'Weekly') return {};

    const filtered = currentAffairsList.filter(item => {
        const title = item.questions?.title?.toLowerCase() || '';
        return !title.includes('weekly') && !title.includes('monthly');
    });

    const grouped: Record<string, CurrentAffairEntry[]> = {};
    filtered.forEach(item => {
        if (!item.upload_date) return;
        const date = new Date(item.upload_date);
        if (isNaN(date.getTime())) return;

        const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(item);
    });

    return grouped;
  }, [currentAffairsList, currentAffairsTab]);

  const getWeeklyAggregated = useMemo(() => {
    if (currentAffairsTab !== 'Weekly') return {};

    const dailyItems = currentAffairsList.filter(item => {
        const t = item.questions?.title?.toLowerCase() || '';
        return !t.includes('weekly') && !t.includes('monthly');
    });

    const groupedByMonth: Record<string, CurrentAffairEntry[]> = {};
    dailyItems.forEach(item => {
        if (!item.upload_date) return;
        const date = new Date(item.upload_date);
        if (isNaN(date.getTime())) return;

        const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
        groupedByMonth[monthKey].push(item);
    });

    const weeklyData: Record<string, any[]> = {};
    const today = new Date();

    Object.keys(groupedByMonth).forEach(monthKey => {
        const monthItems = groupedByMonth[monthKey];
        const monthDate = new Date(Date.parse(monthKey));
        
        const weeks = WEEK_RANGES.map(range => {
            const weekEndDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), range.end);
            weekEndDate.setHours(23, 59, 59, 999);
            const isLocked = today < weekEndDate;
            
            let aggregatedQuestions: QuizQuestion[] = [];
            monthItems.forEach(item => {
                const itemDate = new Date(item.upload_date);
                const day = itemDate.getDate();
                if (day >= range.start && day <= range.end) {
                    if (item.questions?.questions) {
                        aggregatedQuestions = [...aggregatedQuestions, ...item.questions.questions];
                    }
                }
            });

            const virtualId = `weekly-${monthKey.replace(/\s/g, '-')}-wk${range.id}`;

            return {
                ...range,
                id: virtualId,
                questions: aggregatedQuestions,
                questionCount: aggregatedQuestions.length,
                isLocked,
                displayDate: range.label
            };
        });

        weeklyData[monthKey] = weeks;
    });

    return weeklyData;
  }, [currentAffairsList, currentAffairsTab]);

  const activeGroupedData = currentAffairsTab === 'Weekly' ? getWeeklyAggregated : getDailyGrouped;
  
  // Filter out empty months (those with 0 content/questions)
  const sortedMonthKeys = Object.keys(activeGroupedData)
    .filter(monthKey => {
        const data = activeGroupedData[monthKey];
        if (!data) return false;
        
        if (currentAffairsTab === 'Weekly') {
            // For weekly, check if any week has questions > 0
            return data.some((w: any) => w.questionCount > 0);
        }
        // For daily, check if array is not empty
        return data.length > 0;
    })
    .sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
  });

  // --- Vocab Helpers ---

  // Helper to extract questions based on active vocab tab
  const getQuestionsForVocabTab = (entry: VocabEntry): VocabQuestionRaw[] => {
    switch (vocabTab) {
      case 'Synonyms': return entry.syno_questions || [];
      case 'Antonyms': return entry.antonyms_questions || [];
      case 'Idioms': return entry.idioms_questions || [];
      case 'OWS': return entry.ows_questions || [];
      default: return [];
    }
  };

  // Filter Vocab List to only show entries that have data for the active tab
  const filteredVocabList = useMemo(() => {
    return vocabList.filter(entry => {
      const q = getQuestionsForVocabTab(entry);
      return q && q.length > 0;
    });
  }, [vocabList, vocabTab]);

  // Transform VocabQuestionRaw (from JSON) to QuizQuestion (for App Interface)
  const transformVocabToQuizQuestion = (vocabEntry: VocabEntry): CurrentAffairEntry => {
    const rawQuestions = getQuestionsForVocabTab(vocabEntry);
    
    const transformedQuestions: QuizQuestion[] = rawQuestions.map((q) => {
      // Convert options object {"A": "val", ...} to array [{label: "A", text_en: "val", ...}]
      const optionsArray = Object.entries(q.options).map(([key, value]) => ({
        label: key,
        text_en: value,
        text_hi: "" // Vocab options usually English only or standard
      })).sort((a, b) => a.label.localeCompare(b.label));

      return {
        id: q.id,
        question_en: q.question,
        question_hi: "", // Vocab usually doesn't have Hindi question text
        options: optionsArray,
        answer: q.answer,
        explanation_en: q.solution
      };
    });

    // Create a virtual ID that includes the tab so progress is saved uniquely per tab
    // e.g., "vocab-uuid-Synonyms"
    const virtualId = `vocab-${vocabEntry.id}-${vocabTab}`;

    return {
      id: virtualId,
      upload_date: vocabEntry.upload_date,
      questions: {
        title: `${vocabTab} - ${new Date(vocabEntry.upload_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
        description: `Vocabulary Practice: ${vocabTab}`,
        questions: transformedQuestions
      }
    };
  };

  const startVocabQuiz = (entry: VocabEntry) => {
    const virtualEntry = transformVocabToQuizQuestion(entry);
    const progress = checkAndLoadProgress(virtualEntry);
    setActiveQuiz({ entry: virtualEntry, mode: 'attempt', initialProgress: progress });
  };


  // --- Render Helpers ---

  const handleQuizComplete = (result: QuizResult) => {
      if (!activeQuiz) return;
      
      const newResults = { ...quizResults, [activeQuiz.entry.id]: result };
      setQuizResults(newResults);
      localStorage.setItem('dailygraph_quiz_results', JSON.stringify(newResults));
      
      // Clear progress for this item if it exists
      localStorage.removeItem(`quiz_progress_${activeQuiz.entry.id}`);
      refreshSavedProgress();

      // Switch to solution mode
      setActiveQuiz({ ...activeQuiz, mode: 'solution', initialProgress: undefined });
  };

  const startQuiz = (entry: CurrentAffairEntry) => {
      const progress = checkAndLoadProgress(entry);
      setActiveQuiz({ entry, mode: 'attempt', initialProgress: progress });
  };

  const startWeeklyQuiz = (weekItem: any, monthKey: string) => {
      if (weekItem.isLocked || weekItem.questionCount === 0) return;
      const virtualEntry = getVirtualWeekEntry(weekItem, monthKey);
      startQuiz(virtualEntry);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
      <Header />
      
      {/* Changed max-w-3xl to max-w-6xl for wider view on Desktop */}
      <main className="max-w-6xl mx-auto p-3 space-y-4">
        
        {/* Category Navigation */}
        <section className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <CategoryCard 
              key={cat.id} 
              category={cat} 
              isSelected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </section>

        {/* --- Current Affairs View --- */}
        {activeCategory === 'current-affairs' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            {/* Tabs */}
            <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm">
              {(['Daily', 'Weekly'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCurrentAffairsTab(tab)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                    currentAffairsTab === tab 
                      ? 'bg-blue-100 text-blue-800 shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* List Content */}
            {loadingCurrentAffairs ? (
                <div className="flex flex-col items-center justify-center py-20 text-blue-600">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-sm font-medium">Loading updates...</span>
                </div>
            ) : sortedMonthKeys.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No updates found for this category.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedMonthKeys.map(month => {
                        const isExpanded = expandedAccordions.has(month);
                        
                        // Handle Weekly Render
                        if (currentAffairsTab === 'Weekly') {
                            const weeks = activeGroupedData[month] || [];
                            return (
                                <div key={month} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                                    <button 
                                        onClick={() => toggleAccordion(month)}
                                        className={`w-full flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <span className={`block font-bold text-base ${isExpanded ? 'text-blue-900' : 'text-gray-800'}`}>{month}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-gray-100 divide-y divide-gray-50 bg-white">
                                            {weeks.map((week: any) => {
                                                const result = quizResults[week.id];
                                                const isLocked = week.isLocked;
                                                const hasQuestions = week.questionCount > 0;
                                                const canAttempt = !isLocked && hasQuestions;
                                                const isResumable = savedProgressIds.has(week.id);
                                                
                                                return (
                                                    <div key={week.id} className="px-3 py-3 flex flex-row items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className={`text-sm font-bold mb-1 truncate ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                                                                {week.label}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 font-medium flex items-center truncate">
                                                                <Clock className="w-3 h-3 mr-1 shrink-0" />
                                                                {isLocked 
                                                                    ? "Available after week ends" 
                                                                    : `${week.questionCount} Questions`
                                                                }
                                                            </p>
                                                        </div>

                                                        <div className="shrink-0 flex items-center gap-2">
                                                            {isLocked ? (
                                                                <div className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg border border-gray-200 flex items-center">
                                                                    <Lock className="w-3 h-3 mr-1" /> Locked
                                                                </div>
                                                            ) : (result && !isResumable) ? (
                                                                <>
                                                                    <button 
                                                                        onClick={() => setActiveQuiz({ entry: getVirtualWeekEntry(week, month), mode: 'solution' })}
                                                                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                                                    >
                                                                        Solution
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => startWeeklyQuiz(week, month)}
                                                                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                                        title="Re-attempt"
                                                                    >
                                                                        <RotateCcw className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => canAttempt && startWeeklyQuiz(week, month)}
                                                                    disabled={!canAttempt}
                                                                    className={`flex items-center justify-center px-4 py-2 ${isResumable ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'} text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
                                                                >
                                                                    {isResumable ? (
                                                                        <>Resume <PlayCircle className="w-3 h-3 ml-1 fill-current" /></>
                                                                    ) : (
                                                                        <>Attempt <ChevronRight className="w-3 h-3 ml-1" /></>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Handle Daily Render
                        const items = activeGroupedData[month] || [];
                        return (
                            <div key={month} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                                <button 
                                    onClick={() => toggleAccordion(month)}
                                    className={`w-full flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <span className={`block font-bold text-base ${isExpanded ? 'text-blue-900' : 'text-gray-800'}`}>{month}</span>
                                            <span className="text-xs text-gray-500 font-medium">{items.length} updates</span>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                </button>
                                
                                {isExpanded && (
                                    <div className="border-t border-gray-100 divide-y divide-gray-50 bg-white">
                                        {items.map((entry: CurrentAffairEntry) => {
                                            const result = quizResults[entry.id];
                                            
                                            // Override title for Daily CA as requested to "Daily Current Affairs"
                                            const displayTitle = "Daily Current Affairs";
                                            const questionCount = entry.questions?.questions?.length || 0;
                                            const isResumable = savedProgressIds.has(entry.id);

                                            return (
                                                <div key={entry.id} className="px-3 py-3 flex flex-row items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">
                                                            {displayTitle}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 font-medium flex items-center truncate">
                                                            <Clock className="w-3 h-3 mr-1 shrink-0" />
                                                            {new Date(entry.upload_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                            <span className="mx-2 text-gray-300">•</span>
                                                            <span>{questionCount} Questions</span>
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="shrink-0 flex items-center gap-2">
                                                        {(result && !isResumable) ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => setActiveQuiz({ entry, mode: 'solution' })}
                                                                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                                                >
                                                                    Solution
                                                                </button>
                                                                <button 
                                                                    onClick={() => startQuiz(entry)}
                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                                    title="Re-attempt"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => startQuiz(entry)}
                                                                className={`flex items-center justify-center px-4 py-2 ${isResumable ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'} text-xs font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap`}
                                                            >
                                                                {isResumable ? (
                                                                    <>Resume <PlayCircle className="w-3 h-3 ml-1 fill-current" /></>
                                                                ) : (
                                                                    <>Attempt <ChevronRight className="w-3 h-3 ml-1" /></>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
        )}

        {/* --- Vocab/Editorial View --- */}
        {activeCategory === 'vocab' && (
             <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-lg font-bold text-gray-800">Vocab Updates</h2>
                </div>

                {/* Vocab Tabs */}
                <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-x-auto no-scrollbar">
                  {['Synonyms', 'Antonyms', 'Idioms', 'OWS'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setVocabTab(tab)}
                      className={`flex-1 min-w-[80px] py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                        vocabTab === tab 
                          ? 'bg-blue-100 text-blue-800 shadow-sm' 
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {loadingPosts ? (
                    <div className="flex flex-col items-center justify-center py-20 text-blue-600">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-medium">Loading vocab...</span>
                    </div>
                ) : filteredVocabList.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
                        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No {vocabTab} updates found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {filteredVocabList.map(vocabEntry => {
                            // Construct virtual ID for result tracking
                            const virtualId = `vocab-${vocabEntry.id}-${vocabTab}`;
                            const result = quizResults[virtualId];
                            const questions = getQuestionsForVocabTab(vocabEntry);
                            const count = questions.length;
                            const isResumable = savedProgressIds.has(virtualId);
                            
                            return (
                                <article 
                                    key={vocabEntry.id}
                                    className="h-full flex flex-col p-4 rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 flex-shrink-0 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-gray-800">
                                                    {vocabTab} - {new Date(vocabEntry.upload_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                    {count} Questions • {new Date(vocabEntry.upload_date).getFullYear()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-1">
                                         {(result && !isResumable) ? (
                                            <>
                                                <button 
                                                    onClick={() => {
                                                        const virtualEntry = transformVocabToQuizQuestion(vocabEntry);
                                                        setActiveQuiz({ entry: virtualEntry, mode: 'solution' });
                                                    }}
                                                    className="flex-1 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 flex items-center justify-center"
                                                >
                                                    Solution
                                                </button>
                                                <button 
                                                    onClick={() => startVocabQuiz(vocabEntry)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
                                                    title="Re-attempt"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={() => startVocabQuiz(vocabEntry)}
                                                className={`flex-1 py-2 ${isResumable ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-600 text-white border-transparent'} border text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center`}
                                            >
                                                {isResumable ? 'Resume Quiz' : 'Start Quiz'} <ChevronRight className="w-3 h-3 ml-1" />
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
             </div>
        )}
      </main>

      {/* --- Quiz Modal --- */}
      {activeQuiz && (
        <TestInterface 
            entry={activeQuiz.entry}
            mode={activeQuiz.mode}
            initialProgress={activeQuiz.initialProgress}
            existingResult={quizResults[activeQuiz.entry.id]}
            onExit={() => setActiveQuiz(null)}
            onComplete={handleQuizComplete}
        />
      )}

      {/* --- Reader Modal --- */}
      {selectedPost && (
        <div className="fixed inset-0 z-[1200] bg-white flex flex-col animate-in slide-in-from-bottom-10 duration-200">
            {/* Reader Header */}
            <div className={`bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm ${readerDarkMode ? 'bg-gray-900 border-gray-800 text-white' : ''}`}>
                <button 
                    onClick={() => setSelectedPost(null)}
                    className={`p-2 rounded-full transition-colors ${readerDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setReaderDarkMode(!readerDarkMode)}
                        className={`p-2 rounded-full transition-colors ${readerDarkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
                    >
                        {readerDarkMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <div className={`flex items-center rounded-lg border ${readerDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                        <button 
                            onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))}
                            className={`p-2 hover:bg-gray-200/50 ${readerDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className={`text-xs font-mono w-10 text-center ${readerDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button 
                             onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))}
                             className={`p-2 hover:bg-gray-200/50 ${readerDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reader Content */}
            <div 
                className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${readerDarkMode ? 'bg-gray-950' : 'bg-white'}`}
            >
                <article 
                    className={`max-w-2xl mx-auto prose prose-lg ${readerDarkMode ? 'prose-invert' : 'prose-emerald'}`}
                    style={{ 
                        zoom: zoomLevel,
                    }}
                >
                    <h1 className="mb-2">{selectedPost.title}</h1>
                    <p className="text-sm text-gray-500 font-sans mb-8 border-b pb-4">
                        Published on {selectedPost.date}
                    </p>
                    
                    {/* Render HTML Content safely */}
                    {selectedPost.htmlContent ? (
                         <div dangerouslySetInnerHTML={{ __html: selectedPost.htmlContent }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <FileText className="w-16 h-16 mb-4" />
                            <p>Loading content...</p>
                        </div>
                    )}
                    
                    {/* Inject scoped styles if any */}
                    {selectedPost.styles && (
                        <style>{selectedPost.styles}</style>
                    )}
                </article>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;