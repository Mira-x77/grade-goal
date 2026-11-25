/**
 * LibraryChoiceSheet
 * Bottom sheet rendered via portal — never inside pointer-events-none.
 * Uses a simple ease transition (no spring) to avoid hang on fast taps.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface LibraryChoiceSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function LibraryChoiceSheet({ open, onClose }: LibraryChoiceSheetProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Animate in/out imperatively — avoids framer-motion spring hang
  useEffect(() => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (!sheet || !backdrop) return;

    if (open) {
      // Force reflow so transition fires
      sheet.style.transform = 'translateY(100%)';
      backdrop.style.opacity = '0';
      sheet.offsetHeight; // trigger reflow
      backdrop.offsetHeight;

      sheet.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      backdrop.style.transition = 'opacity 0.22s ease';
      sheet.style.transform = 'translateY(0%)';
      backdrop.style.opacity = '1';
    } else {
      sheet.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 1, 1)';
      backdrop.style.transition = 'opacity 0.18s ease';
      sheet.style.transform = 'translateY(100%)';
      backdrop.style.opacity = '0';
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleChoice = (path: string) => {
    onClose();
    // Small delay so close animation starts before navigation
    setTimeout(() => navigate(path), 80);
  };

  // Always render in DOM so refs are available; visibility controlled by transform
  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-label={t("library")}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        // Hidden from pointer events when closed
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          opacity: 0,
          WebkitBackdropFilter: 'blur(4px)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: 'translateY(100%)',
          willChange: 'transform',
        }}
        className="bg-background border-t-2 border-foreground rounded-t-3xl"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div>
            <h2 className="text-lg font-black text-foreground">{t("library")}</h2>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              {t("libraryLookingFor")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-muted active:scale-95 transition-transform"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        {/* Choices — responsive: side by side on all phones */}
        <div className="px-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleChoice('/library/papers')}
            className="flex flex-col items-center gap-3 bg-card border-2 border-foreground rounded-2xl p-4 active:scale-95 transition-transform card-shadow"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border-2 border-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-black text-foreground text-sm">{t("pastPapers")}</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 leading-tight">
                {t("examPapersTests")}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleChoice('/library/books')}
            className="flex flex-col items-center gap-3 bg-card border-2 border-foreground rounded-2xl p-4 active:scale-95 transition-transform card-shadow"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 border-2 border-secondary/30">
              <BookOpen className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div className="text-center">
              <p className="font-black text-foreground text-sm">{t("booksTitle")}</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 leading-tight">
                {t("booksSubtitle")}
              </p>
            </div>
          </button>
        </div>

        {/* Safe area bottom padding — respects notch/home indicator on all phones */}
        <div style={{ height: 'max(1.5rem, env(safe-area-inset-bottom))' }} />
      </div>
    </div>,
    document.body
  );
}
