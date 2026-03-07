/**
 * ShareTarget.jsx — PWA Web Share Target handler
 *
 * Route: /share-target  (registered in manifest.json share_target.action)
 *
 * Triggered by:
 *   - Android Chrome "Share → Klip4ge" (GET or POST from SW)
 *   - iOS Safari redirect via /share-ios.html
 *   - Chrome extension (source=extension)
 *   - Direct URL: /share-target?title=...&url=...
 *   - Background sync retry (SHARE_QUEUE_ITEM from SW)
 *
 * Flow:
 *   1. Read title/url/source from URL params OR sessionStorage (set by SW)
 *   2. Auto-analyse via Base44 AI
 *   3. One-tap save with confirm card
 *   4. If offline → queue via SW background sync, show confirmation
 *   5. Redirect to Saves on success
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, Check, X, ExternalLink,
  WifiOff, Smartphone, Share2, Info,
} from "lucide-react";

// Source labels shown in the saved item (for filtering / analytics)
const SOURCE_LABELS = {
  mobile_share:      "mobile_share",
  mobile_share_post: "mobile_share",
  ios_share:         "mobile_share",
  extension:         "extension",
  pwa_share:         "pwa_share",
};

export default function ShareTarget() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [intent,    setIntent]    = useState({ title: "", url: "", text: "", source: "pwa_share" });
  const [analysing, setAnalysing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [queued,    setQueued]    = useState(false);  // saved to offline queue
  const [error,     setError]     = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [category,  setCategory]  = useState("other");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showIosHint, setShowIosHint] = useState(false);

  // ── Network status tracking ────────────────────────────────────────────────
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  // ── Read intent ────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let title  = params.get("title")  || "";
    let url    = params.get("url")    || params.get("text") || "";
    let text   = params.get("text")   || "";
    let source = params.get("source") || "pwa_share";

    // Prefer SW-injected sessionStorage (Android share sheet via SW postMessage)
    const swData = sessionStorage.getItem("cf_share_intent");
    if (swData) {
      try {
        const parsed = JSON.parse(swData);
        title  = parsed.title  || title;
        url    = parsed.url    || url;
        text   = parsed.text   || text;
        source = parsed.source || source;
        sessionStorage.removeItem("cf_share_intent");
      } catch {}
    }

    const finalUrl = url || text;
    const mappedSource = SOURCE_LABELS[source] || "pwa_share";
    setIntent({ title, url: finalUrl, text, source: mappedSource });

    // Show iOS hint if not installed as PWA and looks like iOS
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isPwa = window.navigator.standalone === true ||
                  window.matchMedia("(display-mode: standalone)").matches;
    if (isIos && !isPwa) setShowIosHint(true);

    if (finalUrl || title) analyseIntent(title, finalUrl);
  }, []);

  // ── SW SHARE_QUEUE_ITEM handler (offline queue retry) ─────────────────────
  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type === "SHARE_QUEUE_ITEM") {
        const { payload } = event.data;
        setIntent({
          title:  payload.title  || "",
          url:    payload.url    || "",
          text:   payload.text   || "",
          source: payload.source || "pwa_share",
        });
        if (payload.category) setCategory(payload.category);
        if (payload.ai_summary) setAiSummary(payload.ai_summary);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, []);

  // ── AI analysis ───────────────────────────────────────────────────────────
  const analyseIntent = async (title, url) => {
    if (!title && !url) return;
    setAnalysing(true);
    try {
      const res = await base44.functions.invoke("analyzeItem", { title, url });
      if (res && !res.error) {
        setCategory(res.category || "other");
        setAiSummary(res.ai_summary || "");
        setIntent((prev) => ({
          ...prev,
          title: prev.title || res.suggested_title || prev.title,
        }));
      }
    } catch { /* AI is best-effort */ }
    setAnalysing(false);
  };

  // ── Save item ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");

    const itemData = {
      title:      intent.title || intent.url || "Shared item",
      url:        intent.url,
      description:intent.text || "",
      category,
      source:     intent.source || "pwa_share",
      ai_summary: aiSummary,
      tags:       ["mobile"],
    };

    // Offline: queue via SW background sync
    if (isOffline) {
      try {
        await navigator.serviceWorker?.ready.then((reg) =>
          reg.sync?.register("klip4ge-share-sync")
        );
        // Store in sessionStorage as fallback if SW sync unavailable
        const queue = JSON.parse(sessionStorage.getItem("cf_share_queue") || "[]");
        queue.push({ ...itemData, queued_at: new Date().toISOString() });
        sessionStorage.setItem("cf_share_queue", JSON.stringify(queue));
        setSaving(false);
        setQueued(true);
        setTimeout(() => navigate(createPageUrl("Dashboard")), 3000);
      } catch {
        setError("No connection. Item queued — it will save when you're back online.");
        setSaving(false);
      }
      return;
    }

    try {
      await base44.entities.SavedItem.create(itemData);
      setSaved(true);
      setTimeout(() => navigate(createPageUrl("Saves")), 1800);
    } catch (err) {
      if (!navigator.onLine) {
        setIsOffline(true);
        setError("Lost connection. Tap Save again to queue offline.");
      } else {
        setError("Couldn't save this item. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => navigate(createPageUrl("Dashboard"));

  // ── Category config ────────────────────────────────────────────────────────
  const CATEGORY_EMOJI = {
    deal: "🏷️", recipe: "🍽️", event: "📅", product: "🛍️",
    article: "📰", travel: "✈️", gift_idea: "🎁", other: "📌",
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0F1117] px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <ClipForgeLogo size={40} showText={false} />
          <div>
            <h1 className="text-lg font-bold text-[#E8E8ED]">Save to Klip4ge</h1>
            <p className="text-xs text-[#8B8D97]">
              {analysing ? "AI is analysing…" : "Review and save to your vault"}
            </p>
          </div>
        </div>

        {/* Offline banner */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium"
            >
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              You're offline — saving will be queued automatically.
            </motion.div>
          )}
        </AnimatePresence>

        {/* iOS Add-to-Home-Screen hint */}
        <AnimatePresence>
          {showIosHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-3.5 h-3.5 text-[#00BFFF] shrink-0" />
                  <span className="text-xs font-bold text-[#00BFFF]">Get 1-tap iOS sharing</span>
                </div>
                <button
                  onClick={() => setShowIosHint(false)}
                  className="text-[#8B8D97] hover:text-[#E8E8ED] transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-[#8B8D97] leading-relaxed">
                Tap <Share2 className="w-3 h-3 inline" /> Share in Safari →{" "}
                <strong className="text-[#E8E8ED]">Add to Home Screen</strong>, then
                Share → Klip4ge saves in one tap from any app.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Item preview card */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          {intent.url && (
            <div className="flex items-center gap-2 text-xs text-[#8B8D97] truncate">
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#00BFFF]" />
              <span className="truncate">{intent.url}</span>
            </div>
          )}

          <input
            value={intent.title}
            onChange={(e) => setIntent((p) => ({ ...p, title: e.target.value }))}
            placeholder="Title (tap to edit)"
            aria-label="Item title"
            className="w-full bg-transparent text-base font-semibold text-[#E8E8ED] placeholder:text-[#8B8D97]/50 border-b border-[#2A2D3A] pb-1 focus:outline-none focus:border-[#00BFFF]"
            style={{ fontSize: "16px" }}
          />

          {analysing && (
            <div className="flex items-center gap-2 text-xs text-[#00BFFF]">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Analysing with AI…
            </div>
          )}

          {aiSummary && !analysing && (
            <div className="p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20">
              <p className="text-xs text-[#00BFFF] font-medium mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Summary
              </p>
              <p className="text-xs text-[#8B8D97]">{aiSummary}</p>
            </div>
          )}

          {!analysing && (
            <div className="flex items-center gap-2">
              <span className="text-lg">{CATEGORY_EMOJI[category] || "📌"}</span>
              <span className="text-sm text-[#E8E8ED] capitalize">
                {category.replace("_", " ")}
              </span>
              <span className="text-xs text-[#8B8D97]">(auto-detected)</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p role="alert" className="text-sm text-red-400 text-center flex items-center justify-center gap-1.5">
            <Info className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}

        {/* Action buttons */}
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-base font-bold text-[#E8E8ED]">Saved! ✨</p>
              <p className="text-sm text-[#8B8D97]">Redirecting to your vault…</p>
            </motion.div>
          ) : queued ? (
            <motion.div
              key="queued"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-base font-bold text-[#E8E8ED]">Queued for sync</p>
              <p className="text-sm text-[#8B8D97] text-center">
                This save will sync automatically when you're back online.
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" className="flex gap-3">
              <button
                onClick={handleDiscard}
                aria-label="Discard"
                className="flex-none h-14 w-14 rounded-2xl bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] flex items-center justify-center hover:border-red-500/40 hover:text-red-400 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving || analysing}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.97]"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : analysing ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Analysing…
                  </>
                ) : isOffline ? (
                  <>
                    <WifiOff className="w-5 h-5" />
                    Queue Save
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save to Vault
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
