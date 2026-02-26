import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardSearch({ items, onResults, onClear }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) { onClear(); return; }
    setLoading(true);
    // NLP: use AI to expand query into matching titles/tags/categories
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Given this search query: "${query}", and these saved items (as JSON), return the IDs of items that match the query's intent. Consider synonyms, topics, and semantic meaning — not just exact words.\n\nItems: ${JSON.stringify(items.map(i => ({ id: i.id, title: i.title, category: i.category, tags: i.tags, description: i.description })))}`,
      response_json_schema: {
        type: "object",
        properties: {
          matched_ids: { type: "array", items: { type: "string" } },
          reasoning: { type: "string" }
        }
      }
    });
    const matched = items.filter(i => result.matched_ids?.includes(i.id));
    onResults(matched, result.reasoning);
    setLoading(false);
  };

  const handleClear = () => {
    setQuery("");
    onClear();
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8D97]" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Deep search — try 'cheap pasta ideas under $10' or 'summer gifts for mom'..."
          className="pl-9 pr-9 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#4A4D57] h-10"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8D97] hover:text-[#E8E8ED]"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <Button type="submit" disabled={loading} className="bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/20 h-10 px-4">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
      </Button>
    </form>
  );
}