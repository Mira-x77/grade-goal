import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Flame, AlertTriangle, ChevronRight, BookOpen, BarChart3, TrendingUp, Settings as SettingsIcon, User, Trophy, FileDown, PenLine, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { loadState, getStreak, getHistory } from "@/lib/storage";
import { downloadService } from "@/services/downloadService";
import { calcYearlyAverage, getPredictedRange, getAbsoluteBounds } from "@/lib/exam-logic";
import { calcAPCYearlyAverage, getPerformanceAlerts } from "@/lib/grading-apc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FrenchClassView from "@/components/FrenchClassView";
import TaskBar from "@/components/TaskBar";

const Home = () => {
  const state = loadState();
  const streak = getStreak();
  const history = getHistory();
  const hasData = state && state.subjects.length > 0;
  const gradingSystem = state?.settings?.gradingSystem ?? "apc";
  const weightedSplit = state?.settings?.apcWeightedSplit ?? false;

  const [downloadedCount, setDownloadedCount] = useState(0);

  useEffect(() => {
    downloadService.getDownloadedPapers().then((papers) => setDownloadedCount(papers.length));
  }, []);

  const currentAvg = hasData
    ? gradingSystem === "apc"
      ? calcAPCYearlyAverage(state.subjects, weightedSplit)
      : calcYearlyAverage(state.subjects)
    : null;
  const range = hasData ? getPredictedRange(state.subjects) : null;
  const bounds = hasData ? getAbsoluteBounds(state.subjects) : null;
  const targetAvg = state?.targetAverage ?? 16;

  const alerts = hasData ? getPerformanceAlerts(state.subjects, weightedSplit) : [];

  const filledMarks = hasData
    ? state.subjects.reduce((acc, s) => {
        return acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0);
      }, 0)
    : 0;
  const totalMarks = hasData ? state.subjects.length * 3 : 0;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 max-w-md mx-auto bg-background px-6 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-black text-foreground">
              {state?.studentName ? `Hey ${state.studentName}!` : "ScoreTarget"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {streak.currentStreak > 0 && (
              <div className="flex items-center gap-1 rounded-xl bg-accent/15 px-3 py-1.5">
                <Flame className="h-4 w-4 text-accent" />
                <span className="text-sm font-black text-accent">{streak.currentStreak}</span>
              </div>
            )}
            <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95">
              <User className="h-5 w-5" />
            </Link>
            <Link to="/settings" className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95">
              <SettingsIcon className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8 pt-28">
        {/* Performance Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-danger/15 p-4 border-2 border-danger/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <span className="text-sm font-black text-danger">Performance Alert</span>
            </div>
            {alerts.map((a) => (
              <p key={a.subject.id} className="text-xs font-bold text-danger/80 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" /> {a.subject.name} (Coeff {a.subject.coefficient}): {a.avg.toFixed(1)}/20 — below 07/20 threshold
              </p>
            ))}
          </motion.div>
        )}

        {/* Current status hero — only show when there's data */}
        {hasData && currentAvg !== null && (
          <Link to="/planner?step=results">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl p-6 text-center ${
              currentAvg >= targetAvg ? "bg-success" :
              currentAvg >= targetAvg - 2 ? "bg-warning" : "bg-danger"
            } card-shadow active:scale-[0.98] transition-transform`}
          >
            <p className="text-sm font-bold opacity-90 text-primary-foreground">Current Average</p>
            <p className="text-5xl font-black text-primary-foreground">{currentAvg.toFixed(1)}<span className="text-xl opacity-75">/20</span></p>
            <p className="text-sm font-bold mt-1 opacity-90 text-primary-foreground">Target: {targetAvg}/20</p>
            <p className="text-[10px] font-bold mt-1 opacity-70 text-primary-foreground uppercase tracking-wider">
              {gradingSystem === "apc" ? "APC Weighted" : "French"} System
            </p>
            {bounds && (
              <p className="text-xs font-bold mt-2 opacity-80 text-primary-foreground">
                Best possible final: {bounds.max}/20
              </p>
            )}
          </motion.div>
          </Link>
        )}

        {/* Dual View Toggle */}
        {hasData && (
          <Tabs defaultValue={gradingSystem === "apc" ? "weighted" : "ranking"} className="w-full">
            <TabsList className="w-full rounded-xl bg-muted h-11">
              <TabsTrigger value="weighted" className="flex-1 rounded-lg font-bold text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> Weighted View
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex-1 rounded-lg font-bold text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Trophy className="h-3.5 w-3.5 mr-1" /> Class Ranking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weighted">
              <div className="flex flex-col gap-4 mt-2">
                {/* Predicted range */}
                {range && (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
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

                {/* Subject quick view */}
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
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
              </div>
            </TabsContent>

            <TabsContent value="ranking">
              <div className="mt-2">
                <FrenchClassView subjects={state.subjects} />
              </div>
            </TabsContent>
          </Tabs>
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

        {/* Activity Overview — only show when there's actual activity */}
        {(filledMarks > 0 || streak.totalEntries > 0 || downloadedCount > 0) && (
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card p-4 card-shadow"
        >
          <h3 className="font-black text-foreground text-sm mb-3">Activity Overview</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 px-3 py-2.5 flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground">Marks entered</p>
                <p className="text-sm font-black text-foreground">{filledMarks}<span className="text-xs font-bold text-muted-foreground">/{totalMarks}</span></p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-secondary shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground">Subjects</p>
                <p className="text-sm font-black text-foreground">{state?.subjects.length ?? 0}</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5 flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground">Best streak</p>
                <p className="text-sm font-black text-foreground">{streak.bestStreak} <span className="text-xs font-bold text-muted-foreground">days</span></p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground">Total entries</p>
                <p className="text-sm font-black text-foreground">{streak.totalEntries}</p>
              </div>
            </div>
            <div className="col-span-2 rounded-xl bg-muted/50 px-3 py-2.5 flex items-center gap-2">
              <FileDown className="h-4 w-4 text-success shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground">Papers downloaded</p>
                <p className="text-sm font-black text-foreground">{downloadedCount}</p>
              </div>
            </div>
          </div>
        </motion.div>
        )}
      </div>

      <TaskBar />
    </div>
  );
};

export default Home;
