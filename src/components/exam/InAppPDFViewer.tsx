import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, BookOpen, Sun, Moon, Scroll } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader } from '@/components/ui/loader';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const MIN_SCALE = 0.5;
const MAX_SCALE = 5.0;
const MAX_CANVAS_DIM = 4096;
const DPR = Math.min(window.devicePixelRatio || 1, 3);

type ReadingMode = 'light' | 'dark' | 'sepia';
const MODE_CFG: Record<ReadingMode, { bg: string; filter: string; icon: React.ReactNode }> = {
  light: { bg: '#f5f5f5', filter: 'none', icon: <Sun className="h-4 w-4 text-white" /> },
  dark:  { bg: '#121212', filter: 'invert(1) hue-rotate(180deg)', icon: <Moon className="h-4 w-4 text-white" /> },
  sepia: { bg: '#f4ecd8', filter: 'sepia(0.35) brightness(0.95)', icon: <Scroll className="h-4 w-4 text-white" /> },
};

interface InAppPDFViewerProps {
  pdfData: string;
  fileName: string;
  onClose: () => void;
}

export function InAppPDFViewer({ pdfData, fileName, onClose }: InAppPDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [baseScale, setBaseScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputVal, setPageInputVal] = useState('');
  const [readingMode, setReadingMode] = useState<ReadingMode>('light');

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

  // ── Render on state change ──
  useEffect(() => {
    if (!pdfDocRef.current || loading) return;
    renderPage(currentPage, baseScale, rotation);
  }, [currentPage, baseScale, rotation, loading]);

  // ── Auto-hide controls ──
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, []);

  // ── Apply CSS transform (pan + visual pinch scale) ──
  const applyTransform = useCallback(() => {
    if (!wrapperRef.current) return;
    const { x, y } = panRef.current;
    const vs = visualScaleRef.current;
    wrapperRef.current.style.transform = `translate(${x}px,${y}px) scale(${vs})`;
  }, []);

  // ── Render canvas at committed baseScale ──
  const renderPage = useCallback(async (pageNum: number, sc: number, rot: number) => {
    if (!pdfDocRef.current || !canvasRef.current || !containerRef.current) return;
    if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }
    setPageLoading(true);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const naturalVp = page.getViewport({ scale: 1, rotation: rot });
      const containerW = containerRef.current.clientWidth;
      const fitScale = containerW / naturalVp.width;

      // Canvas pixel size, capped at MAX_CANVAS_DIM to prevent OOM
      let renderScale = fitScale * sc * DPR;
      const pxW = naturalVp.width * renderScale;
      const pxH = naturalVp.height * renderScale;
      const maxDim = Math.max(pxW, pxH);
      if (maxDim > MAX_CANVAS_DIM) renderScale *= MAX_CANVAS_DIM / maxDim;

      const viewport = page.getViewport({ scale: renderScale, rotation: rot });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      // CSS display size = fit-to-width × zoom (can exceed container when zoomed)
      const dispW = naturalVp.width * fitScale * sc;
      const dispH = naturalVp.height * fitScale * sc;
      canvas.style.width = dispW + 'px';
      canvas.style.height = dispH + 'px';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const task = (page.render as any)({ canvasContext: ctx, viewport, intent: 'display' });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;

      // Reset visual transform after fresh render
      visualScaleRef.current = 1.0;
      applyTransform();
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') setError('Failed to render page.');
    } finally {
      setPageLoading(false);
    }
  }, [applyTransform]);

  // ── Constrain pan boundaries ──
  const constrainPan = useCallback((x: number, y: number, effectiveScale: number) => {
    if (!canvasRef.current || !containerRef.current || effectiveScale <= 1.05) return { x: 0, y: 0 };
    const vs = visualScaleRef.current;
    const cW = canvasRef.current.offsetWidth * vs;
    const cH = canvasRef.current.offsetHeight * vs;
    const contW = containerRef.current.clientWidth;
    const contH = containerRef.current.clientHeight;
    const maxX = Math.max(0, (cW - contW) / 2);
    const maxY = Math.max(0, (cH - contH) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  // ── Touch gesture helpers ──
  const getTouchDist = (e: React.TouchEvent) => {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    resetControlsTimer();
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
    // ── PINCH: CSS transform only, NO canvas re-render ──
    if (e.touches.length === 2 && isPinchingRef.current && pinchStartDistRef.current != null) {
      e.preventDefault();
      const ratio = getTouchDist(e) / pinchStartDistRef.current;
      const newEff = pinchBaseScaleRef.current * ratio;
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newEff));
      visualScaleRef.current = clamped / baseScale;
      applyTransform();
      return;
    }
    // ── PAN: CSS translate, no re-render ──
    if (e.touches.length === 1 && panStartRef.current && !isPinchingRef.current) {
      const effectiveScale = baseScale * visualScaleRef.current;
      if (effectiveScale <= 1.05) return;
      const t = e.touches[0];
      const dx = t.clientX - panStartRef.current.x;
      const dy = t.clientY - panStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isPanningRef.current = true;
      if (isPanningRef.current) {
        const constrained = constrainPan(panStartRef.current.px + dx, panStartRef.current.py + dy, effectiveScale);
        panRef.current = constrained;
        applyTransform();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // ── Pinch ended → commit scale, trigger ONE re-render ──
    if (isPinchingRef.current && e.touches.length < 2) {
      isPinchingRef.current = false;
      const finalScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
        parseFloat((baseScale * visualScaleRef.current).toFixed(2))
      ));
      if (finalScale <= 1.05) panRef.current = { x: 0, y: 0 };
      pinchStartDistRef.current = null;
      visualScaleRef.current = 1.0;
      setBaseScale(finalScale);
      return;
    }
    if (e.touches.length > 0 || !touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!isPanningRef.current) {
      // Swipe page (only at 1x)
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && baseScale <= 1.05) {
        dx > 0 ? goTo(currentPage - 1) : goTo(currentPage + 1);
      }
      // Tap / double-tap
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          if (baseScale > 1.05) {
            panRef.current = { x: 0, y: 0 };
            setBaseScale(1.0);
          } else {
            setBaseScale(2.0);
          }
        } else {
          setShowControls(v => !v);
        }
        lastTapRef.current = now;
      }
    }
    touchStartRef.current = null;
    panStartRef.current = null;
  };

  // ── Navigation & zoom ──
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden safe-area-inset"
         style={{ backgroundColor: mode.bg }}>

      {/* ── Top Bar ── */}
      <div className={'absolute top-0 left-0 right-0 z-20 transition-transform duration-300 safe-area-top '
        + (showControls ? 'translate-y-0' : '-translate-y-full')}>
        <div className="bg-black/85 backdrop-blur-xl flex items-center gap-2 px-3 pt-12 pb-2">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 active:bg-white/25 transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1 min-w-0 mx-2">
            <p className="text-white text-xs font-semibold truncate">{fileName}</p>
          </div>
          {numPages > 0 && (
            showPageInput ? (
              <div className="flex items-center gap-1">
                <input autoFocus type="number" value={pageInputVal}
                  onChange={e => setPageInputVal(e.target.value)}
                  onBlur={submitPageInput}
                  onKeyDown={e => e.key === 'Enter' && submitPageInput()}
                  className="w-14 text-center text-white bg-white/20 rounded-lg px-1 py-1 text-sm outline-none border border-white/30"
                  min={1} max={numPages} />
                <span className="text-white/50 text-xs">/ {numPages}</span>
              </div>
            ) : (
              <button onClick={() => { setShowPageInput(true); setPageInputVal(String(currentPage)); resetControlsTimer(); }}
                className="px-3 py-1.5 rounded-xl bg-white/10 active:bg-white/25 transition-colors">
                <span className="text-white text-xs font-bold">{currentPage} / {numPages}</span>
              </button>
            )
          )}
          <button onClick={() => { setRotation(r => (r + 90) % 360); resetControlsTimer(); }}
            className="p-2 rounded-xl bg-white/10 active:bg-white/25 transition-colors">
            <RotateCw className="h-4 w-4 text-white" />
          </button>
          <button onClick={cycleReadingMode}
            className="p-2 rounded-xl bg-white/10 active:bg-white/25 transition-colors text-base leading-none">
            {mode.icon}
          </button>
        </div>
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
            <Loader size="lg" text="Loading PDF..." />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <BookOpen className="h-12 w-12 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded-xl text-white text-sm">Close</button>
          </div>
        )}
        {!loading && !error && (
          <div ref={wrapperRef} className="relative will-change-transform"
               style={{ transformOrigin: 'center center' }}>
            {pageLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-lg">
                <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <canvas ref={canvasRef} className="shadow-2xl rounded-sm"
              style={{ display: 'block', filter: mode.filter }} />
          </div>
        )}
      </div>

      {/* ── Bottom Bar ── */}
      {!loading && !error && (
        <div className={'absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300 safe-area-bottom '
          + (showControls ? 'translate-y-0' : 'translate-y-full')}>
          <div className="bg-black/85 backdrop-blur-xl flex items-center justify-between px-4 pt-2 pb-10 gap-2">
            <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}
              className="p-3 rounded-xl bg-white/10 active:bg-white/25 disabled:opacity-25 transition-colors">
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button onClick={() => zoom(-0.25)} disabled={baseScale <= MIN_SCALE}
              className="p-3 rounded-xl bg-white/10 active:bg-white/25 disabled:opacity-25 transition-colors">
              <ZoomOut className="h-5 w-5 text-white" />
            </button>
            <button onClick={() => { panRef.current = { x: 0, y: 0 }; setBaseScale(1.0); resetControlsTimer(); }}
              className="px-3 py-2 rounded-xl bg-white/10 active:bg-white/25 min-w-[64px] text-center transition-colors">
              <span className="text-white text-sm font-bold">{Math.round(baseScale * 100)}%</span>
            </button>
            <button onClick={() => zoom(0.25)} disabled={baseScale >= MAX_SCALE}
              className="p-3 rounded-xl bg-white/10 active:bg-white/25 disabled:opacity-25 transition-colors">
              <ZoomIn className="h-5 w-5 text-white" />
            </button>
            <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === numPages}
              className="p-3 rounded-xl bg-white/10 active:bg-white/25 disabled:opacity-25 transition-colors">
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Hint ── */}
      {!loading && !error && currentPage === 1 && showControls && numPages > 1 && (
        <div className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none z-30">
          <div className="bg-black/70 text-white/70 text-xs px-4 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
            Swipe · Pinch zoom · Double-tap · {mode.icon} Reading mode
          </div>
        </div>
      )}
    </div>
  );
}