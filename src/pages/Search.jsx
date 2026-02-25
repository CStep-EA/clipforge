import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Sparkles, Loader2, BookmarkPlus, TrendingUp, Gift, Zap, Clock } from "lucide-react";
import SavedItemCard from "@/components/shared/SavedItemCard";
import ReactMarkdown from "react-markdown";
import { usePlan } from "@/components/shared/usePlan";
import PremiumGate from "@/components/shared/PremiumGate";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const QUICK_SEARCHES = [
  { label: "Best deals this week", icon: "🏷️" },
  { label: "Recipe ideas for dinner", icon: "🍽️" },
  { label: "Gift ideas for partner", icon: "🎁" },
  { label: "Upcoming local events", icon: "🎟️" },
  { label: "Travel bucket list", icon: "✈️" },
  { label: "Weekend activities", icon: "🎯" },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState(null);
  const [insights, setInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [localResults, setLocalResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const { isPro, isPremium } = usePlan();
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list(),
  });

  const searchLocal = (q) => {
    const lq = q.toLowerCase();
    return items.filter(i =>
      i.title?.toLowerCase().includes(lq) ||
      i.description?.toLowerCase().includes(lq) ||
      i.tags?.some(t => t.toLowerCase().includes(lq)) ||
      i.ai_summary?.toLowerCase().includes(lq) ||
      i.notes?.toLowerCase().includes(lq)
    );
  };

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    const local = searchLocal(q);
    setLocalResults(local);
    setReport(null);
    setInsights(null);
    setAiLoading(true);

    const savedContext = items.slice(0, 30).map(i => ({
      title: i.title, category: i.category, ai_summary: i.ai_summary, description: i.description,
    }));

    const res = await base44.functions.invoke("deepResearch", { topic: q, savedContext });
    setReport(res.data?.report || null);
    setInsights(res.data?.insights || null);
    setAiLoading(false);
  };

  const saveResultAsItem = async () => {
    if (!report || !query) return;
    setSaving(true);
    await base44.entities.SavedItem.create({
      title: `Research: ${query}`,
      ai_summary: report.slice(0, 500),
      category: insights?.category || "article",
      source: "web",
      tags: insights?.keywords || [],
      rating: insights?.urgency_score || 7,
    });
    queryClient.invalidateQueries({ queryKey: ["savedItems"] });
    toast.success("Research saved to vault!");
    setSaving(false);
  };

  const trendColor = { rising: "#10B981", stable: "#F59E0B", declining: "#EF4444" };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Deep Search</h1>
        <p className="text-[#8B8D97] text-sm">Search your vault + get live web research on any topic</p>
      </div>

      {/* Search bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B8D97]" />
          <Input
            placeholder="Search or research anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 py-6 text-base bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 rounded-2xl"
          />
        </div>
        <Button type="submit" className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white px-6 rounded-2xl">
          <Sparkles className="w-4 h-4 mr-2" /> Search
        </Button>
      </form>

      {/* Quick searches */}
      {!localResults && !report && !aiLoading && (
        <div>
          <p className="text-xs text-[#8B8D97] mb-3">Quick searches</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SEARCHES.map(s => (
              <button
                key={s.label}
                onClick={() => { setQuery(s.label); handleSearch(s.label); }}
                className="px-3 py-1.5 rounded-full text-xs bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all flex items-center gap-1.5"
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {aiLoading && (
        <Card className="glass-card p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#00BFFF] animate-spin" />
          <p className="text-sm text-[#8B8D97]">Researching across the web + your vault…</p>
        </Card>
      )}

      {/* NLP Insights bar */}
      <AnimatePresence>
        {insights && !aiLoading && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card p-4 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: trendColor[insights.trend_direction] }} />
                <span className="text-xs capitalize" style={{ color: trendColor[insights.trend_direction] }}>
                  {insights.trend_direction}
                </span>
              </div>
              {insights.keywords?.slice(0, 5).map(kw => (
                <Badge key={kw} variant="outline" className="text-[10px] border-[#2A2D3A] text-[#8B8D97]">
                  {kw}
                </Badge>
              ))}
              {insights.gift_potential >= 7 && (
                <Badge className="text-[10px] bg-[#FFB6C1]/15 text-[#FFB6C1] border-[#FFB6C1]/20">
                  <Gift className="w-2.5 h-2.5 mr-1" />Gift potential: {insights.gift_potential}/10
                </Badge>
              )}
              {insights.urgency_score >= 7 && (
                <Badge className="text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/20">
                  <Zap className="w-2.5 h-2.5 mr-1" />Time sensitive
                </Badge>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                insights.sentiment === "positive" ? "bg-emerald-500/10 text-emerald-400"
                : insights.sentiment === "negative" ? "bg-red-500/10 text-red-400"
                : "bg-[#2A2D3A] text-[#8B8D97]"
              }`}>{insights.sentiment}</span>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deep Research Report */}
      <AnimatePresence>
        {report && !aiLoading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <PremiumGate allowed={isPro} plan="pro" label="AI Deep Research with live web data requires Pro">
              <Card className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00BFFF]" />
                    <span className="text-sm font-semibold text-[#00BFFF]">Deep Research Report</span>
                  </div>
                  <Button size="sm" onClick={saveResultAsItem} disabled={saving} variant="outline"
                    className="border-[#2A2D3A] text-xs h-7 gap-1">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookmarkPlus className="w-3 h-3" />}
                    Save to Vault
                  </Button>
                </div>
                <div className="prose prose-sm prose-invert max-w-none text-[#E8E8ED]">
                  <ReactMarkdown>{report}</ReactMarkdown>
                </div>
              </Card>
            </PremiumGate>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Local vault results */}
      {localResults !== null && !aiLoading && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-[#8B8D97]">
            {localResults.length} match{localResults.length !== 1 ? "es" : ""} in your vault
          </h3>
          {localResults.length === 0 ? (
            <p className="text-xs text-[#8B8D97]">No saved items match — but check the research above!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {localResults.map(item => (
                <SavedItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}