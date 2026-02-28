import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

export default function GetAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as standalone PWA — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    const installedHandler = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="fixed z-50 flex items-center gap-2"
          style={{
            // Above mobile nav (70px) + safe area; right-aligned
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
            right: "1rem",
          }}
        >
          <motion.button
            whileHover={{ scale: 1.06, boxShadow: "0 6px 32px rgba(0,191,255,0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            aria-label="Install ClipForge app"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-[#0a0e1a] shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]"
            style={{
              background: "linear-gradient(135deg, #00BFFF 0%, #0099CC 100%)",
              boxShadow: "0 4px 24px rgba(0,191,255,0.45), 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <Download className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Get the App</span>
          </motion.button>

          {/* Dismiss X */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="w-7 h-7 rounded-full bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center text-[#8B8D97] hover:text-[#E8E8ED] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}