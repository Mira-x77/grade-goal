import { ArrowLeft, Home, BookOpen, Rss } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import LibraryChoiceSheet from "@/components/LibraryChoiceSheet";

const HOME_ROUTES = ["/", "/profile", "/settings", "/simulator", "/planner", "/subject"];

function haptic() {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
    try { navigator.vibrate?.(8); } catch {}
  });
}

function getIsNigerian(): boolean {
  try {
    const raw = localStorage.getItem("scoretarget_state");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.settings?.gradingSystem === "nigerian_university";
  } catch { return false; }
}

interface TaskBarProps {
  action?: ReactNode;
  backAction?: ReactNode;
  showBack?: boolean;
}

const TaskBar = ({ action, backAction, showBack }: TaskBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isNigerian = getIsNigerian();
  const [showLibrarySheet, setShowLibrarySheet] = useState(false);

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.startsWith("/library") || p.startsWith("/my-downloads") || p.startsWith("/books")) return "/library";
    if (p.startsWith("/courses")) return "/courses";
    if (HOME_ROUTES.some(r => r === "/" ? p === "/" : p.startsWith(r))) return "/";
    return "/";
  };

  const activeTab = getActiveTab();
  // On a library sub-page, library tab shows as active
  const isOnLibrarySubpage = location.pathname.startsWith("/library/") || location.pathname.startsWith("/my-downloads");

  const backBtn = backAction ?? (showBack ? (
    <motion.button
      onClick={() => navigate(-1)}
      initial={{ opacity: 0, scale: 0.5, x: 16 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.5, x: 16 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="h-12 w-12 rounded-full bg-card border-2 border-foreground card-shadow flex items-center justify-center active:scale-95"
    >
      <ArrowLeft className="h-5 w-5 text-foreground" />
    </motion.button>
  ) : null);

  // Nigerian: same pill nav as APC/French — include Home + Library + Courses tabs
  if (isNigerian) {
    const tabs = [
      { path: "/",        icon: Home,          label: t("home") },
      { path: "/library", icon: BookOpen,      label: t("library") },
      { path: "/courses", icon: Rss, label: t("feedsNav") },
    ] as const;

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end pointer-events-none pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="relative flex items-center pointer-events-none">
          <AnimatePresence>
            {backBtn && (
              <div className="pointer-events-auto absolute right-full mr-3">
                {backBtn}
              </div>
            )}
          </AnimatePresence>

          <div className="pointer-events-auto flex items-center gap-1 bg-card border-2 border-foreground rounded-full px-3 py-2 card-shadow">
            <Link
              to="/"
              onClick={() => { if (activeTab !== "/") haptic(); }}
              className="relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors"
            >
              {activeTab === "/" && (
                <motion.div layoutId="taskbar-active-nigerian"
                  className="absolute inset-0 bg-secondary rounded-full border border-foreground/20"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <Home className={`h-5 w-5 relative z-10 transition-all ${activeTab === "/" ? "text-foreground fill-foreground stroke-[1.5]" : "text-muted-foreground fill-none stroke-2"}`} />
              <span className={`text-[10px] font-black relative z-10 ${activeTab === "/" ? "text-foreground" : "text-muted-foreground"}`}>{t("home")}</span>
            </Link>

            <button
              onClick={() => { haptic(); setShowLibrarySheet(true); }}
              className="tour-library relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors"
            >
              {isOnLibrarySubpage && (
                <motion.div layoutId="taskbar-active-nigerian"
                  className="absolute inset-0 bg-secondary rounded-full border border-foreground/20"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <BookOpen className={`h-5 w-5 relative z-10 transition-all ${isOnLibrarySubpage ? "text-foreground fill-foreground stroke-[1.5]" : "text-muted-foreground fill-none stroke-2"}`} />
              <span className={`text-[10px] font-black relative z-10 ${isOnLibrarySubpage ? "text-foreground" : "text-muted-foreground"}`}>{t("library")}</span>
            </button>

            <Link
              to="/courses"
              onClick={() => { if (activeTab !== "/courses") haptic(); }}
              className="relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors"
            >
              {activeTab === "/courses" && (
                <motion.div layoutId="taskbar-active-nigerian"
                  className="absolute inset-0 bg-secondary rounded-full border border-foreground/20"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <Rss className={`h-5 w-5 relative z-10 transition-all ${activeTab === "/courses" ? "text-foreground fill-foreground stroke-[1.5]" : "text-muted-foreground fill-none stroke-2"}`} />
              <span className={`text-[10px] font-black relative z-10 ${activeTab === "/courses" ? "text-foreground" : "text-muted-foreground"}`}>{t("feedsNav")}</span>
            </Link>
          </div>

          {action && (
            <div className="pointer-events-auto absolute left-full ml-3">
              {action}
            </div>
          )}
        </div>

        <LibraryChoiceSheet open={showLibrarySheet} onClose={() => setShowLibrarySheet(false)} />
      </div>
    );
  }

  // APC/French: pill with Home + Library + Courses tabs, action floats right
  const tabs = [
    { path: "/",        icon: Home,          label: t("home") },
    { path: "/library", icon: BookOpen,      label: t("library") },
    { path: "/courses", icon: Rss, label: t("feedsNav") },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end pointer-events-none pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="relative flex items-center pointer-events-none">

        <AnimatePresence>
          {backBtn && (
            <div className="pointer-events-auto absolute right-full mr-3">
              {backBtn}
            </div>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto flex items-center gap-1 bg-card border-2 border-foreground rounded-full px-3 py-2 card-shadow">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.path;
            const Icon = tab.icon;
            
            // Library tab → open choice sheet
            if (tab.path === "/library") {
              return (
                <button
                  key={tab.path}
                  onClick={() => {
                    haptic();
                    setShowLibrarySheet(true);
                  }}
                  className="tour-library relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors"
                >
                  {isOnLibrarySubpage && (
                    <motion.div layoutId="taskbar-active"
                      className="absolute inset-0 bg-secondary rounded-full border border-foreground/20"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  <Icon
                    className={`h-5 w-5 relative z-10 transition-all ${
                      isOnLibrarySubpage
                        ? "text-foreground fill-foreground stroke-[1.5]"
                        : "text-muted-foreground fill-none stroke-2"
                    }`}
                  />
                  <span className={`text-[10px] font-black relative z-10 ${isOnLibrarySubpage ? "text-foreground" : "text-muted-foreground"}`}>{tab.label}</span>
                </button>
              );
            }
            
            // Home and Courses tabs
            return (
              <Link key={tab.path} to={tab.path}
                onClick={() => { if (!isActive) haptic(); }}
                className="relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors"
              >
                {isActive && (
                  <motion.div layoutId="taskbar-active"
                    className="absolute inset-0 bg-secondary rounded-full border border-foreground/20"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 relative z-10 transition-all ${
                    isActive
                      ? "text-foreground fill-foreground stroke-[1.5]"
                      : "text-muted-foreground fill-none stroke-2"
                  }`}
                />
                <span className={`text-[10px] font-black relative z-10 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {action && (
          <div className="pointer-events-auto absolute left-full ml-3">
            {action}
          </div>
        )}
      </div>

      <LibraryChoiceSheet open={showLibrarySheet} onClose={() => setShowLibrarySheet(false)} />
    </div>
  );
};

export default TaskBar;
