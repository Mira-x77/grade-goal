import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Mascot from "@/components/Mascot";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4 px-6">
      <Mascot pose="sad" size={130} animate />
      <h1 className="text-6xl font-black text-foreground">404</h1>
      <p className="text-lg font-black text-foreground">Page not found.</p>
      <p className="text-sm font-bold text-muted-foreground text-center">
        Even the mascot doesn't know where this is.
      </p>
      <a
        href="/"
        className="mt-2 rounded-2xl bg-secondary border-2 border-foreground px-6 py-3 text-sm font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
      >
        Go home
      </a>
    </div>
  );
};

export default NotFound;
