"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { FiX } from "react-icons/fi";
import { Logo } from "./Logo";
import { authClient } from "@/lib/auth-client";

type Mode = "login" | "signup";

type AuthCtx = {
  open: (mode?: Mode) => void;
  close: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  const open = useCallback((m: Mode = "login") => {
    setMode(m);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const a = p.get("auth");
      if (a === "login" || a === "signup") {
        setMode(a);
        setIsOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      {isOpen && <Modal mode={mode} setMode={setMode} onClose={close} />}
    </Ctx.Provider>
  );
}

const CALLBACK_URL = "/pipeline";

function friendlyAuthError(code: string): string {
  switch (code) {
    case "account_not_linked":
      return "This email is already registered with a different sign-in method. Log in with your email & password (or the provider you first used).";
    case "access_denied":
      return "Sign-in was cancelled.";
    case "OAuthAccountNotLinked":
      return "That account is linked to a different login. Use your original sign-in method.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

function Modal({
  mode,
  setMode,
  onClose,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [providers, setProviders] = useState<{ google: boolean; github: boolean }>(
    { google: false, github: false }
  );

  useEffect(() => {
    fetch("/api/social-config")
      .then((r) => r.json())
      .then((d) => setProviders({ google: !!d.google, github: !!d.github }))
      .catch(() => {});
  }, []);

  // Surface errors that better-auth redirected back with (?error=...).
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const err = p.get("error");
      if (err) {
        setError(friendlyAuthError(err));
        p.delete("error");
        const qs = p.toString();
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (qs ? `?${qs}` : "")
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res =
        mode === "signup"
          ? await authClient.signUp.email({
              name: name || email.split("@")[0],
              email,
              password,
              callbackURL: CALLBACK_URL,
            })
          : await authClient.signIn.email({ email, password });

      if (res.error) {
        setError(res.error.message || "Something went wrong.");
        return;
      }
      window.location.assign(CALLBACK_URL);
    } catch {
      setError("Network error. Check your database connection.");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "github") {
    setError("");
    if (!providers[provider]) {
      const up = provider === "google" ? "GOOGLE" : "GITHUB";
      setError(
        `${provider[0].toUpperCase() + provider.slice(1)} login isn't configured yet. Add ${up}_CLIENT_ID and ${up}_CLIENT_SECRET to .env.local, then restart.`
      );
      return;
    }
    setBusy(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: CALLBACK_URL,
        // On failure, come back to the modal with a readable ?error=... message.
        errorCallbackURL: "/?auth=login",
      });
      // redirects away on success
    } catch {
      setError("Could not start social login.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <Logo size={28} withWordmark />
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-brand-100/10 hover:text-foreground"
          >
            <FiX size={18} />
          </button>
        </div>

        <h2 className="mt-5 text-xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Log in to your job search."
            : "Start getting more replies. It's free."}
        </p>

        {/* Social */}
        <div className="my-5  w-full flex items-center gap-4">
          <button
            onClick={() => social("google")}
            disabled={busy}
            className="btn-outline w-full"
          >
            <GoogleIcon />Google
          </button>
          <button
            onClick={() => social("github")}
            disabled={busy}
            className="btn-outline w-full"
          >
            <GitHubIcon />GitHub
          </button>
        </div>
          <div className="flex items-center gap-3 py-1 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            OR
            <span className="h-px flex-1 bg-line" />
          </div>

        {/* Email */}
        <form onSubmit={submitEmail} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Lee"
              />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                className="input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-ink"
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
              ? "Log in"
              : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button
            className="font-semibold text-brand-500 hover:underline"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.2 4.2M6.6 6.6A18.5 18.5 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4.1-.8" />
      <path d="m1 1 22 22" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.5l6.3 5.3C40.9 35.8 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}
