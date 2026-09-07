import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export default function Debug() {
  const { session, loading, syncing, user } = useAuth();
  const [localData, setLocalData] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem("scoretarget_state");
    if (raw) {
      try {
        setLocalData(JSON.parse(raw));
      } catch (e) {
        setLocalData({ error: "Failed to parse", raw });
      }
    }
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Auth Status</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({ 
              loading, 
              syncing, 
              hasSession: !!session,
              userId: user?.id,
              email: user?.email 
            }, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">LocalStorage Keys</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(Object.keys(localStorage), null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">App State</h2>
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(localData, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Environment</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({
              VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
              VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? "SET" : "MISSING",
              DEV: import.meta.env.DEV,
              PROD: import.meta.env.PROD,
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
