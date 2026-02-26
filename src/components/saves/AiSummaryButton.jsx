import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Lock, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function AiSummaryButton({ item, isPro }) {
  const [summary, setSummary] = useState(item.ai_summary || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isPro) {
    return (
      <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-[#00BFFF]/5 to-[#9370DB]/5 border border-[#9370DB]/20">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3 h-3 text-[#9370DB]" />
          <span className="text-[10px] font-semibold text-[#9370DB]">AI Summary</span>
          <Badge variant="outline" className="text-[9px] border-[#9370DB]/40 text-[#9370DB] ml-auto px-1.5">PRO</Badge>
        </div>
        <p className="text-[10px] text-[#8B8D97] mb-1.5">Instant AI-generated summaries for any saved item.</p>
        <Link to={createPageUrl("Pricing")}>
          <Button size="sm" className="h-6 text-[10px] w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-1">
            Upgrade <ArrowRight className="w-2.5 h-2.5" />
          </Button>
        </Link>
      </div>
    );
  }

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize this saved item in 2-3 concise sentences. Be direct and focus on why it's useful or interesting.
Title: ${item.title}
Description: ${item.description || ""}
Category: ${item.category || ""}
URL: ${item.url || ""}`,
      });
      const text = typeof res === "string" ? res : res?.summary || res?.text || String(res);
      setSummary(text);
      // Persist to entity
      await base44.entities.SavedItem.update(item.id, { ai_summary: text });
    } catch (e) {
      setError("Failed to generate. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="mt-2">
      <AnimatePresence mode="wait">
        {!summary && !loading && (
          <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              size="sm"
              variant="outline"
              onClick={generate}
              className="h-7 text-[10px] w-full bg-[#9370DB]/5 border border-[#9370DB]/30 text-[#9370DB] hover:bg-[#9370DB]/10 gap-1.5"
            >
              <Sparkles className="w-3 h-3" /> AI Summary
            </Button>
            {error && <p className="text-[9px] text-red-400 mt-1 text-center">{error}</p>}
          </motion.div>
        )}

        {loading && (
          <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9370DB]" />
            <span className="text-[10px] text-[#8B8D97]">Summarizing…</span>
          </motion.div>
        )}

        {summary && !loading && (
          <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-[#0F1117] border border-[#2A2D3A] space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#9370DB]" />
                <span className="text-[9px] font-semibold text-[#9370DB] uppercase tracking-wide">AI Summary</span>
              </div>
              <button onClick={() => setSummary(null)} className="text-[#8B8D97] hover:text-[#E8E8ED]">
                <RefreshCw className="w-2.5 h-2.5" />
              </button>
            </div>
            <p className="text-[10px] text-[#C0C2CC] leading-relaxed">{summary}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}