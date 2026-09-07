import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileX } from "lucide-react";
import TaskBar from "@/components/TaskBar";
import { t } from "@/lib/i18n";

const LibrarySimple = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="w-full">
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">{t("examLibrary")}</h1>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("browseDownloadPapers")}
              </p>
            </div>
            <button
              onClick={() => navigate("/my-downloads")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 active:scale-95 transition-transform"
            >
              <Download className="h-5 w-5 text-primary" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 pb-8">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchByTitle")}
              className="w-full h-11 px-4 rounded-xl bg-card border border-border text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filters Placeholder */}
          <div className="rounded-2xl bg-card p-4 card-shadow">
            <h3 className="font-black text-foreground text-sm mb-3">Filters</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">
                  {t("classLevel")}
                </label>
                <select className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs">
                  <option>{t("allClasses")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">
                  {t("subject")}
                </label>
                <select className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs">
                  <option>{t("allSubjects")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">
                  {t("year")}
                </label>
                <select className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs">
                  <option>{t("allYears")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">
                  {t("examType")}
                </label>
                <select className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs">
                  <option>{t("allExamTypes")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-muted-foreground">
              0 {t("papersFound")}
            </p>
          </div>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FileX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-black text-foreground mt-4">No papers found</h3>
            <p className="text-sm font-semibold text-muted-foreground text-center mt-2">
              Papers will appear here once uploaded to Firebase
            </p>
          </div>
        </div>
      </div>

      <TaskBar />
    </div>
  );
};

export default LibrarySimple;
