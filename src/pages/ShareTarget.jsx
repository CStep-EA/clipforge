/**
 * ShareTarget.jsx — PWA Web Share Target handler
 *
 * Route: /share-target  (registered in manifest.json share_target.action)
 * Triggered by:
 *   - Android Chrome "Share to ClipForge" from any app
 *   - iOS "share-ios.html" redirect
 *   - Direct URL: /?share=1&title=...&url=...
 *
 * Flow:
 *   1. Read title/url from URL params OR sessionStorage (set by SW)
 *   2. Auto-analyse via Base44 AI
 *   3. Save item with one-tap confirmation
 *   4. Redirect to Saves page
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Check, X, ExternalLink } from "lucide-react";

export default function ShareTarget() {
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [intent, setIntent] = useState({ title: "", url: "", text: "" });
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [category, setCategory] = useState("other");

  // ── Read intent (params OR sessionStorage set by SW) ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let title = params.get("title") || "";
    let url   = params.get("url")   || params.get("text") || "";
    let text  = params.get("text")  || "";

    // Prefer SW-injected sessionStorage (Android share sheet)
    const swData = sessionStorage.getItem("cf_share_intent");
    if (swData) {
      try {
        const parsed = JSON.parse(swData);
        title = parsed.title || title;
        url   = parsed.url   || url;
        text  = parsed.text  || text;
        sessionStorage.removeItem("cf_share_intent");
      } catch {}
    }

    const finalUrl = url || text;
    setIntent({ title, url: finalUrl, text });

    // Auto-start AI analysis if we have something to work with
    if (finalUrl || title) {
      analyseIntent(title, finalUrl);
    }
  }, []);

  // ── AI analysis ──────────────────────────────────────────────────────────
  const analyseIntent = async (title, url) => {
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
    } catch {}
    setAnalysing(false);
  };

  // ── Save item ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await base44.entities.SavedItem.create({
        title:      intent.title || intent.url || "Shared item",
        url:        intent.url,
        description:intent.text || "",
        category,
        source:     "web",
        ai_summary: aiSummary,
        tags:       [],
      });
      setSaved(true);
      // Redirect to Saves after brief success flash
      setTimeout(() => navigate(createPageUrl("Saves")), 1800);
    } catch (err) {
      setError("Couldn't save this item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => navigate(createPageUrl("Dashboard"));

  // ── Category labels ──────────────────────────────────────────────────────
  const CATEGORY_EMOJI = {
    deal: "🏷️", recipe: "🍽️", event: "📅", product: "🛍️",
    article: "📰", travel: "✈️", gift_idea: "🎁", other: "📌",
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F1117] px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ClipForgeLogo size={40} showText={false} />
          <div>
            <h1 className="text-lg font-bold text-[#E8E8ED]">Save to ClipForge</h1>
            <p className="text-xs text-[#8B8D97]">AI is analysing your share…</p>
          </div>
        </div>

        {/* Item preview card */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          {/* URL */}
          {intent.url && (
            <div className="flex items-center gap-2 text-xs text-[#8B8D97] truncate">
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#00BFFF]" />
              <span className="truncate">{intent.url}</span>
            </div>
          )}

          {/* Title (editable) */}
          <input
            value={intent.title}
            onChange={(e) => setIntent((p) => ({ ...p, title: e.target.value }))}
            placeholder="Title (tap to edit)"
            aria-label="Item title"
            className="w-full bg-transparent text-base font-semibold text-[#E8E8ED] placeholder:text-[#8B8D97]/50 border-b border-[#2A2D3A] pb-1 focus:outline-none focus:border-[#00BFFF]"
            style={{ fontSize: "16px" }} /* prevent iOS zoom */
          />

          {/* AI analysis state */}
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

          {/* Category badge */}
          {!analysing && (
            <div className="flex items-center gap-2">
              <span className="text-lg">{CATEGORY_EMOJI[category] || "📌"}</span>
              <span className="text-sm text-[#E8E8ED] capitalize" data-testid="category-badge">{category.replace("_", " ")}</span>
              <span className="text-xs text-[#8B8D97]">(auto-detected)</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p role="alert" className="text-sm text-red-400 text-center">
            {error}
          </p>
        )}

        {/* Action buttons */}
        {!saved ? (
          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              aria-label="Discard"
              className="flex-none h-14 w-14 rounded-2xl bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] flex items-center justify-center hover:border-red-500/40 hover:text-red-400 transition-all"
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
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save to Vault
                </>
              )}
            </button>
          </div>
        ) : (
          /* Success state */
          <motion.div
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
        )}
      </motion.div>
    </div>
  );
}
