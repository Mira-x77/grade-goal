import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SignInSuccess() {
  const navigate = useNavigate();
  const { syncing } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const navigatedRef = useRef(false);

  // Minimum 1.5s so the animation is visible
  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Safety cap — never wait more than 7s regardless of sync state
  useEffect(() => {
    const cap = setTimeout(() => {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        navigate("/", { replace: true });
      }
    }, 7000);
    return () => clearTimeout(cap);
  }, [navigate]);

  // Navigate as soon as min time has passed AND sync is done
  useEffect(() => {
    if (minTimePassed && !syncing && !navigatedRef.current) {
      navigatedRef.current = true;
      navigate("/", { replace: true });
    }
  }, [minTimePassed, syncing, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-8">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-success/15 border-4 border-success"
      >
        <CheckCircle2 className="h-12 w-12 text-success" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h1 className="text-2xl font-black text-foreground mb-2">You're in!</h1>
        <p className="text-sm font-semibold text-muted-foreground">
          {syncing ? "Restoring your data…" : "Taking you to your dashboard…"}
        </p>
      </motion.div>

      {/* Animated dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
