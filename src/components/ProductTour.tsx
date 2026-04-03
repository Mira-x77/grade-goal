import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";

export default function ProductTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run tour if data exists (user completed onboarding)
    // and they haven't seen it yet
    const hasSeenTour = localStorage.getItem("scoretarget_tour_seen");
    const rawState = localStorage.getItem("scoretarget_state");
    let hasData = false;
    
    if (rawState) {
      try {
        const parsed = JSON.parse(rawState);
        if (parsed.subjects && parsed.subjects.length > 0) hasData = true;
      } catch (e) {}
    }

    if (!hasSeenTour && hasData) {
      setRun(true);
    }
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem("scoretarget_tour_seen", "true");
    }
  };

  const steps = [
    {
      target: "body",
      content: "Welcome to Go Study! Let's take a quick tour of your new exam planner.",
      placement: "center" as const,
      disableBeacon: true,
    },
    {
      target: ".tour-dashboard",
      content: "Here is your main dashboard. It tracks your current progress against your target score.",
      disableBeacon: true,
    },
    {
      target: ".tour-strategizer",
      content: "Tap the Score Strategizer to adjust hypothetical marks and see what scores you need to hit your target.",
      disableBeacon: true,
    },
    {
      target: ".tour-library",
      content: "Hit the Library to find and download past exam papers.",
      disableBeacon: true,
    },
    {
      target: ".tour-add-mark",
      content: "Tap this plus button whenever you get a new test score to log it instantly.",
      disableBeacon: true,
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--card))',
          textColor: 'hsl(var(--foreground))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 8,
          color: 'hsl(var(--primary-foreground))',
          fontWeight: 'black',
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          fontWeight: 'bold',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontWeight: 'bold',
        }
      }}
    />
  );
}
