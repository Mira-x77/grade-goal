import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScheduleSetup } from "@/components/ScheduleSetup";
import { TodaySubjects } from "@/components/TodaySubjects";
import { loadScheduleState } from "@/lib/schedule-storage";

export default function BookReminder() {
  const [showSetup, setShowSetup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const state = loadScheduleState();
    if (!state.setupCompleted) {
      setShowSetup(true);
    }
  }, []);

  if (showSetup) {
    return (
      <ScheduleSetup
        onComplete={() => {
          setShowSetup(false);
          navigate("/");
        }}
        onSkip={() => {
          setShowSetup(false);
          navigate("/");
        }}
      />
    );
  }

  return <TodaySubjects />;
}
