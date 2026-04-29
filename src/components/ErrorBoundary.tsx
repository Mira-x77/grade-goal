import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console so you can see it in Android logcat / browser devtools
    console.error("[ErrorBoundary] Crash:", error.message);
    console.error("[ErrorBoundary] Stack:", error.stack);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", padding: 24, background: "hsl(40 20% 93%)", textAlign: "center", gap: 16,
        }}>
          <div style={{ fontSize: 48 }}>😵</div>
          <h2 style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 20, color: "#1A1A1A", margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: "#666", margin: 0, maxWidth: 300 }}>
            The app ran into an unexpected error. Tap below to reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#1A1A1A", color: "#fff", border: "none", borderRadius: 16,
              padding: "14px 32px", fontFamily: "Nunito, sans-serif", fontWeight: 900,
              fontSize: 15, cursor: "pointer",
            }}
          >
            Reload App
          </button>
          <details style={{ marginTop: 8, maxWidth: 340, textAlign: "left" }}>
            <summary style={{ fontFamily: "monospace", fontSize: 11, color: "#999", cursor: "pointer" }}>
              Error details
            </summary>
            <pre style={{ fontFamily: "monospace", fontSize: 10, color: "#c00", whiteSpace: "pre-wrap", marginTop: 8 }}>
              {this.state.error.message}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
