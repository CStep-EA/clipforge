/**
 * SignIn.jsx — ClipForge branded sign-in page
 *
 * Presents three crystal-clear options:
 *   1. Continue with Google   (OAuth via Base44)
 *   2. Continue with Apple    (OAuth via Base44)
 *   3. Continue with Email    (magic link via Base44)
 *
 * Zero API-key entry, zero manual integration setup.
 * All auth is delegated to base44.auth.redirectToLogin().
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { motion } from "framer-motion";

// ── Icon components (inline SVG — no extra deps) ──────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 7 10 7 10-7"/>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SignIn() {
  const [loading, setLoading] = useState(null); // 'google' | 'apple' | 'email'
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [error, setError] = useState("");

  const handleOAuth = async (provider) => {
    setLoading(provider);
    setError("");
    try {
      // base44.auth.redirectToLogin() handles all OAuth flows internally
      await base44.auth.redirectToLogin({ provider });
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("email");
    setError("");
    try {
      await base44.auth.sendMagicLink({ email: email.trim() });
      setEmailSent(true);
    } catch (err) {
      setError("Couldn't send the link — check your email and try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#0F1117] px-5 py-10"
      role="main"
    >
      {/* ── Brand header ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-10"
      >
        <ClipForgeLogo size={72} showText={false} variant="morph" />
        <h1 className="mt-4 text-3xl font-extrabold gradient-text tracking-tight">
          ClipForge
        </h1>
        <p className="mt-2 text-base text-[#8B8D97] text-center max-w-xs">
          Save smarter.&nbsp; Share better.&nbsp; Live together.
        </p>
      </motion.div>

      {/* ── Sign-in card ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm glass-card rounded-3xl p-7 space-y-4"
        aria-label="Sign in options"
      >
        {!emailSent ? (
          <>
            <h2 className="text-xl font-bold text-center text-[#E8E8ED] mb-6">
              Sign in to ClipForge
            </h2>

            {/* ── Error ─────────────────────────────────────────── */}
            {error && (
              <p role="alert" className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            {/* ── Google ────────────────────────────────────────── */}
            <SignInButton
              icon={<GoogleIcon />}
              label="Continue with Google"
              loading={loading === "google"}
              onClick={() => handleOAuth("google")}
              className="bg-white text-gray-800 hover:bg-gray-50 border border-gray-200"
            />

            {/* ── Apple ─────────────────────────────────────────── */}
            <SignInButton
              icon={<AppleIcon />}
              label="Continue with Apple"
              loading={loading === "apple"}
              onClick={() => handleOAuth("apple")}
              className="bg-[#1C1C1E] text-[#E8E8ED] hover:bg-[#2A2A2E] border border-[#3A3A3C]"
            />

            {/* ── Email divider ──────────────────────────────────── */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[#2A2D3A]" />
              <span className="text-xs text-[#8B8D97]">or</span>
              <div className="flex-1 h-px bg-[#2A2D3A]" />
            </div>

            {/* ── Email ─────────────────────────────────────────── */}
            {!showEmailInput ? (
              <SignInButton
                icon={<EmailIcon />}
                label="Continue with Email"
                loading={false}
                onClick={() => setShowEmailInput(true)}
                className="bg-[#1A1D27] text-[#E8E8ED] hover:bg-[#2A2D3A] border border-[#2A2D3A]"
              />
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3" noValidate>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Your email address"
                  className="w-full h-14 px-4 text-base rounded-2xl bg-[#0F1117] border border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/60 focus:outline-none focus:ring-2 focus:ring-[#00BFFF]/50"
                  // font-size ≥16px prevents iOS auto-zoom
                  style={{ fontSize: "16px" }}
                />
                <button
                  type="submit"
                  disabled={!email.trim() || loading === "email"}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading === "email" ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Magic Link ✨"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailInput(false)}
                  className="w-full text-sm text-[#8B8D97] hover:text-[#E8E8ED] transition-colors py-1"
                >
                  ← Back
                </button>
              </form>
            )}

            {/* ── Privacy note ──────────────────────────────────── */}
            <p className="text-xs text-[#8B8D97] text-center pt-2">
              By signing in you agree to our{" "}
              <a href="/terms" className="underline hover:text-[#00BFFF]">Terms</a>{" "}
              and{" "}
              <a href="/privacy" className="underline hover:text-[#00BFFF]">Privacy Policy</a>.
              <br />
              We never sell your data.
            </p>
          </>
        ) : (
          /* ── Email sent confirmation ───────────────────────── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4 space-y-4"
          >
            <span className="text-5xl">📬</span>
            <h3 className="text-xl font-bold text-[#E8E8ED]">Check your inbox!</h3>
            <p className="text-sm text-[#8B8D97] text-center max-w-xs">
              We sent a magic link to <strong className="text-[#E8E8ED]">{email}</strong>.
              Tap it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setEmailSent(false); setEmail(""); }}
              className="text-sm text-[#00BFFF] hover:underline"
            >
              Use a different email →
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <p className="mt-8 text-xs text-[#8B8D97]">
        New to ClipForge?{" "}
        <span className="text-[#00BFFF]">Signing in creates your free account automatically.</span>
      </p>
    </div>
  );
}

// ── Reusable sign-in button ─────────────────────────────────────────────────
function SignInButton({ icon, label, loading, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className={[
        "w-full h-14 rounded-2xl text-base font-semibold",
        "flex items-center justify-center gap-3",
        "transition-all active:scale-[0.97] disabled:opacity-60",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]",
        className,
      ].join(" ")}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        icon
      )}
      <span>{label}</span>
    </button>
  );
}
