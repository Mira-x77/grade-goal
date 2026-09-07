import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VoteButtonProps {
  feedbackId: string;
  initialCount: number;
  initialVoted: boolean;
}

export default function VoteButton({ feedbackId, initialCount, initialVoted }: VoteButtonProps) {
  const { user } = useAuth();
  // Optimistic state
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!user || loading) return;

    // Optimistic update
    const nextVoted = !voted;
    const nextCount = nextVoted ? count + 1 : count - 1;
    setVoted(nextVoted);
    setCount(nextCount);
    setLoading(true);

    try {
      if (nextVoted) {
        const { error } = await supabase
          .from("votes")
          .insert({ feedback_id: feedbackId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("feedback_id", feedbackId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    } catch {
      // Revert on failure
      setVoted(voted);
      setCount(count);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={!user}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-2.5 px-2 rounded-2xl border-2 transition-all active:scale-95 ${
        voted
          ? "bg-secondary border-foreground card-shadow text-foreground"
          : "bg-card border-border text-muted-foreground"
      } disabled:opacity-40`}
    >
      <ChevronUp className={`h-5 w-5 transition-transform ${voted ? "scale-110" : ""}`} />
      <span className="text-sm font-black leading-none">{count}</span>
    </button>
  );
}
