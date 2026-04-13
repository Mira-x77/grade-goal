import { Home, BookOpen, ArrowLeft, Plus } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const HOME_ROUTES = ["/", "/profile", "/settings", "/simulator", "/planner", "/subject"];

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

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.startsWith("/library") || p.startsWith("/my-downloads")) return "/library";
    if (HOME_ROUTES.some(r => r === "/" ? p === "/" : p.startsWith(r))) return "/";
    return "/";
  };

  const activeTab = getActiveTab();

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

  // Nigerian: centered pill FAB with label — no back button (it's in the screen header)
  if (isNigerian) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end pointer-events-none pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-none">
          {action && (
            <div className="pointer-events-auto">
              {action}
            </div>
          )}
        </div>
      </div>
    );
  }

  // APC/French: pill with Home + Library tabs, action floats right
  const tabs = [
    { path: "/", icon: Home, label: t("home") },
    { path: "/library", icon: BookOpen, label: t("library") },
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
            return (
              <Link key={tab.path} to={tab.path}
                className={`${tab.path === '/library' ? 'tour-library' : ''} relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors`}
              >
                {isActive && (
                  <motion.div layoutId="taskbar-active"
                    className="absolute inset-0 bg-secondary rounded-full border border-foreground/20"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                <Icon className={`h-5 w-5 relative z-10 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
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
    </div>
  );
};

export default TaskBar;
