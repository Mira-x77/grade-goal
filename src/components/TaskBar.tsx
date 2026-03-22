import { Home, Target, TrendingUp, Settings, BookOpen } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/library", icon: BookOpen, label: "Past Papers" },
  { path: "/exam-prep", icon: Target, label: "Exam Prep" },
] as const;

const TaskBar = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 bg-card border border-border rounded-full px-3 py-2 shadow-xl">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="taskbar-active"
                  className="absolute inset-0 bg-primary/10 rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <Icon
                className={`h-5 w-5 relative z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-extrabold relative z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBar;
