/**
 * GetAppButton.jsx — PWA install button + visit-triggered nudge card
 *
 * Behaviour:
 *  • Intercepts the browser's `beforeinstallprompt` event
 *  • After 3+ visits (localStorage counter) AND the prompt is available,
 *    shows a nudge card instead of just the small FAB button
 *  • Card can be permanently dismissed ("Maybe later" → won't show again
 *    for 7 days; "Don't ask again" → permanent)
 *  • Already-installed PWA → hides everything
 *  • Competitive parity: matches Raindrop.io's "Get the app" inline card
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Zap, WifiOff, Bell } from "lucide-react";

const LS_VISIT_KEY  = "cf_visit_count";
const LS_DISMISS_KEY = "cf_pwa_dismiss_until";
const NUDGE_THRESHOLD = 3;   // show card after this many visits
const SNOOZE_DAYS     = 7;   // days to snooze on "Maybe later"

function getVisitCount() {
  try { return parseInt(localStorage.getItem(LS_VISIT_KEY) || "0", 10); } catch { return 0; }
}
function incrementVisit() {
  try {
    const n = getVisitCount() + 1;
    localStorage.setItem(LS_VISIT_KEY, String(n));
    return n;
  } catch { return 1; }
}
function isDismissed() {
  try {
    const until = parseInt(localStorage.getItem(LS_DISMISS_KEY) || "0", 10);
    return Date.now() < until;
  } catch { return false; }
}
function snooze(days = SNOOZE_DAYS) {
  try { localStorage.setItem(LS_DISMISS_KEY, String(Date.now() + days * 86400000)); } catch {}
}
function permanentDismiss() {
  try { localStorage.setItem(LS_DISMISS_KEY, String(Date.now() + 365 * 86400000)); } catch {}
}

export default function GetAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showFAB,  setShowFAB]  = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed — hide everything
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (isDismissed()) { setDismissed(true); return; }

    // Increment session visit count
    const visits = incrementVisit();

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowFAB(true);
      // Show the richer nudge card after threshold visits
      if (visits >= NUDGE_THRESHOLD) setShowCard(true);
    };

    const installedHandler = () => {
      setShowFAB(false);
      setShowCard(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowFAB(false);
      setShowCard(false);
    }
    setDeferredPrompt(null);
  };

  const handleSnooze = () => {
    snooze();
    setShowCard(false);
    setDismissed(true);
  };

  const handlePermanentDismiss = () => {
    permanentDismiss();
    setShowFAB(false);
    setShowCard(false);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <>
      {/* ── Nudge Card (3+ visits) ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            role="dialog"
            aria-modal="false"
            aria-label="Install Klip4ge app"
            className="fixed z-50 w-[calc(100%-2rem)] max-w-sm"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
              right: "1rem",
            }}
          >
            <div
              className="rounded-2xl border border-[#00BFFF]/20 p-4 shadow-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(0,191,255,0.08) 0%, rgba(147,112,219,0.08) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderColor: "rgba(0,191,255,0.25)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,191,255,0.1)",
              }}
            >
              {/* Close button */}
              <button
                onClick={handleSnooze}
                aria-label="Dismiss for now"
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[#8B8D97] hover:text-[#E8E8ED] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #00BFFF, #9370DB)" }}
                >
                  K
                </div>
                <div>
                  <p className="text-sm font-bold text-[#E8E8ED]">Install Klip4ge</p>
                  <p className="text-xs text-[#8B8D97]">Save smarter. Share better. Live together.</p>
                </div>
              </div>

              {/* Benefits */}
              <ul className="space-y-1.5 mb-4">
                {[
                  { icon: WifiOff,   text: "Works fully offline — vault loads without Wi-Fi" },
                  { icon: Zap,       text: "Instant launch — no browser needed" },
                  { icon: Bell,      text: "Deal & event reminders via push notifications" },
                  { icon: Smartphone,text: "Home screen icon on any device" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-xs text-[#C0C2CC]">
                    <Icon className="w-3.5 h-3.5 text-[#00BFFF] flex-shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>

              {/* CTA buttons */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={triggerInstall}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-[#0a0e1a]"
                  style={{ background: "linear-gradient(135deg, #00BFFF, #9370DB)" }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Add to Home Screen
                </motion.button>
                <button
                  onClick={handleSnooze}
                  className="px-3 py-2.5 rounded-xl text-xs font-medium text-[#8B8D97] border border-[#2A2D3A] hover:border-[#4A4D5A] hover:text-[#E8E8ED] transition-colors"
                >
                  Later
                </button>
              </div>

              {/* Permanent dismiss */}
              <button
                onClick={handlePermanentDismiss}
                className="mt-2 w-full text-center text-[10px] text-[#4A4D5A] hover:text-[#8B8D97] transition-colors"
              >
                Don't show again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB (compact, when card not showing) ──────────────────────────── */}
      <AnimatePresence>
        {showFAB && !showCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="fixed z-50 flex items-center gap-2"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
              right: "1rem",
            }}
          >
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: "0 6px 32px rgba(0,191,255,0.6)" }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerInstall}
              aria-label="Install Klip4ge app"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-[#0a0e1a] shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]"
              style={{
                background: "linear-gradient(135deg, #00BFFF 0%, #0099CC 100%)",
                boxShadow: "0 4px 24px rgba(0,191,255,0.45), 0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Get the App</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSnooze}
              aria-label="Dismiss"
              className="w-7 h-7 rounded-full bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center text-[#8B8D97] hover:text-[#E8E8ED] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
