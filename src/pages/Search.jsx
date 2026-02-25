import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search as SearchIcon, Sparkles, Loader2, ExternalLink } from "lucide-react";
import SavedItemCard from "@/components/shared/SavedItemCard";
import ReactMarkdown from "react-markdown";

export default function Search() {
  const [query, setQuery] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [localResults, setLocalResults] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list(),
  });

  const searchLocal = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    const results = items.filter(i =>
      i.title?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.tags?.some(t => t.toLowerCase().includes(q)) ||
      i.ai_summary?.toLowerCase().includes(q) ||
      i.notes?.toLowerCase().includes(q)
    );
    setLocalResults(results);
  };

  const deepSearch = async () => {
    if (!query.trim()) return;
    setAiLoading(true);

    const savedContext = items.slice(0, 30).map(i => 
      `- ${i.title} (${i.category}) ${i.ai_summary || i.description || ""}`
    ).join("\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `The user is searching for: "${query}"\n\nHere are their saved items for context:\n${savedContext}\n\nProvide a helpful response that:\n1. References any relevant saved items\n2. Adds deeper research and insights on the topic\n3. Suggests related items they might want to save\n4. Includes any deals, events, or recommendations\n\nBe concise but thorough. Use markdown formatting.`,
      add_context_from_internet: true,
    });

    setAiResult(result);
    setAiLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchLocal();
    deepSearch();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Search</h1>
        <p className="text-[#8B8D97] text-sm">Search your vault and get deep AI insights</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B8D97]" />
          <Input
            placeholder="What are you looking for?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 py-6 text-base bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 rounded-2xl"
          />
        </div>
        <Button type="submit" className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white px-6 rounded-2xl">
          <Sparkles className="w-4 h-4 mr-2" /> Search
        </Button>
      </form>

      {/* AI Results */}
      {(aiLoading || aiResult) && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#00BFFF]" />
            <span className="text-sm font-semibold text-[#00BFFF]">AI Insights</span>
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-3 text-[#8B8D97]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Researching...</span>
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-[#E8E8ED]">
              <ReactMarkdown>{aiResult}</ReactMarkdown>
            </div>
          )}
        </Card>
      )}

      {/* Local results */}
      {localResults !== null && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-[#8B8D97]">
            {localResults.length} match{localResults.length !== 1 ? "es" : ""} in your vault
          </h3>
          {localResults.length === 0 ? (
            <p className="text-xs text-[#8B8D97]">No saved items match your search.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {localResults.map(item => (
                <SavedItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick suggestions */}
      {!localResults && !aiResult && (
        <div className="pt-8">
          <p className="text-xs text-[#8B8D97] mb-3">Try searching for</p>
          <div className="flex flex-wrap gap-2">
            {["best deals", "recipe ideas", "upcoming events", "gift ideas for partner", "travel plans"].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); }}
                className="px-4 py-2 rounded-full text-xs bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}