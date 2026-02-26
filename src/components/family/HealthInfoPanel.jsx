import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SOURCES = [
  { id: "webmd", label: "WebMD" },
  { id: "mayo", label: "Mayo Clinic" },
  { id: "cdc", label: "CDC" },
  { id: "kidshealth", label: "KidsHealth" },
];

export default function HealthInfoPanel({ item }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState("webmd");

  const fetch = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const sourceLabel = SOURCES.find(s => s.id === selectedSource)?.label || "WebMD";
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide a brief, general health information summary relevant to the following saved item.
Use only general public health knowledge as if summarizing from ${sourceLabel}.
Be factual, concise (2-3 sentences), and strictly general — no personalized advice.
Include a disclaimer.

Item title: ${item.title}
Item description: ${item.description || ""}
Category: ${item.category}

Format:
SUMMARY: [2-3 sentence general info]
DISCLAIMER: This is general information only, not personalized medical advice. Consult a healthcare professional for personal health concerns.`,
        add_context_from_internet: false,
      });
      const text = typeof res === "string" ? res : String(res);
      setSummary(text);
    } catch {
      setSummary("Unable to fetch health info summary. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Heart className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Health Info</span>
        <div className="flex gap-1 ml-auto">
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSource(s.id)}
              className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${selectedSource === s.id ? "border-red-400/50 bg-red-400/10 text-red-400" : "border-[#2A2D3A] text-[#8B8D97] hover:border-red-400/30"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!summary && !loading && (
          <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              size="sm"
              variant="outline"
              onClick={fetch}
              className="h-7 text-[10px] w-full border-red-400/25 text-red-400 hover:bg-red-400/10 gap-1.5"
            >
              <Heart className="w-3 h-3" /> Get Health Summary
            </Button>
          </motion.div>
        )}

        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 py-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
            <span className="text-[10px] text-[#8B8D97]">Fetching summary…</span>
          </motion.div>
        )}

        {summary && !loading && (
          <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-[#0F1117] border border-red-400/20 space-y-2">
            <p className="text-[10px] text-[#C0C2CC] leading-relaxed whitespace-pre-line">{summary}</p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-400/8 border border-amber-400/20">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[9px] text-amber-400 leading-snug font-medium">
                This is general information only, not personalized medical advice. Consult a healthcare professional for personal health concerns.
              </p>
            </div>
            <button onClick={() => setSummary(null)} className="text-[9px] text-[#8B8D97] hover:text-[#E8E8ED] flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" /> Refresh
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}