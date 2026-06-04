"use client";

import { useEffect, useState, ReactNode, FormEvent } from "react";
import { TransparentLogo } from "./TransparentLogo";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

const AUTH_KEY = "mafatlal-auth-v1";
const VALID_EMAIL = "digital@mafatlals.com";
const VALID_PASSWORD = "12345678";

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  // On mount check localStorage
  useEffect(() => {
    try {
      setAuthed(localStorage.getItem(AUTH_KEY) === "1");
    } catch {}
    setChecked(true);
  }, []);

  function handleLogin() {
    setAuthed(true);
    try { localStorage.setItem(AUTH_KEY, "1"); } catch {}
  }

  function handleLogout() {
    setAuthed(false);
    try { localStorage.removeItem(AUTH_KEY); } catch {}
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AuthedContext.Provider value={{ logout: handleLogout }}>{children}</AuthedContext.Provider>;
}

// ── Context so other components can call logout ─────────────────────────────
import { createContext, useContext } from "react";
const AuthedContext = createContext<{ logout: () => void }>({ logout: () => {} });
export function useAuth() { return useContext(AuthedContext); }

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate brief network delay for realism
    setTimeout(() => {
      if (
        email.trim().toLowerCase() === VALID_EMAIL &&
        password === VALID_PASSWORD
      ) {
        onLogin();
      } else {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
      }
    }, 600);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
          {/* Logo — transparent, sits directly on the dark card (no white box) */}
          <div className="flex justify-center mb-8">
            <TransparentLogo
              style={{ height: "52px", width: "auto", objectFit: "contain" }}
              alt="Mafatlal"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-white">Social Media Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="digital@mafatlals.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800/50 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-6">
            Mafatlal Social Media Intelligence © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
