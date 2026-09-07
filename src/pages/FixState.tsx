import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FixState() {
  const [status, setStatus] = useState("Fixing...");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('scoretarget_state');
      if (!raw) {
        setStatus("No state found");
        return;
      }

      const state = JSON.parse(raw);
      
      // Fix the step
      state.step = 'results';
      
      // Save back
      localStorage.setItem('scoretarget_state', JSON.stringify(state));
      
      setStatus("Fixed! Redirecting...");
      
      // Redirect to home
      setTimeout(() => {
        navigate('/', { replace: true });
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{status}</h1>
        <div className="h-8 w-8 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    </div>
  );
}
