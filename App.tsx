import React, { useEffect, useState, useRef, useMemo } from 'react';
import Header from './components/Header';
import CategoryCard from './components/CategoryCard';
import Footer from './components/Footer';
import { InfoPage } from './components/InfoPages';
import { TestInterface } from './components/TestInterface';
import { ReadingInterface } from './components/ReadingInterface';
import { BlogPost, Category, CurrentAffairEntry, QuizResult, QuizQuestion, QuizProgress } from './types';
import { supabase } from './lib/supabase';
import { 
  Loader2, Calendar, PlayCircle, RotateCcw, 
  Lock, ChevronDown, ChevronRight, ChevronUp, FileText, ArrowLeft, 
  ZoomOut, ZoomIn, Eye, EyeOff, BookOpen, Clock, ChevronLeft, DownloadCloud,
  Layers
} from 'lucide-react';

const App: React.FC = () => {
  // --- State: UI & Data ---
  const [activeCategory, setActiveCategory] = useState<string>('reading-mode');
  
  // State: Data Management
  const [allEntries, setAllEntries] = useState<CurrentAffairEntry[]>([]);
  
  // Pagination & Loading States
  const [pageMap, setPageMap] = useState({ daily: 0, topic: 0 });
  const [hasMoreMap, setHasMoreMap] = useState({ daily: true, topic: true });
  const [loadingMap, setLoadingMap] = useState({ daily: false, topic: false });
  const [loadingAction, setLoadingAction] = useState(false); // Global loading for Quiz
  const [isReadingLoading, setIsReadingLoading] = useState(false); // Specific loading for Reading Skeleton
  
  // State: Month Management (Weekly Tab)
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set());
  const [monthLoadingMap, setMonthLoadingMap] = useState<Record<string, boolean>>({});

  const BATCH_SIZE = 7; 

  // State: Tabs
  const [readingTab, setReadingTab] = useState<'Daily' | 'Topic Wise'>('Daily');
  const [currentAffairsTab, setCurrentAffairsTab] = useState<'Daily' | 'Weekly' | 'Topic Wise'>('Daily');
  
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  
  // State: Reading Mode Pagination
  const [readingUiPage, setReadingUiPage] = useState(0);
  
  // State: Saved Progress
  const [savedProgressIds, setSavedProgressIds] = useState<Set<string>>(new Set());

  // State: Accordions
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());
  
  // State: Modals
  const [activeQuiz, setActiveQuiz] = useState<{ entry: CurrentAffairEntry; mode: 'attempt' | 'solution'; initialProgress?: QuizProgress } | null>(null);
  const [activeReadingEntry, setActiveReadingEntry] = useState<CurrentAffairEntry | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [infoPage, setInfoPage] = useState<'terms' | 'contact' | null>(null);
  
  // State: Reader Settings
  const [zoomLevel, setZoomLevel] = useState(1);
  const [readerDarkMode, setReaderDarkMode] = useState(false);

  // Constants: Categories
  const categories: Category[] = [
    {
      id: 'reading-mode',
      label: 'Current Affairs',
      iconType: 'svg',
      iconContent: 'book',
      gradientClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      shadowClass: 'shadow-emerald-200'
    },
    {
      id: 'current-affairs',
      label: 'CA Quiz',
      iconType: 'svg',
      iconContent: 'globe',
      gradientClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
      shadowClass: 'shadow-blue-200'
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
        },
        source: 'daily'
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
  
  const parseQuestions = (q: any) => {
      if (!q) return { title: '', description: '', questions: [] };
      let parsed = q;
      if (typeof q === 'string') {
          try { 
              parsed = JSON.parse(q); 
              if (typeof parsed === 'string') {
                  parsed = JSON.parse(parsed);
              }
          } catch(e) { 
              return { title: '', description: '', questions: [] }; 
          }
      }

      // Helper to normalize options and answer
      const normalizeQuestion = (item: any) => {
          let normalized = { ...item };

          // Hide scripts
          delete normalized.question_script;
          delete normalized.extra_details_speech_script;

          // If options is string[] (new format)
          if (Array.isArray(item.options) && typeof item.options[0] === 'string') {
              const newOptions = item.options.map((opt: string, idx: number) => ({
                  label: String.fromCharCode(65 + idx), // A, B, C...
                  text_en: opt,
                  text_hi: opt // Fallback for Hindi as new format usually provides English options in the array
              }));
              
              // Find answer label by text matching
              let answerLabel = item.answer;
              if (item.answer) {
                  // Some answers might be exact strings from options
                  const matchingOpt = newOptions.find((o: any) => o.text_en.toLowerCase() === String(item.answer).toLowerCase());
                  if (matchingOpt) {
                      answerLabel = matchingOpt.label;
                  }
              }

              normalized.options = newOptions;
              normalized.answer = answerLabel;
          }
          
          // Ensure Hindi explanation has fallback if extra_details exists
          if (!normalized.explanation_hi && normalized.extra_details) {
              normalized.explanation_hi = normalized.extra_details;
          }

          return normalized;
      };

      // Scenario 1: New JSON format { date: "...", data: [...] }
      if (parsed.data && Array.isArray(parsed.data)) {
          const questions = parsed.data.map(normalizeQuestion);
          const titleDate = parsed.date || '';
          const title = titleDate ? `Daily Current Affairs - ${titleDate}` : 'Daily Current Affairs';
          
          return { 
              title: title, 
              description: '', 
              questions: questions 
          };
      }

      // Scenario 2: Simple Array (Legacy)
      if (Array.isArray(parsed)) {
          return { title: 'Daily Current Affairs', description: '', questions: parsed.map(normalizeQuestion) };
      }

      // Scenario 3: Object with questions array (Legacy Standard)
      if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.questions)) {
              return {
                  ...parsed,
                  questions: parsed.questions.map(normalizeQuestion)
              };
          }
          return { ...parsed, questions: [] };
      }
      return { title: '', description: '', questions: [] };
  };

  // --- Effects ---
  useEffect(() => {
    const savedResults = localStorage.getItem('dailygraph_quiz_results');
    if (savedResults) {
        try {
            setQuizResults(JSON.parse(savedResults));
        } catch (e) { console.error("Failed to parse quiz results", e); }
    }
    refreshSavedProgress();
    fetchData('daily', 0);
    initAvailableMonths();

    const params = new URLSearchParams(window.location.search);
    const deepLinkId = params.get('id') || params.get('readingId');
    if (deepLinkId && deepLinkId.length > 5) {
        setActiveCategory('reading-mode');
        // For deep links, we fetch with skeleton effect
        setIsReadingLoading(true);
        // Temporary placeholder entry while fetching
        const tempEntry: CurrentAffairEntry = { 
            id: deepLinkId, 
            upload_date: new Date().toISOString(), 
            questions: { title: 'Loading...', description: '', questions: [] } 
        };
        setActiveReadingEntry(tempEntry);
        
        fetchEntryById(deepLinkId).then(entry => {
            if (entry) setActiveReadingEntry(entry);
            setIsReadingLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    const isTopicTab = readingTab === 'Topic Wise' || currentAffairsTab === 'Topic Wise';
    const hasTopics = allEntries.some(e => e.source === 'topic');
    if (isTopicTab && !hasTopics && !loadingMap.topic && hasMoreMap.topic) {
        fetchData('topic', 0);
    }
  }, [readingTab, currentAffairsTab]);

  useEffect(() => {
    if (!activeQuiz) {
        refreshSavedProgress();
    }
  }, [activeQuiz]);

  useEffect(() => {
    const isModalOpen = !!activeQuiz || !!selectedPost || !!activeReadingEntry || !!infoPage;
    if (isModalOpen) {
        const currentPath = window.location.pathname;
        const newParams = new URLSearchParams(window.location.search);
        if (activeReadingEntry && !isReadingLoading) {
            const qData = activeReadingEntry.questions;
            let firstQuestion = "daily-current-affairs";
            if (qData && qData.questions && Array.isArray(qData.questions) && qData.questions.length > 0) {
                 const qText = qData.questions[0]?.question_en;
                 if (qText) firstQuestion = String(qText);
            }
            const slug = firstQuestion.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 100); 
            const dateStr = new Date(activeReadingEntry.upload_date).toISOString().split('T')[0];
            newParams.set('post', `${slug}-${dateStr}`);
            newParams.set('id', activeReadingEntry.id);
        }
        const queryString = newParams.toString();
        const newUrl = queryString ? `${currentPath}?${queryString}` : currentPath;
        if (window.location.search !== (queryString ? `?${queryString}` : '')) {
            window.history.pushState({ modalOpen: true }, '', newUrl);
        }
        const handlePopState = () => {
            setActiveQuiz(null);
            setSelectedPost(null);
            setActiveReadingEntry(null);
            setInfoPage(null);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    } else {
        const params = new URLSearchParams(window.location.search);
        if (params.has('id') || params.has('readingId') || params.has('post') || window.location.search === '?') {
             window.history.replaceState(null, '', window.location.pathname);
        }
    }
  }, [activeQuiz, selectedPost, activeReadingEntry, infoPage, isReadingLoading]);

  useEffect(() => {
    const currentMonth = getCurrentMonthKey();
    setExpandedAccordions(new Set([currentMonth]));
  }, [currentAffairsTab, activeCategory, readingTab]);

  useEffect(() => {
    if (selectedPost || activeQuiz || activeReadingEntry || infoPage || loadingAction) {
      document.body.style.overflow = 'hidden';
      if (selectedPost) {
        setZoomLevel(1);
        setReaderDarkMode(false);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedPost, activeQuiz, activeReadingEntry, infoPage, loadingAction]);

  // --- Data Fetching ---
  const fetchData = async (source: 'daily' | 'topic', pageToFetch: number) => {
      setLoadingMap(prev => ({ ...prev, [source]: true }));
      const tableName = source === 'daily' ? 'current_affairs' : 'topicwise';
      const from = pageToFetch * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;
      
      // Always fetch questions to display counts immediately
      const selectFields = 'id, upload_date, questions';

      try {
          const { data, error } = await supabase
              .from(tableName)
              .select(selectFields)
              .order('upload_date', { ascending: false })
              .range(from, to);
          if (error) throw error;
          if (data && data.length > 0) {
              const formatted = data.map((item: any) => ({
                  id: item.id,
                  upload_date: item.upload_date,
                  questions: parseQuestions(item.questions),
                  source: source
              }));
              setAllEntries(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const newUnique = formatted.filter((f: any) => !existingIds.has(f.id));
                  return [...prev, ...newUnique];
              });
              if (data.length < BATCH_SIZE) {
                  setHasMoreMap(prev => ({ ...prev, [source]: false }));
              }
          } else {
              setHasMoreMap(prev => ({ ...prev, [source]: false }));
          }
          setPageMap(prev => ({ ...prev, [source]: pageToFetch }));
      } catch (error) {
          console.error(`Error fetching ${source} data:`, error);
      } finally {
          setLoadingMap(prev => ({ ...prev, [source]: false }));
      }
  };

  // Initialize available months list and auto-load current month
  const initAvailableMonths = async () => {
    try {
        const { data, error } = await supabase.from('current_affairs').select('upload_date').order('upload_date', { ascending: false });
        if (error) throw error;
        if (data) {
            const uniqueMonths = Array.from(new Set((data as any[]).map(d => 
                new Date(d.upload_date).toLocaleString('default', { month: 'long', year: 'numeric' })
            )));
            setAvailableMonths(uniqueMonths);
            
            // Auto-load current month (first in list)
            if (uniqueMonths.length > 0) {
                fetchMonthData(uniqueMonths[0]);
            }
        }
    } catch (e) {
        console.error("Error fetching available months", e);
    }
  };

  const fetchMonthData = async (monthKey: string) => {
    if (loadedMonths.has(monthKey)) return;
    
    setMonthLoadingMap(prev => ({ ...prev, [monthKey]: true }));
    
    try {
        const monthDate = new Date(Date.parse(`1 ${monthKey}`));
        if (isNaN(monthDate.getTime())) return;

        const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const { data, error } = await supabase
            .from('current_affairs')
            .select('id, upload_date, questions')
            .gte('upload_date', start.toISOString())
            .lte('upload_date', end.toISOString())
            .order('upload_date', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            const formatted = data.map((item: any) => ({
                id: item.id,
                upload_date: item.upload_date,
                questions: parseQuestions(item.questions),
                source: 'daily'
            }));
            
            setAllEntries(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newUnique = formatted.filter((f: any) => !existingIds.has(f.id));
                // We append but sorting handles the display
                return [...prev, ...newUnique];
            });
            setLoadedMonths(prev => new Set(prev).add(monthKey));
        }
    } catch (e) {
        console.error(`Error loading month ${monthKey}`, e);
    } finally {
        setMonthLoadingMap(prev => ({ ...prev, [monthKey]: false }));
    }
  };

  const handleLoadMore = () => {
      let targetSource: 'daily' | 'topic' = 'daily';
      if (activeCategory === 'reading-mode') {
          targetSource = readingTab === 'Topic Wise' ? 'topic' : 'daily';
      } else {
          targetSource = currentAffairsTab === 'Topic Wise' ? 'topic' : 'daily';
      }
      const nextPage = pageMap[targetSource] + 1;
      fetchData(targetSource, nextPage);
  };

  const fetchEntryById = async (id: string): Promise<CurrentAffairEntry | null> => {
      try {
          let { data, error } = await supabase.from('current_affairs').select('id, upload_date, questions').eq('id', id).single();
          if (data) return { id: data.id, upload_date: data.upload_date, questions: parseQuestions(data.questions), source: 'daily' };
          ({ data, error } = await supabase.from('topicwise').select('id, upload_date, questions').eq('id', id).single());
          if (data) return { id: data.id, upload_date: data.upload_date, questions: parseQuestions(data.questions), source: 'topic' };
      } catch (error) {
          console.error('Error fetching specific entry:', error);
      }
      return null;
  };

  const fetchWeeklyQuestions = async (monthKey: string, startDay: number, endDay: number) => {
      try {
          const monthDate = new Date(Date.parse(`1 ${monthKey}`));
          if (isNaN(monthDate.getTime())) return [];

          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          
          const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
          const actualEndDay = Math.min(endDay, lastDayOfMonth);
          
          const start = new Date(year, month, startDay);
          start.setHours(0, 0, 0, 0);
          
          const end = new Date(year, month, actualEndDay);
          end.setHours(23, 59, 59, 999);

          const { data, error } = await supabase
              .from('current_affairs')
              .select('questions')
              .gte('upload_date', start.toISOString())
              .lte('upload_date', end.toISOString());

          if (error) throw error;
          
          if (data) {
              const allQs = data.flatMap((item: any) => {
                   const parsed = parseQuestions(item.questions);
                   return parsed.questions || [];
              });
              return allQs;
          }
      } catch (e) {
          console.error("Error fetching weekly", e);
      }
      return [];
  };

  const toggleAccordion = (key: string) => {
    const newSet = new Set(expandedAccordions);
    if (newSet.has(key)) {
        newSet.delete(key); 
    } else {
        newSet.add(key);
        // If in Weekly CA Quiz, ensure we have full data for this month
        if (activeCategory === 'current-affairs' && currentAffairsTab === 'Weekly') {
            fetchMonthData(key);
        }
    }
    setExpandedAccordions(newSet);
  };

  const getGroupedData = useMemo(() => {
    const activeTab = currentAffairsTab;
    const targetSource = activeTab === 'Topic Wise' ? 'topic' : 'daily';
    const filteredItems = allEntries.filter(item => (item.source || 'daily') === targetSource);
    
    // Sort items to ensure correct display order
    filteredItems.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());

    const grouped: Record<string, CurrentAffairEntry[]> = {};
    filteredItems.forEach(item => {
        if (!item.upload_date) return;
        const date = new Date(item.upload_date);
        if (isNaN(date.getTime())) return;
        const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(item);
    });
    return grouped;
  }, [allEntries, currentAffairsTab]);

  const getWeeklyAggregated = useMemo(() => {
    if (currentAffairsTab !== 'Weekly') return {};
    const dailyItems = allEntries.filter(item => (item.source || 'daily') === 'daily');
    const groupedByMonth: Record<string, CurrentAffairEntry[]> = {};
    
    // Group loaded items by month
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
    
    // Use all available months if populated (from fetch), otherwise fallback to loaded data keys
    const months = availableMonths.length > 0 ? availableMonths : (Object.keys(groupedByMonth).length > 0 ? Object.keys(groupedByMonth) : [getCurrentMonthKey()]);

    months.forEach(monthKey => {
        const monthItems = groupedByMonth[monthKey] || [];
        const monthDate = new Date(Date.parse(`1 ${monthKey}`));
        
        if (isNaN(monthDate.getTime())) return;

        const weeks = WEEK_RANGES.map(range => {
            const weekEndDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), range.end);
            weekEndDate.setHours(23, 59, 59, 999);
            const isLocked = today < weekEndDate;
            
            let aggregatedCount = 0;
            monthItems.forEach(item => {
                const itemDate = new Date(item.upload_date);
                const day = itemDate.getDate();
                if (day >= range.start && day <= range.end) {
                    if (item.questions?.questions) aggregatedCount += item.questions.questions.length;
                }
            });

            return {
                ...range,
                id: `weekly-${monthKey.replace(/\s/g, '-')}-wk${range.id}`,
                questions: [], 
                questionCount: aggregatedCount, 
                isLocked,
                displayDate: range.label
            };
        });
        weeklyData[monthKey] = weeks;
    });
    return weeklyData;
  }, [allEntries, currentAffairsTab, availableMonths]);

  const activeGroupedData = currentAffairsTab === 'Weekly' ? getWeeklyAggregated : getGroupedData;
  const sortedMonthKeys = Object.keys(activeGroupedData)
    .sort((a, b) => new Date(Date.parse(`1 ${b}`)).getTime() - new Date(Date.parse(`1 ${a}`)).getTime());

  const handleQuizComplete = (result: QuizResult) => {
      if (!activeQuiz) return;
      const newResults = { ...quizResults, [activeQuiz.entry.id]: result };
      setQuizResults(newResults);
      localStorage.setItem('dailygraph_quiz_results', JSON.stringify(newResults));
      localStorage.removeItem(`quiz_progress_${activeQuiz.entry.id}`);
      refreshSavedProgress();
      setActiveQuiz({ ...activeQuiz, mode: 'solution', initialProgress: undefined });
  };

  const startQuiz = async (entry: CurrentAffairEntry, isPreLoaded = false) => {
      let entryToUse = entry;
      
      // Fetch full content if it wasn't preloaded
      if (!isPreLoaded) {
           setLoadingAction(true);
           try {
               const fullData = await fetchEntryById(entry.id);
               if (fullData) {
                   entryToUse = fullData;
               } else {
                   if (!entry.questions?.questions?.length) {
                       alert("Content unavailable. Please check your connection.");
                       setLoadingAction(false);
                       return;
                   }
               }
           } catch (e) {
               console.error(e);
           } finally {
               setLoadingAction(false);
           }
      }

      const progress = checkAndLoadProgress(entryToUse);
      setActiveQuiz({ entry: entryToUse, mode: 'attempt', initialProgress: progress });
  };

  const startWeeklyQuiz = async (weekItem: any, monthKey: string) => {
      if (weekItem.isLocked) return;
      
      setLoadingAction(true);
      try {
          const questions = await fetchWeeklyQuestions(monthKey, weekItem.start, weekItem.end);
          
          if (!questions || questions.length === 0) {
              alert("No questions found for this week.");
              return;
          }
          
          const virtualEntry: CurrentAffairEntry = {
              id: weekItem.id,
              upload_date: new Date().toISOString(),
              questions: {
                  title: `${monthKey} - ${weekItem.label}`,
                  description: `Aggregated Current Affairs`,
                  questions: questions
              },
              source: 'daily'
          };
          
          startQuiz(virtualEntry, true);
      } finally {
          setLoadingAction(false);
      }
  };

  const handleReadingClick = async (entry: CurrentAffairEntry) => {
      // 1. Immediately open interface with existing entry
      setActiveReadingEntry(entry);
      
      // Only show skeleton if content is missing (e.g. partial fetch from deep link)
      // Otherwise, assume data is fresh enough from main list fetch
      const hasContent = entry.questions?.questions?.length > 0;
      setIsReadingLoading(!hasContent);

      try {
          // 2. Fetch full content in background to ensure freshness or get complete details
          const fullData = await fetchEntryById(entry.id);
          if (fullData) {
              setActiveReadingEntry(fullData);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsReadingLoading(false);
      }
  };

  const readingItemsFiltered = useMemo(() => {
     const targetSource = readingTab === 'Topic Wise' ? 'topic' : 'daily';
     const items = allEntries.filter(item => (item.source || 'daily') === targetSource);
     // Ensure sorting by date desc
     return items.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
  }, [allEntries, readingTab]);

  const readingItemsSlice = useMemo(() => {
      const start = readingUiPage * BATCH_SIZE;
      const end = start + BATCH_SIZE;
      return readingItemsFiltered.slice(start, end);
  }, [readingItemsFiltered, readingUiPage]);

  useEffect(() => { setReadingUiPage(0); }, [readingTab]);

  const handleReadingNext = () => {
      const nextPage = readingUiPage + 1;
      const requiredDataCount = (nextPage + 1) * BATCH_SIZE;
      if (requiredDataCount > readingItemsFiltered.length) {
           const targetSource = readingTab === 'Topic Wise' ? 'topic' : 'daily';
           if (hasMoreMap[targetSource]) handleLoadMore();
      }
      setReadingUiPage(nextPage);
  };
  
  const isCurrentLoading = activeCategory === 'reading-mode' ? loadingMap[readingTab === 'Topic Wise' ? 'topic' : 'daily'] : loadingMap[currentAffairsTab === 'Topic Wise' ? 'topic' : 'daily'];
  const hasMoreCurrent = activeCategory === 'reading-mode' ? hasMoreMap[readingTab === 'Topic Wise' ? 'topic' : 'daily'] : hasMoreMap[currentAffairsTab === 'Topic Wise' ? 'topic' : 'daily'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 relative">
      {/* Global Loading Overlay (Only for Actions like Quiz start, NOT reading click) */}
      {loadingAction && (
          <div className="fixed inset-0 z-[1500] bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center animate-in zoom-in-95 duration-200">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                  <p className="font-bold text-gray-700">Loading Content...</p>
              </div>
          </div>
      )}

      <Header />
      <main className="max-w-6xl mx-auto p-3 space-y-4 w-full flex-grow">
        <section className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <CategoryCard key={cat.id} category={cat} isSelected={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id)} />
          ))}
        </section>

        {activeCategory === 'current-affairs' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              {(['Daily', 'Weekly', 'Topic Wise'] as const).map((tab) => (
                <button key={tab} onClick={() => setCurrentAffairsTab(tab)} className={`flex-1 min-w-[80px] py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${currentAffairsTab === tab ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>{tab}</button>
              ))}
            </div>
            {activeGroupedData && Object.keys(activeGroupedData).length === 0 && isCurrentLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-blue-600">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-sm font-medium">Loading updates...</span>
                </div>
            ) : sortedMonthKeys.length === 0 && !isCurrentLoading ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                    {currentAffairsTab === 'Topic Wise' ? <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" /> : <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
                    <p className="text-gray-500 font-medium">No {currentAffairsTab.toLowerCase()} content found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedMonthKeys.map(month => {
                        const isExpanded = expandedAccordions.has(month);
                        const isLoadingThisMonth = monthLoadingMap[month];
                        
                        if (currentAffairsTab === 'Weekly') {
                            const weeks = activeGroupedData[month] || [];
                            return (
                                <div key={month} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                                    <button onClick={() => toggleAccordion(month)} className={`w-full flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}><Calendar className="w-5 h-5" /></div>
                                            <span className={`block font-bold text-base ${isExpanded ? 'text-blue-900' : 'text-gray-800'}`}>{month}</span>
                                        </div>
                                        {isLoadingThisMonth ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : (isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />)}
                                    </button>
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 divide-y divide-gray-50 bg-white">
                                            {isLoadingThisMonth ? (
                                                <div className="p-4 text-center text-sm text-gray-500 flex flex-col items-center">
                                                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-500" />
                                                    Fetching full month data...
                                                </div>
                                            ) : weeks.map((week: any) => {
                                                const result = quizResults[week.id];
                                                const isResumable = savedProgressIds.has(week.id);
                                                return (
                                                    <div key={week.id} className="px-3 py-3 flex flex-row items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className={`text-sm font-bold mb-1 truncate ${week.isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{week.label}</h3>
                                                            {/* Only show Question count if we have data, otherwise show generic */}
                                                            <p className="text-xs text-gray-500 font-medium flex items-center truncate">
                                                                <Clock className="w-3 h-3 mr-1 shrink-0" />
                                                                {week.isLocked ? "Available after week ends" : `${week.questionCount || 0} Questions`}
                                                            </p>
                                                        </div>
                                                        <div className="shrink-0 flex items-center gap-2">
                                                            {week.isLocked ? (
                                                                <div className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg border border-gray-200 flex items-center"><Lock className="w-3 h-3 mr-1" /> Locked</div>
                                                            ) : (result && !isResumable) ? (
                                                                <><button onClick={() => setActiveQuiz({ entry: getVirtualWeekEntry(week, month), mode: 'solution' })} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">Solution</button><button onClick={() => startWeeklyQuiz(week, month)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Re-attempt"><RotateCcw className="w-4 h-4" /></button></>
                                                            ) : (
                                                                <button onClick={() => startWeeklyQuiz(week, month)} className={`flex items-center justify-center px-4 py-2 ${isResumable ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'} text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}>{isResumable ? <>Resume <PlayCircle className="w-3 h-3 ml-1 fill-current" /></> : <>Attempt <ChevronRight className="w-3 h-3 ml-1" /></>}</button>
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
                        const items = activeGroupedData[month] || [];
                        return (
                            <div key={month} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                                <button onClick={() => toggleAccordion(month)} className={`w-full flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{currentAffairsTab === 'Topic Wise' ? <Layers className="w-5 h-5"/> : <Calendar className="w-5 h-5" />}</div>
                                        <span className={`block font-bold text-base ${isExpanded ? 'text-blue-900' : 'text-gray-800'}`}>{month}</span>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-gray-100 divide-y divide-gray-50 bg-white">
                                        {items.map((entry: CurrentAffairEntry) => {
                                            const result = quizResults[entry.id];
                                            const isResumable = savedProgressIds.has(entry.id);
                                            const qCount = entry.questions?.questions?.length || 0;
                                            return (
                                                <div key={entry.id} className="px-3 py-3 flex flex-row items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">{entry.questions?.title || "Daily Current Affairs"}</h3>
                                                        <p className="text-xs text-gray-500 font-medium flex items-center truncate">
                                                            {currentAffairsTab !== 'Topic Wise' && (
                                                                <>
                                                                    <Clock className="w-3 h-3 mr-1 shrink-0" />
                                                                    {new Date(entry.upload_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                                    <span className="mx-2 text-gray-300">•</span>
                                                                </>
                                                            )}
                                                            <span>{qCount} Questions</span>
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-2">
                                                        {(result && !isResumable) ? (
                                                            <><button onClick={() => setActiveQuiz({ entry, mode: 'solution' })} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">Solution</button><button onClick={() => startQuiz(entry)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Re-attempt"><RotateCcw className="w-4 h-4" /></button></>
                                                        ) : (
                                                            <button onClick={() => startQuiz(entry)} className={`flex items-center justify-center px-4 py-2 ${isResumable ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'} text-xs font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap`}>{isResumable ? <>Resume <PlayCircle className="w-3 h-3 ml-1 fill-current" /></> : <>Attempt <ChevronRight className="w-3 h-3 ml-1" /></>}</button>
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
                    
                    {/* Only show load more if NOT in Weekly tab */}
                    {hasMoreCurrent && currentAffairsTab !== 'Weekly' && (
                        <div className="pt-2 text-center">
                            <button onClick={handleLoadMore} disabled={isCurrentLoading} className="inline-flex items-center px-6 py-3 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50">{isCurrentLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</> : <>Load Older Quizzes <DownloadCloud className="w-4 h-4 ml-2" /></>}</button>
                        </div>
                    )}
                </div>
            )}
          </div>
        )}

        {activeCategory === 'reading-mode' && (
             <div className="animate-in fade-in duration-300">
                <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
                  {(['Daily', 'Topic Wise'] as const).map((tab) => (
                    <button key={tab} onClick={() => setReadingTab(tab)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${readingTab === tab ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>{tab}</button>
                  ))}
                </div>
                {readingItemsFiltered.length === 0 && isCurrentLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-sm font-medium">Loading reading material...</span>
                    </div>
                ) : readingItemsSlice.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
                        {readingTab === 'Topic Wise' ? <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" /> : <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />}
                        <p className="text-gray-500 text-sm">No {readingTab.toLowerCase()} content available.</p>
                        {hasMoreCurrent && <button onClick={handleLoadMore} className="mt-2 text-sm text-emerald-600 font-bold hover:underline">Try loading items</button>}
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 gap-3">
                        {readingItemsSlice.map(entry => {
                            const displayDate = new Date(entry.upload_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            const qCount = entry.questions?.questions?.length || 0;
                            return (
                                <article key={entry.id} onClick={() => handleReadingClick(entry)} className="group flex flex-col p-4 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all duration-200 cursor-pointer">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 flex-shrink-0 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">{readingTab === 'Topic Wise' ? <Layers className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}</div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">{entry.questions?.title || `Daily Current Affairs ${displayDate}`}</h3>
                                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                    {qCount} Questions
                                                    {/* Hide date if Topic Wise */}
                                                    {readingTab !== 'Topic Wise' && ` • ${displayDate}`}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-between mt-6 px-2">
                        <button onClick={() => setReadingUiPage(p => Math.max(0, p - 1))} disabled={readingUiPage === 0} className="flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</button>
                        <span className="text-sm font-bold text-gray-500">Page {readingUiPage + 1}</span>
                        <button onClick={handleReadingNext} disabled={!hasMoreCurrent && readingUiPage * BATCH_SIZE + BATCH_SIZE >= readingItemsFiltered.length} className="flex items-center px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-emerald-200">{isCurrentLoading ? 'Loading...' : 'Next'} <ChevronRight className="w-4 h-4 ml-2" /></button>
                    </div>
                    </>
                )}
             </div>
        )}
      </main>
      <Footer onOpenTerms={() => setInfoPage('terms')} onOpenContact={() => setInfoPage('contact')} />
      {activeQuiz && <TestInterface entry={activeQuiz.entry} mode={activeQuiz.mode} initialProgress={activeQuiz.initialProgress} existingResult={quizResults[activeQuiz.entry.id]} onExit={() => setActiveQuiz(null)} onComplete={handleQuizComplete} />}
      {activeReadingEntry && <ReadingInterface entry={activeReadingEntry} isLoading={isReadingLoading} onBack={() => setActiveReadingEntry(null)} />}
      {infoPage && <InfoPage type={infoPage} onClose={() => setInfoPage(null)} />}
    </div>
  );
};

export default App;