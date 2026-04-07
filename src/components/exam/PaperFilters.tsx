import { FilterCriteria, ExamType } from "@/types/exam-library";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaperFiltersProps {
  filters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
  onClear: () => void;
  subjects: string[];
  years: number[];
}

const EXAM_TYPES: ExamType[] = ["Baccalauréat", "Composition", "Devoir", "Interro", "midterm", "Practice", "Revision"];

export function PaperFilters({ filters, onFilterChange, onClear, subjects, years }: PaperFiltersProps) {
  const { t } = useLanguage();
  const hasActiveFilters = filters.subject || filters.year || filters.examType;

  return (
    <div className="rounded-2xl bg-card p-4 card-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-foreground text-sm">{t("filters")}</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs font-bold text-danger active:scale-95 transition-transform"
          >
            <X className="h-3 w-3" />
            {t("clearFilters")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Subject — only user's subjects */}
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">
            {t("subject")}
          </label>
          <Select
            value={filters.subject || ""}
            onValueChange={(value) => onFilterChange({ ...filters, subject: value || undefined })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("allSubjects")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("allSubjects")}</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">
            {t("year")}
          </label>
          <Select
            value={filters.year?.toString() || ""}
            onValueChange={(value) => onFilterChange({ ...filters, year: value ? parseInt(value) : undefined })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("allYears")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("allYears")}</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Paper Type */}
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">
            {t("paperType")}
          </label>
          <Select
            value={filters.examType || ""}
            onValueChange={(value) => onFilterChange({ ...filters, examType: value as ExamType || undefined })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("allPaperTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("allPaperTypes")}</SelectItem>
              {EXAM_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
