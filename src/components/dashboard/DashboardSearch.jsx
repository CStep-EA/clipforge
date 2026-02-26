import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardSearch({ items, onResults }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (val) => {
    setQuery(val);
    if (!val.trim()) { onResults(null); return; }

    // Basic keyword filter instantly
    const q = val.toLowerCase();
    const fast = items.filter(i =>
      i.title?.toLowerCase().includes(q) ||
      i.tags?.some(t => t.toLowerCase().includes(q)) ||
      i.category?.includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
    onResults(fast);

    // NLP AI search after 800ms debounce if query is substantive
    clearTimeout(debounceRef.current);
    if (val.length > 8) {
      debounceRef.current = setTimeout(() => runAiSearch(val, items), 800);
    }
  };

  const runAiSearch = async (q, allItems) => {
    setLoading(true);
    setAiMode(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a semantic search engine. Given this search query: "${q}", and this list of saved items (as JSON), return the IDs of the most relevant items in order of relevance. Use NLP to understand intent, synonyms, and topics. Items: ${JSON.stringify(allItems.map(i => ({ id: i.id, title: i.title, category: i.category, tags: i.tags, description: i.description?.slice(0, 100) })))}`,
        response_json_schema: {
          type: "object",
          properties: { ids: { type: "array", items: { type: "string" } } },
        },
      });
      const ids = res?.ids || [];
      const ranked = ids.map(id => allItems.find(i => i.id === id)).filter(Boolean);
      if (ranked.length > 0) onResults(ranked);
    } catch (_) {}
    setLoading(false);
  };

  const clear = () => { setQuery(""); setAiMode(false); onResults(null); };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8D97]" />
          <Input
            placeholder='Search saves… try "cheap flights" or "pasta recipes"'
            value={query}
            onChange={e => handleChange(e.target.value)}
            className="pl-10 pr-10 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 focus:border-[#00BFFF]/50"
          />
          {query && (
            <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8D97] hover:text-[#E8E8ED]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {loading && <div className="flex items-center px-2"><Loader2 className="w-4 h-4 animate-spin text-[#9370DB]" /></div>}
      </div>
      <AnimatePresence>
        {aiMode && query && !loading && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-10 left-0 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9370DB]/10 border border-[#9370DB]/20 text-[10px] text-[#9370DB]">
            <Sparkles className="w-2.5 h-2.5" /> AI semantic search active
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}