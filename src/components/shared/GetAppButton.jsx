import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";

export default function GetAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClick}
          aria-label="Install ClipForge as app"
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-3 md:py-2.5 rounded-2xl text-sm font-bold text-[#0a0e1a] shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF] focus-visible:ring-offset-2"
          style={{
            background: "linear-gradient(135deg, #00BFFF 0%, #0099CC 100%)",
            boxShadow: "0 4px 24px rgba(0,191,255,0.45), 0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <Download className="w-5 h-5 flex-shrink-0" />
          <span className="hidden sm:inline">Get the App</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}