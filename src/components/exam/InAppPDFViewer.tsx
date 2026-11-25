import {
  applyPdfPolyfills,
  getPdfWorkerAssetUrl,
  getPdfWorkerPolyfillScript,
} from "@/lib/pdf-polyfills";
applyPdfPolyfills();

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  BookOpen,
  Sun,
  Moon,
  Scroll,
  Maximize2,
  Crown,
  Lock,
  Unlock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { Loader } from "@/components/ui/loader";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsTablet } from "@/hooks/useIsTablet";

const MIN_SCALE = 0.5;
const MAX_SCALE = 5.0;
const MAX_CANVAS_DIM = 4096;
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const TOUR_KEY = "scoretarget_pdf_tour_seen";
const TAP_MOVE_THRESHOLD = 12;
const DOUBLE_TAP_MS = 280;
const SWIPE_PAGE_THRESHOLD = 56;
const DOUBLE_TAP_ZOOM = 2.0;

type ReadingMode = "light" | "dark" | "sepia";
const MODE_CFG: Record<
  ReadingMode,
  { bg: string; filter: string; label: string; icon: React.ReactNode }
> = {
  light: {
    bg: "#f5f5f5",
    filter: "none",
    label: "Light",
    icon: <Sun className="h-4 w-4" />,
  },
  dark: {
    bg: "#121212",
    filter: "invert(1) hue-rotate(180deg)",
    label: "Dark",
    icon: <Moon className="h-4 w-4" />,
  },
  sepia: {
    bg: "#f4ecd8",
    filter: "sepia(0.35) brightness(0.95)",
    label: "Sepia",
    icon: <Scroll className="h-4 w-4" />,
  },
};

interface InAppPDFViewerProps {
  /** Stream from Supabase storage URL (preferred — not saved to device) */
  pdfUrl?: string;
  /** Legacy base64 payload; avoid for exam papers when pdfUrl is available */
  pdfData?: string;
  fileName: string;
  subjectName?: string;
  onClose: () => void;
  onPremiumNudge?: () => void;
}

export function InAppPDFViewer({
  pdfUrl,
  pdfData,
  fileName,
  subjectName,
  onClose,
  onPremiumNudge,
}: InAppPDFViewerProps) {
  const { t } = useLanguage();
  const isTablet = useIsTablet();
  const sheetVariants = {
    hidden: isTablet
      ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 }
      : { y: "100%" },
    visible: isTablet
      ? { x: "-50%", y: "-50%", scale: 1, opacity: 1 }
      : { y: 0 },
    exit: isTablet
      ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 }
      : { y: "100%" },
  };
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [baseScale, setBaseScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputVal, setPageInputVal] = useState("");
  const [readingMode, setReadingMode] = useState<ReadingMode>("light");
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
  const panStartRef = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
  } | null>(null);
  const isPanningRef = useRef(false);
  const isPinchingRef = useRef(false);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preZoomScaleRef = useRef(1.0);
  const baseScaleRef = useRef(1.0);

  useEffect(() => {
    baseScaleRef.current = baseScale;
  }, [baseScale]);

  // Show first-time tour
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setShowTour(true);
  }, []);

  // Mid-read nudge: show after page 3 (once per session)
  useEffect(() => {
    if (
      !midNudgeDismissed &&
      currentPage === 3 &&
      numPages > 4 &&
      onPremiumNudge
    ) {
      // auto-dismiss after 6s if user doesn't tap
      const t = setTimeout(() => setMidNudgeDismissed(true), 6000);
      return () => clearTimeout(t);
    }
  }, [currentPage, numPages, midNudgeDismissed, onPremiumNudge]);

  // End nudge: show when user reaches the last page (once per session, only for multi-page PDFs)
  useEffect(() => {
    if (
      !endNudgeShown &&
      numPages > 2 &&
      currentPage === numPages &&
      onPremiumNudge
    ) {
      setEndNudgeShown(true);
      setShowEndNudge(true);
    }
  }, [currentPage, numPages, endNudgeShown, onPremiumNudge]);

  const dismissTour = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setShowTour(false);
  };

  // Retry counter — incrementing it re-triggers the PDF load useEffect
  const [retryCount, setRetryCount] = useState(0);
  const retryLoadPDF = () => {
    setError("");
    setLoading(true);
    setRetryCount((c) => c + 1);
  };

  // ── Load PDF ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        // Initialize worker dynamically inside useEffect using Blob URL or CDN fallback to bypass mobile sandbox boundaries
        if (!(window as any).__pdfWorkerUrl) {
          try {
            const workerAssetUrl = getPdfWorkerAssetUrl();
            console.log("🔄 Loading local PDF worker from:", workerAssetUrl);
            const response = await fetch(workerAssetUrl);
            if (response.ok) {
              const workerCode = await response.text();
              const blob = new Blob([getPdfWorkerPolyfillScript() + workerCode], {
                type: "application/javascript",
              });
              (window as any).__pdfWorkerUrl = URL.createObjectURL(blob);
              console.log(
                "✅ Local PDF worker Blob URL with polyfills created successfully",
              );
            } else {
              console.warn(
                "⚠️ Fetching local worker failed, falling back to CDN",
              );
            }
          } catch (workerErr) {
            console.warn("⚠️ Failed to initialize local worker:", workerErr);
          }
        }

        if ((window as any).__pdfWorkerUrl) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = (
            window as any
          ).__pdfWorkerUrl;
        } else {
          // Fallback to CDN if fetch failed — version must match installed pdfjs-dist
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
        }

        let pdf: pdfjsLib.PDFDocumentProxy;

        console.log(
          "🔍 URL.parse status before getDocument:",
          typeof URL.parse,
        );
        if (pdfUrl) {
          console.log("📄 Streaming PDF from URL");
          pdf = await pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/",
            cMapPacked: true,
            disableStream: false,
            disableAutoFetch: false,
          }).promise;
        } else {
          if (pdfData === "loading" || !pdfData) {
            return;
          }
          const sanitizedData = pdfData.replace(/\s/g, "");
          if (sanitizedData.length === 0) {
            throw new Error("No PDF data provided");
          }
          const binary = atob(sanitizedData);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          const chunk = 8192;
          for (let i = 0; i < len; i += chunk) {
            const end = Math.min(i + chunk, len);
            for (let j = i; j < end; j++) bytes[j] = binary.charCodeAt(j);
            if (i % (chunk * 10) === 0)
              await new Promise((r) => setTimeout(r, 0));
          }
          pdf = await pdfjsLib.getDocument({
            data: bytes,
            cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/",
            cMapPacked: true,
          }).promise;
        }

        if (cancelled) return;

        console.log("📄 PDF loaded successfully, pages:", pdf.numPages);
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error("❌ PDF loading error:", err);
        if (err instanceof Error) {
          console.error("   Message:", err.message);
          console.error("   Stack:", err.stack);
        } else {
          try {
            console.error("   Non-Error object:", JSON.stringify(err));
          } catch (jsonErr) {
            console.error("   Non-Error object:", String(err));
          }
        }
        if (!cancelled) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to load PDF.";
          setError(errorMsg);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [pdfUrl, pdfData, retryCount]);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const getEffectiveScale = useCallback(() => {
    return baseScaleRef.current * visualScaleRef.current;
  }, []);

  const contentOverflows = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return false;
    const scale = getEffectiveScale();
    const cW = canvasRef.current.offsetWidth * scale;
    const cH = canvasRef.current.offsetHeight * scale;
    const { clientWidth, clientHeight } = containerRef.current;
    return cW > clientWidth + 2 || cH > clientHeight + 2;
  }, [getEffectiveScale]);

  const applyTransform = useCallback(() => {
    if (!wrapperRef.current) return;
    const { x, y } = panRef.current;
    wrapperRef.current.style.transform = `translate3d(${x}px,${y}px,0) scale(${visualScaleRef.current})`;
  }, []);

  const constrainPan = useCallback(
    (x: number, y: number) => {
      if (!canvasRef.current || !containerRef.current) return { x: 0, y: 0 };

      const scale = getEffectiveScale();
      const cW = canvasRef.current.offsetWidth * scale;
      const cH = canvasRef.current.offsetHeight * scale;
      const { clientWidth, clientHeight } = containerRef.current;

      if (cW <= clientWidth + 2 && cH <= clientHeight + 2) {
        return { x: 0, y: 0 };
      }

      const maxX = Math.max(0, (cW - clientWidth) / 2);
      const maxY = Math.max(0, (cH - clientHeight) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [getEffectiveScale],
  );

  const renderPage = useCallback(
    async (pageNum: number, sc: number, rot: number) => {
      if (!pdfDocRef.current || !canvasRef.current || !containerRef.current)
        return;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      setPageLoading(true);
      try {
        const page = await pdfDocRef.current.getPage(pageNum);
        const naturalVp = page.getViewport({ scale: 1, rotation: rot });
        const containerW = containerRef.current.clientWidth;
        const fitScale = containerW / naturalVp.width;
        let renderScale = fitScale * sc * DPR;
        const maxDim = Math.max(
          naturalVp.width * renderScale,
          naturalVp.height * renderScale,
        );
        if (maxDim > MAX_CANVAS_DIM) renderScale *= MAX_CANVAS_DIM / maxDim;
        const viewport = page.getViewport({
          scale: renderScale,
          rotation: rot,
        });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = naturalVp.width * fitScale * sc + "px";
        canvas.style.height = naturalVp.height * fitScale * sc + "px";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const task = (page.render as any)({
          canvasContext: ctx,
          viewport,
          intent: "display",
        });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
        visualScaleRef.current = 1.0;
        panRef.current = constrainPan(panRef.current.x, panRef.current.y);
        applyTransform();
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException")
          setError("Failed to render page.");
      } finally {
        setPageLoading(false);
      }
    },
    [applyTransform, constrainPan],
  );

  useEffect(() => {
    if (!pdfDocRef.current || loading) return;
    renderPage(currentPage, baseScale, rotation);
  }, [currentPage, baseScale, rotation, loading, renderPage]);

  // Re-fit page on rotation / resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el || loading) return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (pdfDocRef.current && !loading) {
          renderPage(currentPage, baseScaleRef.current, rotation);
        }
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [currentPage, rotation, loading, renderPage]);

  const toggleControls = useCallback(() => {
    setShowControls((visible) => !visible);
  }, []);

  const hideControls = useCallback(() => {
    setShowControls(false);
  }, []);

  const getTouchDist = (touches: TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const handleDoubleTapZoom = useCallback(() => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    lastTapRef.current = 0;

    setBaseScale((current) => {
      if (current > 1.05) {
        panRef.current = { x: 0, y: 0 };
        preZoomScaleRef.current = current;
        return 1.0;
      }
      preZoomScaleRef.current = current;
      return DOUBLE_TAP_ZOOM;
    });
    visualScaleRef.current = 1.0;
    requestAnimationFrame(applyTransform);
  }, [applyTransform]);

  const scheduleControlsToggle = useCallback(() => {
    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      toggleControls();
      lastTapRef.current = 0;
    }, DOUBLE_TAP_MS);
  }, [toggleControls]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      pinchStartDistRef.current = getTouchDist(e.touches);
      pinchBaseScaleRef.current = baseScaleRef.current * visualScaleRef.current;
      isPinchingRef.current = true;
      isPanningRef.current = false;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
      panStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        px: panRef.current.x,
        py: panRef.current.y,
      };
      isPanningRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (
        e.touches.length === 2 &&
        isPinchingRef.current &&
        pinchStartDistRef.current != null
      ) {
        e.preventDefault();
        const clamped = Math.max(
          MIN_SCALE,
          Math.min(
            MAX_SCALE,
            (pinchBaseScaleRef.current * getTouchDist(e.touches)) /
              pinchStartDistRef.current,
          ),
        );
        visualScaleRef.current = clamped / baseScaleRef.current;
        panRef.current = constrainPan(panRef.current.x, panRef.current.y);
        applyTransform();
        return;
      }

      if (
        e.touches.length === 1 &&
        panStartRef.current &&
        !isPinchingRef.current
      ) {
        const t = e.touches[0];
        const dx = t.clientX - panStartRef.current.x;
        const dy = t.clientY - panStartRef.current.y;

        if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) {
          if (singleTapTimerRef.current) {
            clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }
          isPanningRef.current = true;
        }

        if (isPanningRef.current && contentOverflows()) {
          e.preventDefault();
          panRef.current = constrainPan(
            panStartRef.current.px + dx,
            panStartRef.current.py + dy,
          );
          applyTransform();
        }
      }
    },
    [applyTransform, constrainPan, contentOverflows],
  );

  const goTo = useCallback(
    (n: number) => {
      const p = Math.max(1, Math.min(numPages, n));
      if (p === currentPage) return;
      setCurrentPage(p);
      // Preserve zoom level; re-constrain pan after the new page renders
    },
    [numPages, currentPage],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length < 2) {
        isPinchingRef.current = false;
        const finalScale = Math.max(
          MIN_SCALE,
          Math.min(
            MAX_SCALE,
            parseFloat(
              (baseScaleRef.current * visualScaleRef.current).toFixed(2),
            ),
          ),
        );
        pinchStartDistRef.current = null;
        visualScaleRef.current = 1.0;
        setBaseScale(finalScale);
        panRef.current = constrainPan(panRef.current.x, panRef.current.y);
        applyTransform();
        touchStartRef.current = null;
        panStartRef.current = null;
        return;
      }

      if (e.touches.length > 0 || !touchStartRef.current) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;

      if (!isPanningRef.current && !isPinchingRef.current) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (
          absDx > SWIPE_PAGE_THRESHOLD &&
          absDx > absDy * 1.4 &&
          !contentOverflows()
        ) {
          goTo(dx > 0 ? currentPage - 1 : currentPage + 1);
        } else if (absDx < TAP_MOVE_THRESHOLD && absDy < TAP_MOVE_THRESHOLD) {
          const now = Date.now();
          if (now - lastTapRef.current < DOUBLE_TAP_MS) {
            handleDoubleTapZoom();
          } else {
            lastTapRef.current = now;
            scheduleControlsToggle();
          }
        }
      }

      isPanningRef.current = false;
      touchStartRef.current = null;
      panStartRef.current = null;
    },
    [
      applyTransform,
      constrainPan,
      contentOverflows,
      currentPage,
      goTo,
      handleDoubleTapZoom,
      scheduleControlsToggle,
    ],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || loading || error) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [loading, error, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const zoom = (delta: number) => {
    setBaseScale((s) => {
      const next = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, parseFloat((s + delta).toFixed(2))),
      );
      if (next <= 1.05) panRef.current = { x: 0, y: 0 };
      else panRef.current = constrainPan(panRef.current.x, panRef.current.y);
      return next;
    });
  };

  const submitPageInput = () => {
    const n = parseInt(pageInputVal, 10);
    if (!isNaN(n)) goTo(n);
    setShowPageInput(false);
    setPageInputVal("");
  };

  const cycleReadingMode = () => {
    const modes: ReadingMode[] = ["light", "dark", "sepia"];
    setReadingMode(modes[(modes.indexOf(readingMode) + 1) % modes.length]);
  };

  const mode = MODE_CFG[readingMode];
  const progress = numPages > 1 ? (currentPage - 1) / (numPages - 1) : 1;

  return (
    <div
      className="pdf-viewer-root fixed inset-0 z-[100] flex flex-col select-none overflow-hidden"
      style={{
        backgroundColor: mode.bg,
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* ── Top Bar (flex — does not overlap canvas) ── */}
      <div
        className={
          "shrink-0 z-20 transition-all duration-300 overflow-hidden safe-area-top " +
          (showControls ? "max-h-24 opacity-100" : "max-h-0 opacity-0 pointer-events-none")
        }
      >
        <div className="bg-background/90 backdrop-blur-md border-b border-border/60 flex items-center gap-2 px-3 py-2 min-h-[3rem]">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground active:scale-95 transition-transform shrink-0"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>

          <p
            className="flex-1 min-w-0 text-foreground text-xs font-black truncate leading-tight"
            title={fileName}
          >
            {fileName}
          </p>

          <button
            onClick={hideControls}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground active:scale-95 transition-transform shrink-0"
            aria-label="Hide controls"
          >
            <Unlock className="h-4 w-4" />
          </button>
        </div>

        {numPages > 1 && (
          <div className="h-0.5 bg-border/40">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Canvas Container ── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden flex items-center justify-center pdf-touch-surface"
        style={{ backgroundColor: mode.bg, touchAction: "none" }}
      >
        {loading && (
          <div className="flex items-center justify-center h-full w-full">
            <Loader size="lg" text={t("loadingPDF")} />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <BookOpen className="h-12 w-12 text-danger" />
            <p className="text-danger text-sm font-bold">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={retryLoadPDF}
                className="px-4 py-2 bg-primary rounded-xl text-primary-foreground text-sm font-bold active:scale-95 transition-transform"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-muted rounded-xl text-foreground text-sm font-bold active:scale-95 transition-transform"
              >
                {t("close")}
              </button>
            </div>
          </div>
        )}
        {!loading && !error && (
          <div
            ref={wrapperRef}
            className="relative will-change-transform"
            style={{ transformOrigin: "center center" }}
          >
            {pageLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-lg">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="shadow-2xl rounded-sm"
              style={{ display: "block", filter: mode.filter }}
            />
          </div>
        )}
      </div>

      {/* ── Bottom Controls (flex — does not overlap canvas) ── */}
      {!loading && !error && (
        <div
          className={
            "shrink-0 z-20 transition-all duration-300 overflow-hidden safe-area-bottom " +
            (showControls ? "max-h-28 opacity-100" : "max-h-0 opacity-0 pointer-events-none")
          }
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-background/90 backdrop-blur-md border-t border-border/60">
            <div className="flex items-center bg-muted rounded-xl overflow-hidden border border-border/40 shrink-0">
              <button
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-10 w-10 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="w-px h-5 bg-border/60" />
              {showPageInput ? (
                <input
                  autoFocus
                  type="number"
                  value={pageInputVal}
                  onChange={(e) => setPageInputVal(e.target.value)}
                  onBlur={submitPageInput}
                  onKeyDown={(e) => e.key === "Enter" && submitPageInput()}
                  className="w-10 text-center text-foreground bg-transparent px-1 py-1.5 text-xs outline-none font-bold"
                  min={1}
                  max={numPages}
                />
              ) : (
                <button
                  onClick={() => {
                    setShowPageInput(true);
                    setPageInputVal(String(currentPage));
                  }}
                  className="flex h-10 min-w-[3rem] px-2 items-center justify-center text-foreground text-[11px] font-black active:bg-muted-foreground/20 transition-colors"
                >
                  {currentPage}/{numPages || "?"}
                </button>
              )}
              <div className="w-px h-5 bg-border/60" />
              <button
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === numPages}
                className="flex h-10 w-10 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center bg-muted rounded-xl overflow-hidden border border-border/40 shrink-0">
              <button
                onClick={() => zoom(-0.25)}
                disabled={baseScale <= MIN_SCALE}
                className="flex h-10 w-10 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  panRef.current = { x: 0, y: 0 };
                  setBaseScale(1.0);
                }}
                className="flex h-10 min-w-[2.75rem] px-2 items-center justify-center text-foreground active:bg-muted-foreground/20 transition-colors"
              >
                <span className="text-[11px] font-black text-center">
                  {Math.round(baseScale * 100)}%
                </span>
              </button>
              <button
                onClick={() => zoom(0.25)}
                disabled={baseScale >= MAX_SCALE}
                className="flex h-10 w-10 items-center justify-center text-foreground active:bg-muted-foreground/20 disabled:opacity-30 transition-colors"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border/40 text-foreground active:scale-95 transition-transform"
                aria-label="Rotate"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={cycleReadingMode}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border/40 text-foreground active:scale-95 transition-transform"
                aria-label={mode.label}
              >
                {mode.icon}
              </button>
              <button
                onClick={() => {
                  panRef.current = { x: 0, y: 0 };
                  setBaseScale(1.0);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border/40 text-foreground active:scale-95 transition-transform"
                aria-label="Fit page"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls hidden hint — tap page or this pill to restore ── */}
      <AnimatePresence>
        {!showControls && !loading && !error && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={toggleControls}
            className="absolute bottom-6 right-4 z-30 flex items-center gap-2 bg-background/85 backdrop-blur-md border border-border/60 rounded-2xl px-3 py-2 safe-area-bottom active:scale-95 transition-transform"
          >
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground">
              Tap page to show controls
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Mid-read nudge — floating banner at page 3 ── */}
      <AnimatePresence>
        {!midNudgeDismissed &&
          currentPage === 3 &&
          numPages > 4 &&
          onPremiumNudge &&
          !showTour && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="absolute bottom-28 left-4 right-4 z-30 pointer-events-auto"
            >
              <div className="bg-premium rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
                <Crown className="h-5 w-5 text-premium-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-premium-foreground text-xs font-black leading-tight">
                    Want the model answers?
                  </p>
                  <p className="text-premium-foreground/70 text-[10px] font-semibold mt-0.5">
                    {subjectName
                      ? `Unlock prep tools for ${subjectName}`
                      : "Unlock premium prep tools"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMidNudgeDismissed(true);
                    onPremiumNudge();
                  }}
                  className="shrink-0 bg-premium-foreground/20 border border-premium-foreground/30 rounded-xl px-3 py-1.5 text-premium-foreground text-xs font-black active:scale-95 transition-transform"
                >
                  Unlock
                </button>
                <button
                  onClick={() => setMidNudgeDismissed(true)}
                  className="text-premium-foreground/60 active:scale-95 transition-transform"
                >
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9985] bg-black/40"
              onClick={() => setShowEndNudge(false)}
            />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="sheet z-[9986] px-6 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mb-4" />
              <button
                onClick={() => setShowEndNudge(false)}
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h2 className="text-base font-black text-foreground leading-tight">
                    You've finished the paper!
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {subjectName
                      ? `Now check how you'd do on ${subjectName}`
                      : "Now check your answers"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: "✅", label: "Model answers" },
                  { icon: "🎯", label: "Top questions" },
                  { icon: "📋", label: "Cheat sheet" },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-muted/60 border border-border px-2 py-2.5 text-center"
                  >
                    <span className="text-lg block mb-1">{icon}</span>
                    <p className="text-[10px] font-black text-foreground leading-tight">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowEndNudge(false);
                  onPremiumNudge();
                }}
                className="w-full rounded-2xl bg-premium py-3.5 text-sm font-extrabold text-premium-foreground active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="h-4 w-4" />
                {subjectName
                  ? `Unlock prep for ${subjectName}`
                  : "Unlock premium prep"}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9990] bg-black/50"
              onClick={dismissTour}
            />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="sheet z-[9991] px-6 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mb-5" />
              <button
                onClick={dismissTour}
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-black text-foreground mb-1">
                Reading your paper 📄
              </h2>
              <p className="text-sm font-semibold text-muted-foreground mb-5 leading-relaxed">
                Here's how to navigate:
              </p>

              <div className="flex flex-col gap-3 mb-6">
                {[
                  {
                    icon: "👆👆",
                    label: "Double-tap",
                    desc: "Zoom in / zoom back out",
                  },
                  { icon: "🤏", label: "Pinch", desc: "Zoom to any level" },
                  {
                    icon: "👈👉",
                    label: "Swipe left/right",
                    desc: "Turn pages (at 1× zoom)",
                  },
                  {
                    icon: "✋",
                    label: "Drag",
                    desc: "Pan around when zoomed in",
                  },
                  {
                    icon: "👆",
                    label: "Tap page",
                    desc: "Hide or show the toolbars",
                  },
                  {
                    icon: "🔒",
                    label: "Hide button",
                    desc: "Distraction-free reading mode",
                  },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center shrink-0">
                      {icon}
                    </span>
                    <div>
                      <span className="text-sm font-black text-foreground">
                        {label}{" "}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        — {desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={dismissTour}
                className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all mb-2"
              >
                Got it, let's read
              </button>
              <button
                onClick={dismissTour}
                className="w-full rounded-2xl bg-muted py-3 text-sm font-extrabold text-muted-foreground active:translate-y-0.5 transition-all"
              >
                Skip tutorial
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
