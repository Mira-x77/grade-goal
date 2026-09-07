import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Back button for Nigerian subscreens — sits in the header (top-left).
 * Only renders when the user is a Nigerian student.
 */
export function useIsNigerian(): boolean {
  try {
    const raw = localStorage.getItem("scoretarget_state");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.settings?.gradingSystem === "nigerian_university";
  } catch { return false; }
}

export default function NigerianBackButton() {
  const navigate = useNavigate();
  const isNigerian = useIsNigerian();
  if (!isNigerian) return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform shrink-0"
    >
      <ArrowLeft className="h-5 w-5 text-foreground" />
    </button>
  );
}
