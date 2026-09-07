import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Clock,
  Users,
  Star,
  ExternalLink,
  Filter,
  Search,
  BookOpen,
  Award,
  X,
  Eye,
  Grid3X3,
  List,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import TaskBar from '@/components/TaskBar';
import { loadState, saveState } from '@/lib/storage';
import CourseHeroCarousel from '@/components/CourseHeroCarousel';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string | null;
  price: string | null;
  duration: string | null;
  level: string;
  category: string;
  image_url: string | null;
  link_url: string | null;
  is_featured: boolean;
  created_at: string;
}

const CATEGORIES = ['All', 'Math', 'Science', 'Languages', 'Programming', 'Business', 'Art', 'Music', 'General'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

type ViewMode = 'grid' | 'list';

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);

  // Get grading system for badge display
  const userState = loadState();
  const gradingSystem = userState?.settings?.gradingSystem ?? 'apc';

  // Analytics: Track page view (lazy loaded)
  useEffect(() => {
    import('@/services/analyticsService')
      .then(({ analyticsService }) => {
        analyticsService.trackPageView('courses', '/courses').catch(() => {});
      })
      .catch(() => {});
  }, []);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { user } = useAuth();

  // ── Saved courses (persisted in AppState for cloud sync) ──────────────────
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const state = loadState();
    return new Set(state?.savedCourseIds ?? []);
  });

  const persistSaved = useCallback((next: Set<string>) => {
    setSavedIds(next);
    const state = loadState();
    if (!state) return;
    saveState({ ...state, savedCourseIds: Array.from(next) });
  }, []);

  const toggleSave = useCallback((course: Course, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(course.id)) {
        next.delete(course.id);
        toast.success('Course removed from saved');
      } else {
        next.add(course.id);
        toast.success('Course saved!');
      }
      persistSaved(next);
      return next;
    });
  }, [persistSaved]);

  const [showSaved, setShowSaved] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(160);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderHeight(entry.target.clientHeight);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showFilters]);

const SAMPLE_COURSES: Course[] = [
  {
    id: "sample-course-1",
    title: "Mastering Baccalauréat Mathematics & Analysis",
    description: "Comprehensive step-by-step masterclass covering functions, probability, and complex numbers for Tle C & D.",
    instructor: "Prof. Jean-Paul K.",
    price: "Free",
    duration: "12 Hours",
    level: "Advanced",
    category: "Math",
    image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80",
    link_url: "https://gostudy.app",
    is_featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: "sample-course-2",
    title: "Physics & Chemistry Exam Prep Masterclass",
    description: "Complete review of mechanics, electricity, and organic chemistry with past exam problem breakdowns.",
    instructor: "Dr. Marc E.",
    price: "Free",
    duration: "8 Hours",
    level: "Intermediate",
    category: "Science",
    image_url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80",
    link_url: "https://gostudy.app",
    is_featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: "sample-course-3",
    title: "BEPC & Probatoire English & Essay Writing",
    description: "Master grammar, reading comprehension, and argumentative essays to score top points in English.",
    instructor: "Sarah Jenkins, M.Ed.",
    price: "Free",
    duration: "6 Hours",
    level: "Beginner",
    category: "Languages",
    image_url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
    link_url: "https://gostudy.app",
    is_featured: false,
    created_at: new Date().toISOString()
  }
];

  const fetchCourses = async () => {
    setLoading(true);
    try {
      console.log('📥 Courses: Fetching from Supabase...');
      
      const { data, error } = await supabase
        .from('course_posts')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        console.log(`✅ Courses: Fetched ${data.length} courses`);
        setCourses(data);
      } else {
        console.log('⚠️ Courses: No data, using samples');
        setCourses(SAMPLE_COURSES);
      }
    } catch (err) {
      console.warn('Using sample courses fallback:', err);
      setCourses(SAMPLE_COURSES);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Refreshing courses from server...');
    setLoading(true);
    
    try {
      // Force fresh fetch by using a timestamp query parameter to bypass cache
      const { data, error } = await supabase
        .from('course_posts')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        console.log(`✅ Courses Refreshed: ${data.length} courses`);
        setCourses(data);
        toast.success('Courses refreshed');
      } else {
        console.log('⚠️ No courses found after refresh');
        if (data && data.length === 0) {
          setCourses([]);
          toast.success('Courses refreshed (empty)');
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh courses');
    } finally {
      setLoading(false);
    }
  };

  const trackCourseView = async (courseId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('course_views')
        .upsert({ user_id: user.id, course_id: courseId })
        .then(() => {});
    } catch (err) {
      // Silent fail - analytics not critical
    }
  };

  const handleCourseClick = (course: Course) => {
    trackCourseView(course.id);
    setSelectedCourse(course);
  };

  const handleJoinCourse = (course: Course) => {
    if (course.link_url) {
      window.open(course.link_url, '_blank');
      setSelectedCourse(null);
    } else {
      toast.error('No registration link available');
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchesLevel = selectedLevel === 'All' || course.level === selectedLevel;
    const matchesSearch = searchQuery === '' || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesLevel && matchesSearch;
  });

  const featuredCourses = filteredCourses.filter(c => c.is_featured);
  const regularCourses = filteredCourses.filter(c => !c.is_featured);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // ── Save button ────────────────────────────────────────────────────────────
  const SaveButton = ({ course, size = 'md' }: { course: Course; size?: 'sm' | 'md' }) => {
    const saved = savedIds.has(course.id);
    const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
    const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return (
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => toggleSave(course, e)}
        className={`${dim} flex items-center justify-center rounded-xl border-2 transition-colors ${
          saved
            ? 'bg-secondary border-secondary text-secondary-foreground'
            : 'bg-card border-border text-muted-foreground hover:border-foreground/50'
        }`}
        title={saved ? 'Remove from saved' : 'Save course'}
      >
        {saved
          ? <BookmarkCheck className={icon} />
          : <Bookmark className={icon} />}
      </motion.button>
    );
  };

  const CourseCard = ({ course, featured = false }: { course: Course; featured?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border-2 border-border overflow-hidden card-shadow ${
        featured ? 'ring-2 ring-secondary/50' : ''
      }`}
    >
      {/* Image */}
      {course.image_url ? (
        <div className="relative overflow-hidden rounded-t-2xl bg-muted" style={{ height: '180px' }}>
          <img 
            src={course.image_url} 
            alt={course.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            style={{ contentVisibility: 'auto' }}
          />
          {featured && (
            <div className="absolute top-3 left-3 bg-secondary text-secondary-foreground px-2 py-1 rounded-lg text-xs font-black">
              <Star className="h-3 w-3 inline mr-1" />
              Featured
            </div>
          )}
        </div>
      ) : (
        <div className={`h-48 bg-muted flex items-center justify-center ${featured ? 'bg-secondary/10' : ''}`}>
          <GraduationCap className="h-16 w-16 text-muted-foreground/50" />
          {featured && (
            <div className="absolute top-3 left-3 bg-secondary text-secondary-foreground px-2 py-1 rounded-lg text-xs font-black">
              <Star className="h-3 w-3 inline mr-1" />
              Featured
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Title & Category */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black bg-muted text-muted-foreground px-2 py-1 rounded-lg">
              {course.category}
            </span>
            <span className={`text-xs font-black px-2 py-1 rounded-lg border ${getLevelColor(course.level)}`}>
              {course.level}
            </span>
          </div>
          <h3 className="text-lg font-black text-foreground leading-tight">{course.title}</h3>
        </div>

        {/* Description */}
        <p className="text-sm font-semibold text-muted-foreground leading-relaxed line-clamp-3">
          {course.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
          {course.instructor && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{course.instructor}</span>
            </div>
          )}
          {course.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{course.duration}</span>
            </div>
          )}
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {course.price && (
              <span className="text-lg font-black text-foreground">
                {course.price}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SaveButton course={course} />
            <button
              onClick={() => handleCourseClick(course)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-black text-sm active:scale-95 transition-transform"
            >
              <span>View Details</span>
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const CourseListItem = ({ course, featured = false }: { course: Course; featured?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border-2 border-border overflow-hidden card-shadow ${
        featured ? 'ring-2 ring-secondary/50' : ''
      }`}
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="flex-shrink-0">
          {course.image_url ? (
            <div className="relative w-24 h-24 overflow-hidden rounded-xl bg-muted">
              <img 
                src={course.image_url} 
                alt={course.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                style={{ contentVisibility: 'auto' }}
              />
              {featured && (
                <div className="absolute top-1 left-1 bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-xs font-black">
                  <Star className="h-2.5 w-2.5 inline mr-0.5" />
                </div>
              )}
            </div>
          ) : (
            <div className={`w-24 h-24 bg-muted flex items-center justify-center rounded-xl ${featured ? 'bg-secondary/10' : ''}`}>
              <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
              {featured && (
                <div className="absolute top-1 left-1 bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-xs font-black">
                  <Star className="h-2.5 w-2.5 inline mr-0.5" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title & Categories */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black bg-muted text-muted-foreground px-2 py-0.5 rounded">
                {course.category}
              </span>
              <span className={`text-xs font-black px-2 py-0.5 rounded border ${getLevelColor(course.level)}`}>
                {course.level}
              </span>
              {featured && (
                <Star className="h-3 w-3 text-secondary fill-current" />
              )}
            </div>
            <h3 className="text-base font-black text-foreground leading-tight line-clamp-1">{course.title}</h3>
          </div>

          {/* Description */}
          <p className="text-sm font-semibold text-muted-foreground leading-relaxed line-clamp-2">
            {course.description}
          </p>

          {/* Meta Info & Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
              {course.instructor && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="truncate max-w-20">{course.instructor}</span>
                </div>
              )}
              {course.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{course.duration}</span>
                </div>
              )}
            </div>
            {course.price && (
              <span className="text-sm font-black text-foreground">
                {course.price}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <SaveButton course={course} size="sm" />
          <button
            onClick={() => handleCourseClick(course)}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-xl font-black text-xs active:scale-95 transition-transform"
          >
            <Eye className="h-3 w-3" />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top pb-4">
        <div className="header-inner">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between pt-2 gap-3"
          >
            <div>
              <h1 className="text-xl font-black text-foreground flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-secondary" />
                Cours en Ligne
              </h1>
              <p className="text-xs font-bold text-muted-foreground mt-0.5">
                Découvrez des formations disponibles
              </p>
              {/* System Badge */}
              <div className="mt-1.5">
                {gradingSystem === "apc" && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30">
                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-blue-400">APC System</span>
                  </div>
                )}
                {gradingSystem === "french" && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30">
                    <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                    <span className="text-[10px] font-bold text-purple-400">French System</span>
                  </div>
                )}
                {gradingSystem === "nigerian_university" && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30">
                    <div className="w-1 h-1 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-bold text-green-400">Nigerian System</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow disabled:opacity-50"
                title="Refresh courses"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow"
              >
                <Filter className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow"
                title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid3X3 className="h-5 w-5" />}
              </button>
            </div>
          </motion.div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher des cours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 space-y-3"
              >
                {/* Categories */}
                <div>
                  <p className="text-xs font-black text-muted-foreground mb-2">CATÉGORIE</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {CATEGORIES.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-colors ${
                          selectedCategory === category
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Levels */}
                <div>
                  <p className="text-xs font-black text-muted-foreground mb-2">NIVEAU</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {LEVELS.map(level => (
                      <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-colors ${
                          selectedLevel === level
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="content-col space-y-6" style={{ paddingTop: headerHeight + 16 }}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Auto-Sliding Hero Carousel ── */}
            <CourseHeroCarousel courses={courses} onSelectCourse={handleCourseClick} />

            {/* ── Saved Courses ── */}
            {savedIds.size > 0 && (
              <div className="rounded-2xl border-2 border-secondary/40 bg-secondary/5 overflow-hidden">
                {/* Collapsible header */}
                <button
                  onClick={() => setShowSaved(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookmarkCheck className="h-5 w-5 text-secondary shrink-0" />
                    <span className="text-base font-black text-foreground truncate">Saved Courses</span>
                    <span className="text-xs font-black bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full shrink-0">
                      {savedIds.size}
                    </span>
                  </div>
                  <motion.div animate={{ rotate: showSaved ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 ml-2">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {showSaved && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {courses
                          .filter(c => savedIds.has(c.id))
                          .map(course => (
                            <motion.div
                              key={course.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="flex items-center gap-3 bg-card rounded-2xl border-2 border-border p-3 card-shadow"
                            >
                              {/* Thumbnail */}
                              <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border">
                                {course.image_url
                                  ? <img 
                                      src={course.image_url} 
                                      alt={course.title} 
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover" 
                                      style={{ contentVisibility: 'auto' }}
                                    />
                                  : <GraduationCap className="h-6 w-6 text-muted-foreground/50" />}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-foreground leading-tight line-clamp-1">{course.title}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-black bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                    {course.category}
                                  </span>
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${getLevelColor(course.level)}`}>
                                    {course.level}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleCourseClick(course)}
                                  className="h-8 w-8 flex items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-90 transition-transform"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => toggleSave(course, e)}
                                  className="h-8 w-8 flex items-center justify-center rounded-xl bg-secondary/20 border border-secondary/40 text-secondary active:scale-90 transition-transform"
                                  title="Remove from saved"
                                >
                                  <BookmarkCheck className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {/* Featured Courses */}
            {featuredCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-secondary" />
                  Cours en Vedette
                </h2>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuredCourses.map(course => (
                      <CourseCard key={course.id} course={course} featured />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {featuredCourses.map(course => (
                      <CourseListItem key={course.id} course={course} featured />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Regular Courses */}
            {regularCourses.length > 0 && (
              <div>
                {featuredCourses.length > 0 && (
                  <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Tous les Cours
                  </h2>
                )}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regularCourses.map(course => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {regularCourses.map(course => (
                      <CourseListItem key={course.id} course={course} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {filteredCourses.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted border-2 border-border">
                  <GraduationCap className="h-9 w-9 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="font-black text-foreground text-base">Aucun cours trouvé</p>
                  <p className="text-sm font-semibold text-muted-foreground mt-1">
                    Essayez de modifier vos filtres de recherche
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Course Detail Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCourse(null)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t-2 border-border max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 border-2 border-secondary/30">
                    <GraduationCap className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">{selectedCourse.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black bg-muted text-muted-foreground px-2 py-1 rounded-lg">
                        {selectedCourse.category}
                      </span>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg border ${getLevelColor(selectedCourse.level)}`}>
                        {selectedCourse.level}
                      </span>
                      {selectedCourse.is_featured && (
                        <Star className="h-4 w-4 text-secondary fill-current" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SaveButton course={selectedCourse} />
                  <button onClick={() => setSelectedCourse(null)}>
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[70vh] p-6 space-y-6">
                {/* Course Image */}
                {selectedCourse.image_url && (
                  <div className="rounded-2xl overflow-hidden border-2 border-border">
                    <img 
                      src={selectedCourse.image_url} 
                      alt={selectedCourse.title}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                )}

                {/* Description */}
                <div>
                  <h3 className="text-sm font-black text-foreground mb-2 uppercase tracking-widest">Description</h3>
                  <p className="text-sm font-semibold text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedCourse.description}
                  </p>
                </div>

                {/* Course Details */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedCourse.instructor && (
                    <div className="bg-card rounded-xl border-2 border-border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-secondary" />
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Instructeur</span>
                      </div>
                      <p className="text-sm font-black text-foreground">{selectedCourse.instructor}</p>
                    </div>
                  )}

                  {selectedCourse.duration && (
                    <div className="bg-card rounded-xl border-2 border-border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-secondary" />
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Durée</span>
                      </div>
                      <p className="text-sm font-black text-foreground">{selectedCourse.duration}</p>
                    </div>
                  )}

                  {selectedCourse.price && (
                    <div className="bg-card rounded-xl border-2 border-border p-4 col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-secondary" />
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Prix</span>
                      </div>
                      <p className="text-lg font-black text-foreground">{selectedCourse.price}</p>
                    </div>
                  )}
                </div>

                {/* Join Button */}
                <div className="pt-4">
                  {selectedCourse.link_url ? (
                    <button
                      onClick={() => handleJoinCourse(selectedCourse)}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-secondary text-secondary-foreground rounded-2xl font-black text-base active:scale-95 transition-transform border-2 border-foreground card-shadow"
                    >
                      <GraduationCap className="h-5 w-5" />
                      <span>Rejoindre le Cours</span>
                      <ExternalLink className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-3 py-4 bg-muted text-muted-foreground rounded-2xl font-black text-base border-2 border-border">
                      <span>Lien d'inscription non disponible</span>
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="text-center pt-2">
                  <p className="text-xs font-bold text-muted-foreground">
                    Cours ajouté le {new Date(selectedCourse.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TaskBar - hidden when course modal is open */}
      {!selectedCourse && <TaskBar />}
    </div>
  );
}
