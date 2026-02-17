import { motion } from "framer-motion";
import { Target, BookOpen, BarChart3, TrendingUp, ChevronRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { loadState, getStreak } from "@/lib/storage";
import { calcYearlyAverage, getPredictedRange, getAbsoluteBounds } from "@/lib/exam-logic";

const Home = () => {
  const state = loadState();
  const streak = getStreak();
  const hasData = state && state.subjects.length > 0;
  const currentAvg = hasData ? calcYearlyAverage(state.subjects) : null;
  const range = hasData ? getPredictedRange(state.subjects) : null;
  const bounds = hasData ? getAbsoluteBounds(state.subjects) : null;
  const targetAvg = state?.targetAverage ?? 16;

  const filledMarks = hasData
    ? state.subjects.reduce((acc, s) => {
        return acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0);
      }, 0)
    : 0;
  const totalMarks = hasData ? state.subjects.length * 3 : 0;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-black text-foreground">ScoreTarget</h1>
            <p className="text-sm font-semibold text-muted-foreground">Your strategic exam planner</p>
          </div>
          {streak.currentStreak > 0 && (
            <div className="flex items-center gap-1 rounded-xl bg-accent/15 px-3 py-1.5">
              <Flame className="h-4 w-4 text-accent" />
              <span className="text-sm font-black text-accent">{streak.currentStreak}</span>
            </div>
          )}
        </motion.div>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8">
        {/* Current status hero */}
        {hasData && currentAvg !== null ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl p-6 text-center ${
              currentAvg >= targetAvg ? "bg-success" :
              currentAvg >= targetAvg - 2 ? "bg-warning" : "bg-danger"
            } card-shadow`}
          >
            <p className="text-sm font-bold opacity-90 text-primary-foreground">Current Average</p>
            <p className="text-5xl font-black text-primary-foreground">{currentAvg.toFixed(1)}<span className="text-xl opacity-75">/20</span></p>
            <p className="text-sm font-bold mt-1 opacity-90 text-primary-foreground">Target: {targetAvg}/20</p>
            {bounds && (
              <p className="text-xs font-bold mt-2 opacity-80 text-primary-foreground">
                Best possible final: {bounds.max}/20
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-primary p-6 text-center card-shadow-primary"
          >
            <Target className="h-10 w-10 text-primary-foreground mx-auto mb-2" />
            <h2 className="text-xl font-black text-primary-foreground">Set your target</h2>
            <p className="text-sm font-bold text-primary-foreground opacity-80">
              Start planning your exam strategy
            </p>
          </motion.div>
        )}

        {/* Predicted range */}
        {range && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-card p-4 card-shadow"
          >
            <h3 className="font-black text-foreground text-sm mb-2">Realistic expected range</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-danger">{range.min}</span>
              <div className="flex-1 mx-3 h-2.5 rounded-full bg-muted relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-danger via-warning to-success rounded-full" />
              </div>
              <span className="text-sm font-bold text-success">{range.max}</span>
            </div>
            <p className="text-xs text-muted-foreground font-semibold text-center mt-1">
              {filledMarks}/{totalMarks} marks entered
            </p>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          <Link to="/planner" className="block">
            <div className="rounded-2xl bg-card p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 transition-transform">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-foreground">
                  {hasData ? "Continue Planning" : "Start Planning"}
                </h3>
                <p className="text-xs font-semibold text-muted-foreground">Set target → Add subjects → Enter marks</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>

          {hasData && (
            <>
              <Link to="/planner?step=marks" className="block">
                <div className="rounded-2xl bg-card p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 transition-transform">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15">
                    <BookOpen className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground">Enter a Mark</h3>
                    <p className="text-xs font-semibold text-muted-foreground">Log an interro, devoir, or compo</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>

              <Link to="/planner?step=results" className="block">
                <div className="rounded-2xl bg-card p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 transition-transform">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
                    <BarChart3 className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground">View Strategy</h3>
                    <p className="text-xs font-semibold text-muted-foreground">See what you need on each test</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>

              <Link to="/simulator" className="block">
                <div className="rounded-2xl bg-card p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 transition-transform">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/15">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground">What-If Simulator</h3>
                    <p className="text-xs font-semibold text-muted-foreground">Slide to preview future outcomes</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            </>
          )}
        </motion.div>

        {/* Subject quick view */}
        {hasData && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card p-4 card-shadow"
          >
            <h3 className="font-black text-foreground text-sm mb-3">Subjects at a glance</h3>
            <div className="flex flex-col gap-2">
              {state.subjects.map((sub) => {
                const filled = (sub.marks.interro !== null ? 1 : 0) + (sub.marks.dev !== null ? 1 : 0) + (sub.marks.compo !== null ? 1 : 0);
                return (
                  <div key={sub.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                    <span className="text-sm font-bold text-foreground">{sub.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Coeff {sub.coefficient}</span>
                      <div className="flex gap-0.5">
                        {[sub.marks.interro, sub.marks.dev, sub.marks.compo].map((m, i) => (
                          <div key={i} className={`h-2 w-2 rounded-full ${m !== null ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Home;
