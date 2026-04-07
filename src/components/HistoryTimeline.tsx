import { motion } from "framer-motion";
import { Clock, FileText, File, Clipboard } from "lucide-react";
import { getHistory } from "@/lib/storage";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

const markTypeIcon = {
  interro: <FileText className="h-4 w-4 text-muted-foreground" />,
  dev: <File className="h-4 w-4 text-muted-foreground" />,
  compo: <Clipboard className="h-4 w-4 text-muted-foreground" />,
};

const HistoryTimeline = () => {
  const history = getHistory();
  const recent = history.slice(-10).reverse();
  const { t } = useLanguage();

  if (recent.length === 0) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-card p-5 border-2 border-border text-center"
      >
        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="font-bold text-muted-foreground">{t("noActivityYet")}</p>
        <p className="text-xs text-muted-foreground">{t("marksEntered")}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl bg-card p-5 border-2 border-border"
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-secondary" />
        <h3 className="font-black text-foreground">{t("recentActivity")}</h3>
      </div>

      <div className="flex flex-col gap-2">
        {recent.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.55 + i * 0.03 }}
            className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2"
          >
            <span className="text-lg">{markTypeIcon[entry.markType]}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{entry.subjectName}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {format(new Date(entry.date), "MMM d, HH:mm")}
              </p>
            </div>
            <span className={`text-sm font-black ${entry.value >= 14 ? "text-success" : entry.value >= 10 ? "text-warning" : "text-danger"}`}>
              {entry.value}/20
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default HistoryTimeline;

