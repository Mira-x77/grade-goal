import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const reset = () => { setError(""); setInfo(""); };

  const handleSubmit = async () => {
    reset();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        redirectAfterAuth();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        // If email confirmation is disabled, session is returned immediately
        if (data.session) {
          redirectAfterAuth(true);
        } else {
          setInfo("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setInfo("Password reset link sent to your email.");
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const redirectAfterAuth = (isNew = false) => {
    const hasAppData = !!localStorage.getItem("scoretarget_state");
    navigate(isNew || !hasAppData ? "/onboarding" : "/");
  };

  const handleGoogle = async () => {
    reset();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleApple = async () => {
    reset();
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const titles: Record<Mode, string> = {
    login: "Welcome back",
    signup: "Create account",
    forgot: "Reset password",
  };

  const subtitles: Record<Mode, string> = {
    login: "Sign in to your ScoreTarget account",
    signup: "Start tracking your grades today",
    forgot: "We'll send a reset link to your email",
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-2 flex items-center gap-3">
        {mode !== "login" && (
          <button
            onClick={() => { setMode("login"); reset(); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col px-6 pt-4 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-8"
          >
            {/* Title */}
            <div>
              <h1 className="text-3xl font-black text-foreground">{titles[mode]}</h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{subtitles[mode]}</p>
            </div>

            {/* Social buttons — only on login/signup */}
            {mode !== "forgot" && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-card border-2 border-border py-3.5 text-sm font-bold text-foreground active:scale-[0.98] transition-transform card-shadow"
                >
                  {/* Google SVG */}
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={handleApple}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background active:scale-[0.98] transition-transform card-shadow"
                >
                  {/* Apple SVG */}
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-bold text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
            )}

            {/* Form */}
            <div className="flex flex-col gap-4">
              {mode === "signup" && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-border bg-card text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-border bg-card text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-4 rounded-2xl border-2 border-border bg-card text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {/* Forgot password link */}
              {mode === "login" && (
                <button
                  onClick={() => { setMode("forgot"); reset(); }}
                  className="text-xs font-bold text-primary text-right -mt-2"
                >
                  Forgot password?
                </button>
              )}

              {/* Error / Info */}
              {error && (
                <p className="text-xs font-bold text-danger bg-danger/10 rounded-xl px-4 py-3">{error}</p>
              )}
              {info && (
                <p className="text-xs font-bold text-success bg-success/10 rounded-xl px-4 py-3">{info}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading || !email || (mode !== "forgot" && !password)}
                className="w-full rounded-2xl bg-primary py-4 text-sm font-extrabold text-primary-foreground card-shadow-primary active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none mt-2"
              >
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
              </button>
            </div>

            {/* Switch mode */}
            <p className="text-center text-sm font-semibold text-muted-foreground">
              {mode === "login" ? (
                <>Don't have an account?{" "}
                  <button onClick={() => { setMode("signup"); reset(); }} className="font-black text-primary">Sign up</button>
                </>
              ) : mode === "signup" ? (
                <>Already have an account?{" "}
                  <button onClick={() => { setMode("login"); reset(); }} className="font-black text-primary">Sign in</button>
                </>
              ) : null}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
