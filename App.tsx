import React, { useEffect, useState, useRef, useMemo } from 'react';
import Header from './components/Header';
import CategoryCard from './components/CategoryCard';
import PostItem from './components/PostItem';
import { TestInterface } from './components/TestInterface';
import { ReadingInterface } from './components/ReadingInterface';
import { BlogPost, Category, CurrentAffairEntry, QuizResult, QuizQuestion, QuizProgress } from './types';
import { supabase } from './lib/supabase';
import { 
  Loader2, Calendar, PlayCircle, RotateCcw, 
  Lock, ChevronDown, ChevronRight, ChevronUp, FileText, ArrowLeft, 
  ZoomOut, ZoomIn, Eye, EyeOff, BookOpen, Globe, Clock, ChevronLeft
} from 'lucide-react';

const App: React.FC = () => {
  // --- State: UI & Data ---
  const [activeCategory, setActiveCategory] = useState<string>('current-affairs');
  
  // State: Current Affairs (Quiz Mode)
  const [currentAffairsTab, setCurrentAffairsTab] = useState<'Daily' | 'Weekly'>('Daily');
  const [currentAffairsList, setCurrentAffairsList] = useState<CurrentAffairEntry[]>([]);
  const [loadingCurrentAffairs, setLoadingCurrentAffairs] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  
  // State: Reading Mode Pagination
  const [readingItems, setReadingItems] = useState<CurrentAffairEntry[]>([]);
  const [readingPage, setReadingPage] = useState(0);
  const [loadingReading, setLoadingReading] = useState(false);
  const READING_PAGE_SIZE = 7;
  
  // State: Saved Progress (for Resume functionality)
  const [savedProgressIds, setSavedProgressIds] = useState<Set<string>>(new Set());

  // State: Accordions (Stores "Month Year" strings)
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());
  
  // State: Modals (Quiz, Reading, Reader)
  const [activeQuiz, setActiveQuiz] = useState<{ entry: CurrentAffairEntry; mode: 'attempt' | 'solution'; initialProgress?: QuizProgress } | null>(null);
  const [activeReadingEntry, setActiveReadingEntry] = useState<CurrentAffairEntry | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  
  // State: Reader Settings
  const [zoomLevel, setZoomLevel] = useState(1);
  const [readerDarkMode, setReaderDarkMode] = useState(false);
  
  // Constants: Categories
  const categories: Category[] = [
    {
      id: 'current-affairs',
      label: 'Attempt Quiz',
      iconType: 'svg',
      iconContent: 'globe',
      gradientClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
      shadowClass: 'shadow-blue-200'
    },
    {
      id: 'reading-mode',
      label: 'Recent CA',
      iconType: 'svg',
      iconContent: 'book',
      gradientClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      shadowClass: 'shadow-emerald-200'
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

  // Initial Load: Fetch Local Data, Saved Progress, and Check URL for Deep Links
  useEffect(() => {
    const savedResults = localStorage.getItem('dailygraph_quiz_results');
    if (savedResults) {
        try {
            setQuizResults(JSON.parse(savedResults));
        } catch (e) { console.error("Failed to parse quiz results", e); }
    }
    refreshSavedProgress();

    // Check URL for readingId (Deep Linking for SEO)
    const params = new URLSearchParams(window.location.search);
    const readingId = params.get('readingId');
    if (readingId) {
        // Automatically switch to Reading category
        setActiveCategory('reading-mode');
        // Fetch specific entry
        fetchEntryById(readingId).then(entry => {
            if (entry) setActiveReadingEntry(entry);
        });
    }
  }, []);

  // Refresh progress when a quiz is closed (to update Resume buttons)
  useEffect(() => {
    if (!activeQuiz) {
        refreshSavedProgress();
    }
  }, [activeQuiz]);

  // Handle Browser Back Button for Modals and URL Synchronization
  useEffect(() => {
    const isModalOpen = !!activeQuiz || !!selectedPost || !!activeReadingEntry;

    if (isModalOpen) {
        // Construct the URL based on state
        // If a reading entry is open, put its ID in the URL
        let newUrl = window.location.pathname;
        if (activeReadingEntry) {
            newUrl += `?readingId=${activeReadingEntry.id}`;
        }
        
        // Push state so back button works to close modal
        window.history.pushState({ modalOpen: true }, '', newUrl);

        const handlePopState = () => {
            setActiveQuiz(null);
            setSelectedPost(null);
            setActiveReadingEntry(null);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    } else {
        // Ensure URL is clean if no modal is open (via UI close button)
        // We use replaceState to avoid creating a new history entry just for cleaning
        const params = new URLSearchParams(window.location.search);
        if (params.has('readingId')) {
             window.history.replaceState(null, '', window.location.pathname);
        }
    }
  }, [!!activeQuiz, !!selectedPost, !!activeReadingEntry]);

  // Fetch Current Affairs for Quiz Mode
  useEffect(() => {
      fetchCurrentAffairs();
  }, []);

  // Fetch Reading Mode Data when category changes or page changes
  useEffect(() => {
    if (activeCategory === 'reading-mode') {
        fetchReadingModeData(readingPage);
    }
  }, [activeCategory, readingPage]);

  // Handle Tab Switch: Default to Current Month Expansion
  useEffect(() => {
    const currentMonth = getCurrentMonthKey();
    setExpandedAccordions(new Set([currentMonth]));
  }, [currentAffairsTab, activeCategory]);

  // Lock Body Scroll for Modals
  useEffect(() => {
    if (selectedPost || activeQuiz || activeReadingEntry) {
      document.body.style.overflow = 'hidden';
      if (selectedPost) {
        setZoomLevel(1);
        setReaderDarkMode(false);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedPost, activeQuiz, activeReadingEntry]);

  // --- Data Fetching ---

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

  const fetchReadingModeData = async (page: number) => {
    setLoadingReading(true);
    const from = page * READING_PAGE_SIZE;
    const to = from + READING_PAGE_SIZE - 1;

    try {
        const { data, error } = await supabase
            .from('current_affairs')
            .select('id, upload_date, questions')
            .order('upload_date', { ascending: false })
            .range(from, to);
        
        if (error) throw error;

        if (data) {
            const formatted = data.map((item: any) => ({
                id: item.id,
                upload_date: item.upload_date,
                questions: item.questions
            }));
            setReadingItems(formatted);
        }
    } catch (error) {
        console.error('Error fetching Reading Mode Data:', error);
    } finally {
        setLoadingReading(false);
    }
  };

  // Helper to fetch a single entry for Deep Linking
  const fetchEntryById = async (id: string): Promise<CurrentAffairEntry | null> => {
      try {
          const { data, error } = await supabase
              .from('current_affairs')
              .select('id, upload_date, questions')
              .eq('id', id)
              .single();
          
          if (error) throw error;
          if (data) {
              return {
                  id: data.id,
                  upload_date: data.upload_date,
                  questions: data.questions
              };
          }
      } catch (error) {
          console.error('Error fetching specific entry:', error);
      }
      return null;
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

  // --- Aggregated Data Logic (Quiz Mode) ---
  
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
            return data.some((w: any) => w.questionCount > 0);
        }
        return data.length > 0;
    })
    .sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
  });

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

        {/* --- Current Affairs Quiz View --- */}
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
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                </button>
                                
                                {isExpanded && (
                                    <div className="border-t border-gray-100 divide-y divide-gray-50 bg-white">
                                        {items.map((entry: CurrentAffairEntry) => {
                                            const result = quizResults[entry.id];
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

        {/* --- Reading Mode View --- */}
        {activeCategory === 'reading-mode' && (
             <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-lg font-bold text-gray-800">Recent Current Affairs</h2>
                </div>

                {loadingReading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-medium">Loading reading material...</span>
                    </div>
                ) : readingItems.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
                        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No updates available to read.</p>
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 gap-3">
                        {readingItems
                            .filter(item => {
                                const title = item.questions?.title?.toLowerCase() || '';
                                return !title.includes('weekly') && !title.includes('monthly');
                            })
                            .map(entry => {
                            const questionCount = entry.questions?.questions?.length || 0;
                            const displayDate = new Date(entry.upload_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            const displayTitle = `Daily Current Affairs ${displayDate}`;

                            return (
                                <article 
                                    key={entry.id}
                                    onClick={() => setActiveReadingEntry(entry)}
                                    className="group flex flex-col p-4 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 flex-shrink-0 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                                    {displayTitle}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                    {questionCount} Questions • Read Now
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-6 px-2">
                        <button 
                            onClick={() => setReadingPage(p => Math.max(0, p - 1))}
                            disabled={readingPage === 0}
                            className="flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                        </button>
                        <span className="text-sm font-bold text-gray-500">Page {readingPage + 1}</span>
                        <button 
                            onClick={() => setReadingPage(p => p + 1)}
                            disabled={readingItems.length < READING_PAGE_SIZE}
                            className="flex items-center px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-emerald-200"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                    </>
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

      {/* --- Reading Mode Modal --- */}
      {activeReadingEntry && (
        <ReadingInterface 
            entry={activeReadingEntry}
            onBack={() => setActiveReadingEntry(null)}
        />
      )}

      {/* --- Reader Modal (Legacy Posts) --- */}
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