import { useRef } from "react";
import { FolderOpen, FileText } from "lucide-react";
import { externalPdfService } from "@/services/externalPdfService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface OpenLocalPdfButtonProps {
  className?: string;
  variant?: "button" | "card" | "icon";
  label?: string;
}

export function OpenLocalPdfButton({
  className = "",
  variant = "button",
  label,
}: OpenLocalPdfButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error(t("onlyPdfSupported") || "Please select a valid PDF file.");
      return;
    }

    try {
      toast.loading(t("openingPdf") || "Opening PDF document...", { id: "pdf-open" });
      await externalPdfService.handleFileInput(file);
      toast.dismiss("pdf-open");
    } catch (err) {
      console.error("Failed to open local PDF file:", err);
      toast.error(t("failedOpenPdf") || "Failed to open PDF file.", { id: "pdf-open" });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const buttonText = label || t("openPdfFile") || "Open PDF File";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {variant === "card" ? (
        <button
          onClick={handleClick}
          className={`flex items-center gap-3 p-3.5 rounded-2xl bg-card border-2 border-border hover:border-primary/50 transition-all active:scale-98 text-left ${className}`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-foreground truncate">{buttonText}</p>
            <p className="text-xs text-muted-foreground font-medium truncate">
              {t("readAnyPdfDevice") || "Open and read any PDF from phone storage"}
            </p>
          </div>
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ) : variant === "icon" ? (
        <button
          onClick={handleClick}
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground active:scale-95 transition-transform ${className}`}
          title={buttonText}
        >
          <FolderOpen className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm card-shadow active:scale-95 transition-all ${className}`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>{buttonText}</span>
        </button>
      )}
    </>
  );
}
