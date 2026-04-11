import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, BookOpen, Sun, Moon, Scroll, Maximize2, Crown, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsTablet } from '@/hooks/useIsTablet';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const MIN_SCALE = 0.5;
const MAX_SCALE = 5.0;
const MAX_CANVAS_DIM = 4096;
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const TOUR_KEY = 'scoretarget_pdf_tour_seen';

type ReadingMode = 'light' | 'dark' | 'sepia';
const MODE_CFG: Record<ReadingMode, { bg: string; filter: string; label: string; icon: React.ReactNode }> = {
  light: { bg: '#f5f5f5', filter: 'none',                          label: 'Light', icon: <Sun  className="h-4 w-4" /> },
  dark:  { bg: '#121212', filter: 'invert(1) hue-rotate(180deg)',  label: 'Dark',  icon: <Moon className="h-4 w-4" /> },
  sepia: { bg: '#f4ecd8', filter: 'sepia(0.35) brightness(0.95)', label: 'Sepia', icon: <Scroll className="h-4 w-4" /> },
};

interface InAppPDFViewerProps {
  pdfData: string;
  fileName: string;
  subjectName?: string;
  onClose: () => void;
  onPremiumNudge?: () => void;
}

export function InAppPDFViewer({ pdfData, fileName, subjectName, onClose, onPremiumNudge }: InAppPDFViewerProps) {
  const { t } = useLanguage();
  const isTablet = useIsTablet();
  const sheetVariants = {
    hidden:  isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: '100%' },
    visible: isTablet ? { x: "-50%", y: "-50%", scale: 1,    opacity: 1 } : { y: 0 },
    exit:    isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: '100%' },
  };
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [baseScale, setBaseScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [locked, setLocked] = useState(false);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputVal, setPageInputVal] = useState('');
  const [readingMode, setReadingMode] = useState<ReadingMode>('light');
  const [showTour, setShowTour] = useState(false);
  // Premium nudges — session-only (not persisted)
  const [midNudgeDismissed, setMidNudgeDismissed] = useState(false);
  const [endNudgeShown, setEndNudgeShown] = useState(false);
  const [showEndNudge, setShowEndNudge] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gesture refs
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchBaseScaleRef = useRef(1.0);
  const visualScaleRef = useRef(1.0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const isPanningRef = useRef(false);
  const isPinchingRef = useRef(false);
  const lastTapRef = useRef(0);

  // Show first-time tour
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setShowTour(true);
  }, []);

  // Mid-read nudge: show after page 3 (once per session)
  useEffect(() => {
    if (!midNudgeDismissed && currentPage === 3 && numPages > 4 && onPremiumNudge) {
      // auto-dismiss after 6s if user doesn't tap
      const t = setTimeout(() => setMidNudgeDismissed(true), 6000);
      return () => clearTimeout(t);
    }
  }, [currentPage, numPages, midNudgeDismissed, onPremiumNudge]);

  // End nudge: show when user reaches the last page (once per session, only for multi-page PDFs)
  useEffect(() => {
    if (!endNudgeShown && numPages > 2 && currentPage === numPages && onPremiumNudge) {
      setEndNudgeShown(true);
      setShowEndNudge(true);
    }
  }, [currentPage, numPages, endNudgeShown, onPremiumNudge]);

  const dismissTour = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setShowTour(false);
  };

  // ── Load PDF ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const binary = atob(pdfData);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        const chunk = 8192;
        for (let i = 0; i < len; i += chunk) {
          const end = Math.min(i + chunk, len);
          for (let j = i; j < end; j++) bytes[j] = binary.charCodeAt(j);
          if (i % (chunk * 10) === 0) await new Promise(r => setTimeout(r, 0));
        }
        const pdf = await pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
          cMapPacked: true,
        }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch {
        if (!cancelled) { setError('Failed to load PDF.'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; pdfDocRef.current?.destroy(); pdfDocRef.current = null; };
  }, [pdfData]);

  useEffect(() => {
    if (!pdfDocRef.current || loading) return;
    renderPage(currentPage, baseScale, rotation);
  }, [currentPage, baseScale, rotation, loading]);

  const resetControlsTimer = useCallback(() => {
    // Controls are always visible unless locked — nothing to do
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, []);

  const applyTransform = useCallback(() => {
    if (!wrapperRef.current) return;
    const { x, y } = panRef.current;
    wrapperRef.current.style.transform = `translate(${x}px,${y}px) scale(${visualScaleRef.current})`;
  }, []);

  const renderPage = useCallback(async (pageNum: number, sc: number, rot: number) => {
    if (!pdfDocRef.current || !canvasRef.current || !containerRef.current) return;
    if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }
    setPageLoading(true);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const naturalVp = page.getViewport({ scale: 1, rotation: rot });
      const containerW = containerRef.current.clientWidth;
      const fitScale = containerW / naturalVp.width;
      let renderScale = fitScale * sc * DPR;
      const maxDim = Math.max(naturalVp.width * renderScale, naturalVp.height * renderScale);
      if (maxDim > MAX_CANVAS_DIM) renderScale *= MAX_CANVAS_DIM / maxDim;
      const viewport = page.getViewport({ scale: renderScale, rotation: rot });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      canvas.style.width = (naturalVp.width * fitScale * sc) + 'px';
      canvas.style.height = (naturalVp.height * fitScale * sc) + 'px';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const task = (page.render as any)({ canvasContext: ctx, viewport, intent: 'display' });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
      visualScaleRef.current = 1.0;
      applyTransform();
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') setError('Failed to render page.');
    } finally {
      setPageLoading(false);
    }
  }, [applyTransform]);

  const constrainPan = useCallback((x: number, y: number, effectiveScale: number) => {
    if (!canvasRef.current || !containerRef.current || effectiveScale <= 1.05) return { x: 0, y: 0 };
    const cW = canvasRef.current.offsetWidth * visualScaleRef.current;
    const cH = canvasRef.current.offsetHeight * visualScaleRef.current;
    const maxX = Math.max(0, (cW - containerRef.current.clientWidth) / 2);
    const maxY = Math.max(0, (cH - containerRef.current.clientHeight) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  const getTouchDist = (e: React.TouchEvent) => {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = getTouchDist(e);
      pinchBaseScaleRef.current = baseScale * visualScaleRef.current;
      isPinchingRef.current = true;
      isPanningRef.current = false;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
      panStartRef.current = { x: t.clientX, y: t.clientY, px: panRef.current.x, py: panRef.current.y };
      isPanningRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinchingRef.current && pinchStartDistRef.current != null) {
      e.preventDefault();
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchBaseScaleRef.current * getTouchDist(e) / pinchStartDistRef.current));
      visualScaleRef.current = clamped / baseScale;
      applyTransform();
      return;
    }
    // Pan only when not locked
    if (!locked && e.touches.length === 1 && panStartRef.current && !isPinchingRef.current) {
      const effectiveScale = baseScale * visualScaleRef.current;
      if (effectiveScale <= 1.05) return;
      const t = e.touches[0];
      const dx = t.clientX - panStartRef.current.x;
      const dy = t.clientY - panStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isPanningRef.current = true;
      if (isPanningRef.current) {
        panRef.current = constrainPan(panStartRef.current.px + dx, panStartRef.current.py + dy, effectiveScale);
        applyTransform();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPinchingRef.current && e.touches.length < 2) {
      isPinchingRef.current = false;
      const finalScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, parseFloat((baseScale * visualScaleRef.current).toFixed(2))));
      if (finalScale <= 1.05) panRef.current = { x: 0, y: 0 };
      pinchStartDistRef.current = null;
      visualScaleRef.current = 1.0;
      setBaseScale(finalScale);
      return;
    }
    if (locked) { touchStartRef.current = null; panStartRef.current = null; return; }
    if (e.touches.length > 0 || !touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (!isPanningRef.current) {
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && baseScale <= 1.05) {
        dx > 0 ? goTo(currentPage - 1) : goTo(currentPage + 1);
      } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        // Double-tap to zoom only — no single-tap toggle
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          panRef.current = { x: 0, y: 0 };
          setBaseScale(baseScale > 1.05 ? 1.0 : 2.0);
        }
        lastTapRef.current = now;
      }
    }
    touchStartRef.current = null;
    panStartRef.current = null;
  };

  const goTo = useCallback((n: number) => {
    const p = Math.max(1, Math.min(numPages, n));
    setCurrentPage(p);
    panRef.current = { x: 0, y: 0 };
    visualScaleRef.current = 1.0;
    applyTransform();
    resetControlsTimer();
  }, [numPages, resetControlsTimer, applyTransform]);

  const zoom = (delta: number) => {
    setBaseScale(s => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, parseFloat((s + delta).toFixed(2))));
      if (next <= 1.05) panRef.current = { x: 0, y: 0 };
      return next;
    });
    resetControlsTimer();
  };

  const submitPageInput = () => {
    const n = parseInt(pageInputVal, 10);
    if (!isNaN(n)) goTo(n);
    setShowPageInput(false);
    setPageInputVal('');
  };

  const cycleReadingMode = () => {
    const modes: ReadingMode[] = ['light', 'dark', 'sepia'];
    setReadingMode(modes[(modes.indexOf(readingMode) + 1) % modes.length]);
    resetControlsTimer();
  };

  const mode = MODE_CFG[readingMode];
  const progress = numPages > 1 ? (currentPage - 1) / (numPages - 1) : 1;

  return (
    <div className="pdf-viewer-root fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
         style={{ backgroundColor: mode.bg, WebkitUserSelect: 'none', userSelect: 'none' }}>

      {/* ── Top Bar ── */}
      <div className={'absolute top-0 left-0 right-0 z-20 transition-transform duration-300 safe-area-top '
        + (!locked ? 'translate-y-0' : '-translate-y-full')}>
        <div className="bg-background/90 backdrop-blur-md border-b border-border/60 flex items-center gap-2 px-4 pt-3 pb-3">
          {/* Close */}
          <button onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground active:scale-95 transition-transform shrink-0">
            <X className="h-5 w-5" />
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0 px-1">
            <p className="text-foreground text-xs font-black truncate leading-tight">{fileName}</p>
            {numPages > 0 && (
              <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                {currentPage} of {numPages} pages
              </p>
            )}
          </div>

          {/* Page jump */}
          {numPages > 0 && (
            showPageInput ? (
              <div className="flex items-center gap-1">
                <input autoFocus type="number" value={pageInputVal}
                  onChange={e => setPageInputVal(e.target.value)}
                  onBlur={submitPageInput}
                  onKeyDown={e => e.key === 'Enter' && submitPageInput()}
                  className="w-12 text-center text-foreground bg-muted rounded-lg px-1 py-1.5 text-sm outline-none border-2 border-primary font-bold"
                  min={1} max={numPages} />
                <span className="text-muted-foreground text-xs font-bold">/{numPages}</span>
              </div>
            ) : (
              <button onClick={() => { setShowPageInput(true); setPageInputVal(String(currentPage)); }}
                className="px-2.5 py-1.5 rounded-xl bg-muted text-foreground text-xs font-black active:scale-95 transition-transform">
                p.{currentPage}
              </button>
            )
          )}

          {/* Rotate */}
          <button onClick={() => setRotation(r => (r + 90) % 360)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground active:scale-95 transition-transform">
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Reading mode */}
          <button onClick={cycleReadingMode}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-muted text-foreground active:scale-95 transition-transform">
            {mode.icon}
            <span className="text-[10px] font-black">{mode.label}</span>
          </button>

          {/* Lock button */}
          <button
            onClick={() => setLocked(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground active:scale-95 transition-transform"
          >
            <Unlock className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        {numPages > 1 && (
          <div className="h-0.5 bg-border/40">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      {/* ── Canvas Container ── */}
      <div ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: mode.bg, touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}>
        {loading && (
          <div className="flex items-center justify-center h-full w-full">
            <Loader size="lg" text={t("loadingPDF")} />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <BookOpen className="h-12 w-12 text-danger" />
            <p className="text-danger text-sm font-bold">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-muted rounded-xl text-foreground text-sm font-bold active:scale-95">{t("close")}</button>
          </div>
        )}
        {!loading && !error && (
          <div ref={wrapperRef} className="relative will-change-transform" style={{ transformOrigin: 'center center' }}>
            {pageLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-lg">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <canvas ref={canvasRef} className="shadow-2xl rounded-sm" style={{ display: 'block', filter: mode.filter }} />
          </div>
        )}
      </div>

      {/* ── Bottom Controls — floating pill ── */}
      {!loading && !error && (
        <div className={'absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300 '
          + (!locked ? 'translate-y-0' : 'translate-y-full')}>
          <div className="flex items-center justify-center gap-3 px-4 pb-10 pt-3 bg-background/90 backdrop-blur-md border-t border-border/60">

            {/* Nav group */}
            <div className="flex items-center bg-muted rounded-2xl overflow-hidden border border-border/40">
              <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}
                className="flex h-11 w-11 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="w-px h-5 bg-border/60" />
              <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === numPages}
                className="flex h-11 w-11 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Zoom group */}
            <div className="flex items-center bg-muted rounded-2xl overflow-hidden border border-border/40">
              <button onClick={() => zoom(-0.25)} disabled={baseScale <= MIN_SCALE}
                className="flex h-11 w-11 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors">
                <ZoomOut className="h-5 w-5" />
              </button>
              <button onClick={() => { panRef.current = { x: 0, y: 0 }; setBaseScale(1.0); }}
                className="flex h-11 px-3 items-center justify-center text-foreground active:bg-muted-foreground/20 transition-colors">
                <span className="text-xs font-black min-w-[36px] text-center">{Math.round(baseScale * 100)}%</span>
              </button>
              <button onClick={() => zoom(0.25)} disabled={baseScale >= MAX_SCALE}
                className="flex h-11 w-11 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors">
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            {/* Fit button */}
            <button onClick={() => { panRef.current = { x: 0, y: 0 }; setBaseScale(1.0); }}
              className="flex h-11 w-11 items-center justify-center bg-muted rounded-2xl border border-border/40 text-foreground active:scale-95 transition-transform">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Lock indicator — tap to unlock ── */}
      <AnimatePresence>
        {locked && !loading && !error && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={() => setLocked(false)}
            className="absolute bottom-10 right-4 z-30 flex items-center gap-2 bg-background/90 backdrop-blur-md border-2 border-foreground rounded-2xl px-3 py-2.5 card-shadow active:scale-95 transition-transform"
          >
            <Lock className="h-4 w-4 text-foreground" />
            <span className="text-xs font-black text-foreground">Locked</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Mid-read nudge — floating banner at page 3 ── */}
      <AnimatePresence>
        {!midNudgeDismissed && currentPage === 3 && numPages > 4 && onPremiumNudge && !showTour && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="absolute bottom-28 left-4 right-4 z-30 pointer-events-auto"
          >
            <div className="bg-premium rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
              <Crown className="h-5 w-5 text-premium-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-premium-foreground text-xs font-black leading-tight">
                  Want the model answers?
                </p>
                <p className="text-premium-foreground/70 text-[10px] font-semibold mt-0.5">
                  {subjectName ? `Unlock prep tools for ${subjectName}` : 'Unlock premium prep tools'}
                </p>
              </div>
              <button
                onClick={() => { setMidNudgeDismissed(true); onPremiumNudge(); }}
                className="shrink-0 bg-premium-foreground/20 border border-premium-foreground/30 rounded-xl px-3 py-1.5 text-premium-foreground text-xs font-black active:scale-95 transition-transform"
              >
                Unlock
              </button>
              <button onClick={() => setMidNudgeDismissed(true)} className="text-premium-foreground/60 active:scale-95 transition-transform">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── End-of-paper nudge — bottom sheet ── */}
      <AnimatePresence>
        {showEndNudge && onPremiumNudge && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9985] bg-black/40" onClick={() => setShowEndNudge(false)} />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="sheet z-[9986] px-6 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mb-4" />
              <button onClick={() => setShowEndNudge(false)}
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95">
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h2 className="text-base font-black text-foreground leading-tight">You've finished the paper!</h2>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {subjectName ? `Now check how you'd do on ${subjectName}` : 'Now check your answers'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: '✅', label: 'Model answers' },
                  { icon: '🎯', label: 'Top questions' },
                  { icon: '📋', label: 'Cheat sheet' },
                ].map(({ icon, label }) => (
                  <div key={label} className="rounded-xl bg-muted/60 border border-border px-2 py-2.5 text-center">
                    <span className="text-lg block mb-1">{icon}</span>
                    <p className="text-[10px] font-black text-foreground leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setShowEndNudge(false); onPremiumNudge(); }}
                className="w-full rounded-2xl bg-premium py-3.5 text-sm font-extrabold text-premium-foreground active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="h-4 w-4" />
                {subjectName ? `Unlock prep for ${subjectName}` : 'Unlock premium prep'}
              </button>
              <p className="text-center text-[10px] text-muted-foreground font-semibold mt-2">
                Model answers · Key topics · Practice tests
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── First-time tour overlay ── */}
      <AnimatePresence>
        {showTour && !loading && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9990] bg-black/50" onClick={dismissTour} />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="sheet z-[9991] px-6 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mb-5" />
              <button onClick={dismissTour}
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95">
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-black text-foreground mb-1">Reading your paper 📄</h2>
              <p className="text-sm font-semibold text-muted-foreground mb-5 leading-relaxed">
                Here's how to navigate:
              </p>

              <div className="flex flex-col gap-3 mb-6">
                {[
                  { icon: '👆👆', label: 'Double-tap', desc: 'Zoom in / zoom back out' },
                  { icon: '🤏', label: 'Pinch', desc: 'Zoom to any level' },
                  { icon: '👈👉', label: 'Swipe left/right', desc: 'Turn pages (at 1× zoom)' },
                  { icon: '✋', label: 'Drag', desc: 'Pan around when zoomed in' },
                  { icon: '🔒', label: 'Lock', desc: 'Hide controls — pinch-zoom only' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center shrink-0">{icon}</span>
                    <div>
                      <span className="text-sm font-black text-foreground">{label} </span>
                      <span className="text-sm font-semibold text-muted-foreground">— {desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={dismissTour}
                className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all">
                Got it, let's read
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
