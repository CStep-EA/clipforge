import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, Brain, Lightbulb, ArrowRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

const sentimentColor = {
  positive: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  neutral: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  negative: "text-red-400 bg-red-400/10 border-red-400/20",
};

const actionConfig = {
  buy: { label: "Buy It", color: "bg-emerald-500 text-white" },
  save: { label: "Keep Saving", color: "bg-[#00BFFF] text-white" },
  skip: { label: "Skip It", color: "bg-red-500/80 text-white" },
  research_more: { label: "Research More", color: "bg-[#9370DB] text-white" },
};

export default function DeepResearchPanel({ item, isPro }) {
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runResearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('deepResearch', {
        url: item.url,
        title: item.title,
        description: item.description,
        itemId: item.id,
      });
      if (res.data?.error === 'upgrade_required') {
        setError('upgrade');
      } else if (res.data?.research) {
        setResearch(res.data.research);
      } else {
        setError('Failed to generate research. Please try again.');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (!isPro) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#00BFFF]/5 to-[#9370DB]/5 border border-[#9370DB]/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Lock className="w-3.5 h-3.5 text-[#9370DB]" />
          <span className="text-xs font-semibold text-[#9370DB]">AI Deep Research</span>
          <Badge variant="outline" className="text-[9px] border-[#9370DB]/40 text-[#9370DB] ml-auto">PRO</Badge>
        </div>
        <p className="text-[10px] text-[#8B8D97] mb-2">Get AI-powered web scraping, sentiment analysis, key insights & action recommendations.</p>
        <Link to={createPageUrl("Pricing")}>
          <Button size="sm" className="h-7 text-xs w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
            Upgrade to Pro <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <AnimatePresence mode="wait">
        {!research && !loading && (
          <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              size="sm"
              onClick={runResearch}
              className="h-7 text-xs w-full bg-gradient-to-r from-[#00BFFF]/20 to-[#9370DB]/20 border border-[#9370DB]/30 text-[#E8E8ED] hover:from-[#00BFFF]/30 hover:to-[#9370DB]/30 gap-1.5"
              variant="outline"
            >
              <Sparkles className="w-3 h-3 text-[#9370DB]" /> AI Deep Research
            </Button>
            {error && error !== 'upgrade' && (
              <p className="text-[10px] text-red-400 mt-1 text-center">{error}</p>
            )}
          </motion.div>
        )}

        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-[#9370DB]" />
            <p className="text-[10px] text-[#8B8D97]">Scraping & analyzing...</p>
          </motion.div>
        )}

        {research && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5 p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-[#9370DB]" />
                <span className="text-xs font-semibold text-[#9370DB]">AI Research</span>
              </div>
              <div className="flex items-center gap-1.5">
                {research.sentiment && (
                  <Badge variant="outline" className={cn("text-[9px]", sentimentColor[research.sentiment])}>
                    {research.sentiment}
                  </Badge>
                )}
                {research.action && actionConfig[research.action] && (
                  <Badge className={cn("text-[9px]", actionConfig[research.action].color)}>
                    {actionConfig[research.action].label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Summary */}
            <p className="text-[11px] text-[#C0C2CC] leading-relaxed">{research.summary}</p>

            {/* Key Insights */}
            {research.key_insights?.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400">Key Insights</span>
                </div>
                <ul className="space-y-0.5">
                  {research.key_insights.map((insight, i) => (
                    <li key={i} className="text-[10px] text-[#8B8D97] flex gap-1.5">
                      <span className="text-[#9370DB] mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Relevance */}
            {research.relevance_score && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-[#00BFFF]" />
                <div className="flex-1 h-1.5 bg-[#2A2D3A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] rounded-full"
                    style={{ width: `${research.relevance_score * 10}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#8B8D97]">{research.relevance_score}/10</span>
              </div>
            )}

            {/* Related Topics */}
            {research.related_topics?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {research.related_topics.slice(0, 4).map((topic, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97] border border-[#3A3D4A]">
                    {topic}
                  </span>
                ))}
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setResearch(null)}
              className="h-6 text-[10px] text-[#8B8D97] w-full hover:text-[#E8E8ED]"
            >
              Run again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}