/**
 * OfflineBanner.jsx
 * Shows a subtle persistent banner when the device loses network connectivity.
 * Dismisses automatically when connectivity is restored.
 *
 * Competitive gap vs Raindrop.io / Pocket: both surface an offline state
 * clearly so users know why syncs/saves may fail.
 */
import React, { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineBanner() {
  const [isOnline, setIsOnline]         = useState(() => navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      // Hide "back online" toast after 3 s
      setTimeout(() => setJustReconnected(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  const showBanner = !isOnline || justReconnected;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          key={isOnline ? "online" : "offline"}
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          role="status"
          aria-live="polite"
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium ${
            isOnline
              ? "bg-emerald-500/90 text-white"
              : "bg-amber-500/95 text-white"
          } backdrop-blur-sm shadow-lg`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              Back online — syncing your saves…
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              You're offline — saved items still viewable, changes will sync when reconnected
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
