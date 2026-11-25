import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Clock, Users, Eye, Sparkles } from "lucide-react";
import { coverImage, isNewsPost, type FeedPost } from "@/lib/feed-posts";
import { useLanguage } from "@/contexts/LanguageContext";

export type CourseItem = FeedPost;

interface CourseHeroCarouselProps {
  courses: CourseItem[];
  onSelectCourse: (course: CourseItem) => void;
}

export default function CourseHeroCarousel({ courses, onSelectCourse }: CourseHeroCarouselProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 1. Determine hero slides:
  // If admin has featured/promoted courses, use them. Otherwise, shuffle and pick up to 5 courses.
  const featuredCourses = courses.filter((c) => c.is_featured);
  const slides = (featuredCourses.length > 0 ? featuredCourses : courses).slice(0, 5);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  if (slides.length === 0) return null;

  const currentCourse = slides[currentIndex] || slides[0];
  const heroImage = coverImage(currentCourse);
  const news = isNewsPost(currentCourse);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border-2 border-foreground bg-card card-shadow"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCourse.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative min-h-[220px] sm:min-h-[260px] flex flex-col justify-between p-5 sm:p-6"
        >
          {/* Background Poster Image Overlay */}
          {heroImage ? (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src={heroImage}
                alt={currentCourse.title}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={800}
                height={420}
                className="w-full h-full object-cover filter brightness-[0.35] dark:brightness-[0.25] scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-background" />
          )}

          {/* Top Banner Tag */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-secondary text-secondary-foreground text-[11px] font-black px-3 py-1 rounded-full border border-foreground/20 shadow-sm">
                {currentCourse.is_featured ? (
                  <>
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{t("featured").toUpperCase()}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{t("trending").toUpperCase()}</span>
                  </>
                )}
              </span>

              <span className="text-[11px] font-black bg-background/80 backdrop-blur text-foreground px-2.5 py-1 rounded-full border border-foreground/20">
                {currentCourse.category}
              </span>
            </div>

            {!news && currentCourse.price && (
              <span className="text-sm font-black bg-primary text-primary-foreground px-3 py-1 rounded-full border border-foreground/20">
                {currentCourse.price}
              </span>
            )}
          </div>

          {/* Center Course Content */}
          <div className="relative z-10 my-3 space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-foreground drop-shadow-sm leading-tight line-clamp-2">
              {currentCourse.title}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-foreground/80 line-clamp-2 max-w-xl leading-relaxed">
              {currentCourse.description}
            </p>

            <div className="flex items-center gap-4 text-xs font-bold text-foreground/70 pt-1">
              {currentCourse.instructor && (
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-secondary" />
                  <span className="truncate">{currentCourse.instructor}</span>
                </div>
              )}
              {currentCourse.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-secondary" />
                  <span>{currentCourse.duration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions & Slide Controls */}
          <div className="relative z-10 flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => onSelectCourse(currentCourse)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl font-black text-xs sm:text-sm active:scale-95 transition-transform border-2 border-foreground shadow-md"
            >
              <span>{news ? t("feedsReadMore") : t("feedsJoinCourse")}</span>
              <Eye className="h-4 w-4" />
            </button>

            {/* Pagination Controls */}
            {slides.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-foreground/30 flex items-center justify-center text-foreground active:scale-90 transition-transform"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Dot Indicators */}
                <div className="flex items-center gap-1.5 px-1">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentIndex ? "w-5 bg-secondary" : "w-2 bg-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-foreground/30 flex items-center justify-center text-foreground active:scale-90 transition-transform"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
