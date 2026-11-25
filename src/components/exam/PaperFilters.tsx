import { FilterCriteria, ExamType } from "@/types/exam-library";
import { OFFICIAL_EXAM_TYPES } from "@/lib/library-filters";
import { ClassLevelFilter } from "@/components/exam/ClassLevelFilter";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaperFiltersProps {
  filters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
  onClear: () => void;
  subjects: string[];
  years: number[];
  classLevels: string[];
  examTypes?: string[];
}

const DEFAULT_EXAM_TYPES: ExamType[] = [...OFFICIAL_EXAM_TYPES];

export function PaperFilters({ filters, onFilterChange, onClear, subjects, years, classLevels, examTypes }: PaperFiltersProps) {
  const { t } = useLanguage();
  const hasActiveFilters = filters.classLevel || filters.subject || filters.year || filters.examType;
  const paperTypes = Array.from(new Set([
    ...DEFAULT_EXAM_TYPES,
    ...(examTypes ?? []),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));

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

      <div className="grid grid-cols-2 gap-3">
        {/* Class Level */}
        <div className="col-span-2">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">
            {t("classLevel")}
          </label>
          <ClassLevelFilter
            value={filters.classLevel || ""}
            onChange={(classLevel) =>
              onFilterChange({
                ...filters,
                classLevel: classLevel || undefined,
              })
            }
          />
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">
            {t("subject")}
          </label>
          <Select
            value={filters.subject || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, subject: value === "all" ? undefined : value })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("allSubjects")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allSubjects")}</SelectItem>
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
            value={filters.year?.toString() || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, year: value === "all" ? undefined : parseInt(value) })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("allYears")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allYears")}</SelectItem>
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
            value={filters.examType || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, examType: value === "all" ? undefined : value as ExamType })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("allPaperTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPaperTypes")}</SelectItem>
              {paperTypes.map((type) => (
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
