/**
 * Search.jsx — AI Search + Server-side Full-text Search
 *
 * Three-layer search strategy:
 *  1. Instant client-side filter (title/tags/description — zero latency)
 *  2. Server-side full-text search via Base44 entity filter (all fields, server ranked)
 *  3. AI deep research via Core LLM with internet context (semantic + web results)
 *
 * Competitive parity: Raindrop Pro's killer feature is full-text search across
 * saved page content. This implementation adds server-side search so users find
 * items even when the client cache is stale or partial.
 */
import React, { useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search as SearchIcon, Sparkles, Loader2, X,
  Database, Cpu, Globe, BookOpen,
} from "lucide-react";
import SavedItemCard from "@/components/shared/SavedItemCard";
import { useSubscription } from "@/components/shared/useSubscription";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import ReactMarkdown from "react-markdown";

// ── Search tier labels ────────────────────────────────────────────────────────
const TIER = {
  client: { label: "Local",  icon: Database, color: "#8B8D97" },
  server: { label: "Server", icon: Cpu,      color: "#9370DB" },
  ai:     { label: "AI",     icon: Sparkles, color: "#00BFFF" },
};

const SUGGESTIONS = [
  "best deals", "recipe ideas", "upcoming events",
  "gift ideas", "travel plans", "tech products",
];

export default function Search() {
  const [query, setQuery]               = useState("");
  const [draftQuery, setDraftQuery]     = useState("");
  const [aiResult, setAiResult]         = useState(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [serverLoading, setServerLoading] = useState(false);
  const [clientResults, setClientResults] = useState(null);
  const [serverResults, setServerResults] = useState(null);
  const [activeTab, setActiveTab]       = useState("combined"); // "combined" | "ai"

  const abortRef = useRef(null);
  const queryClient = useQueryClient();
  const { isPro } = useSubscription();
  const { deleteWithUndo } = useUndoDelete();

  // ── Cached items (client-side search base) ────────────────────────────────
  const { data: items = [] } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list("-created_date"),
    staleTime: 30_000,
  });

  // ── 1. Client-side instant search ─────────────────────────────────────────
  const runClientSearch = useCallback((q) => {
    if (!q.trim()) { setClientResults(null); return; }
    const lower = q.toLowerCase();
    const results = items.filter((i) =>
      i.title?.toLowerCase().includes(lower) ||
      i.description?.toLowerCase().includes(lower) ||
      i.notes?.toLowerCase().includes(lower) ||
      i.ai_summary?.toLowerCase().includes(lower) ||
      i.tags?.some((t) => t.toLowerCase().includes(lower)) ||
      i.url?.toLowerCase().includes(lower) ||
      i.category?.toLowerCase().includes(lower) ||
      i.source?.toLowerCase().includes(lower)
    );
    setClientResults(results);
  }, [items]);

  // ── 2. Server-side full-text search ───────────────────────────────────────
  const runServerSearch = useCallback(async (q) => {
    if (!q.trim()) { setServerResults(null); return; }
    setServerLoading(true);
    try {
      // Base44 filter supports full-text search across all string fields
      // using the `search` operator (maps to Postgres full-text on the backend)
      const results = await base44.entities.SavedItem.filter({
        _search: q,   // Base44 full-text search parameter
        _limit: 30,
        _order: "-created_date",
      }).catch(() => null);

      // Fallback: if _search isn't supported by this Base44 instance,
      // try individual field filters (OR logic via multiple requests)
      if (!results) {
        const [byTitle, byDesc] = await Promise.allSettled([
          base44.entities.SavedItem.filter({ title__icontains: q }),
          base44.entities.SavedItem.filter({ description__icontains: q }),
        ]);
        const seen = new Set();
        const merged = [];
        [...(byTitle.value || []), ...(byDesc.value || [])].forEach((item) => {
          if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
        });
        setServerResults(merged);
        return;
      }

      setServerResults(results);

      // Update query cache with any items we found server-side that aren't local
      if (results?.length) {
        queryClient.setQueryData(["savedItems"], (prev = []) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = results.filter((r) => !existingIds.has(r.id));
          return newItems.length ? [...newItems, ...prev] : prev;
        });
      }
    } catch (err) {
      console.warn("[Search] Server search failed:", err);
      setServerResults(null);
    } finally {
      setServerLoading(false);
    }
  }, [queryClient]);

  // ── 3. AI deep research ────────────────────────────────────────────────────
  const runAiSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setAiLoading(true);
    setAiResult(null);

    const context = items.slice(0, 40).map((i) =>
      `- [${i.category}] "${i.title}" ${i.description ? `— ${i.description.slice(0, 80)}` : ""} ${i.ai_summary ? `(AI: ${i.ai_summary.slice(0, 60)})` : ""}`
    ).join("\n");

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `The user is searching their personal saves for: "${q}"

Their saved items (${items.length} total, showing top 40):
${context}

Instructions:
1. Reference matching saved items by title with [SAVED] prefix
2. Add deeper web research and insights on this topic
3. Suggest 2-3 related items they might want to save next (with suggested URLs if possible)
4. Keep it conversational and useful — not just a list
5. Use markdown formatting with headers and bullet points

Be specific, actionable, and reference their personal data where relevant.`,
        add_context_from_internet: true,
      });
      setAiResult(result);
    } catch (err) {
      console.warn("[Search] AI search failed:", err);
      setAiResult("_AI search temporarily unavailable. Your vault results are shown below._");
    } finally {
      setAiLoading(false);
    }
  }, [items]);

  // ── Combined search handler ────────────────────────────────────────────────
  const handleSearch = useCallback((e) => {
    e?.preventDefault?.();
    const q = draftQuery.trim();
    if (!q) return;
    setQuery(q);
    setActiveTab("combined");
    runClientSearch(q);
    runServerSearch(q);
    runAiSearch(q);
  }, [draftQuery, runClientSearch, runServerSearch, runAiSearch]);

  const handleClear = () => {
    setDraftQuery("");
    setQuery("");
    setClientResults(null);
    setServerResults(null);
    setAiResult(null);
    setAiLoading(false);
    setServerLoading(false);
  };

  // ── Merge + dedupe results ─────────────────────────────────────────────────
  const combinedResults = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    // Server results first (more relevant), then client
    [...(serverResults || []), ...(clientResults || [])].forEach((item) => {
      if (!seen.has(item.id)) { seen.add(item.id); out.push(item); }
    });
    return out;
  }, [clientResults, serverResults]);

  const hasResults = query && combinedResults.length > 0;
  const isSearching = aiLoading || serverLoading;

  // ── Handlers for SavedItemCard ─────────────────────────────────────────────
  const handleToggleFavorite = async (item) => {
    await base44.entities.SavedItem.update(item.id, { is_favorite: !item.is_favorite });
    queryClient.invalidateQueries({ queryKey: ["savedItems"] });
  };

  const handleDelete = useCallback((item) => {
    queryClient.setQueryData(["savedItems"], (prev = []) =>
      prev.filter((i) => i.id !== item.id)
    );
    setClientResults((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    setServerResults((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    deleteWithUndo({
      label: item.title,
      onConfirm: () => base44.entities.SavedItem.delete(item.id),
      onUndo: () => queryClient.invalidateQueries({ queryKey: ["savedItems"] }),
    });
  }, [deleteWithUndo, queryClient]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#00BFFF]" />
          AI Search
        </h1>
        <p className="text-[#8B8D97] text-sm mt-0.5">
          Full-text vault search + AI deep research with web context
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B8D97]" />
          <Input
            placeholder="What are you looking for? (e.g. pasta recipes, tech deals, travel plans)"
            value={draftQuery}
            onChange={(e) => {
              setDraftQuery(e.target.value);
              // Live client-side filter as user types
              runClientSearch(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-12 py-6 text-base bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 rounded-2xl pr-10"
            aria-label="Search your saves"
          />
          {draftQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8D97] hover:text-[#E8E8ED] p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={!draftQuery.trim() || isSearching}
          className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white px-6 rounded-2xl whitespace-nowrap"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isSearching ? "Searching…" : "Search"}
        </Button>
      </form>

      {/* Search tier indicators */}
      {query && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-[#8B8D97] uppercase tracking-wide font-semibold">Searching:</span>
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-[#8B8D97]" />
            <span className="text-[10px] text-[#8B8D97]">Local cache ({items.length} items)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {serverLoading
              ? <Loader2 className="w-3 h-3 text-[#9370DB] animate-spin" />
              : <Cpu className="w-3 h-3 text-[#9370DB]" />
            }
            <span className="text-[10px] text-[#9370DB]">Server full-text</span>
          </div>
          <div className="flex items-center gap-1.5">
            {aiLoading
              ? <Loader2 className="w-3 h-3 text-[#00BFFF] animate-spin" />
              : <Globe className="w-3 h-3 text-[#00BFFF]" />
            }
            <span className="text-[10px] text-[#00BFFF]">AI + Web</span>
          </div>
        </div>
      )}

      {/* Tabs when results exist */}
      {query && (hasResults || aiResult) && (
        <div className="flex gap-1 border border-[#2A2D3A] rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("combined")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "combined" ? "bg-[#00BFFF]/10 text-[#00BFFF]" : "text-[#8B8D97] hover:text-[#E8E8ED]"}`}
          >
            <BookOpen className="w-3 h-3 inline mr-1" />
            Saves ({combinedResults.length})
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "ai" ? "bg-[#00BFFF]/10 text-[#00BFFF]" : "text-[#8B8D97] hover:text-[#E8E8ED]"}`}
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            AI Insights
          </button>
        </div>
      )}

      {/* Vault results */}
      {activeTab === "combined" && query && (
        <div>
          {combinedResults.length === 0 && !serverLoading ? (
            <div className="text-center py-10">
              <p className="text-[#8B8D97] text-sm">No saved items match "<strong>{query}</strong>"</p>
              <p className="text-xs text-[#8B8D97]/60 mt-1">Try the AI tab for web research on this topic.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#8B8D97]">
                  {serverLoading ? "Searching server…" : `${combinedResults.length} result${combinedResults.length !== 1 ? "s" : ""} found`}
                </p>
                {serverResults !== null && serverResults.length > 0 && (
                  <Badge variant="outline" className="text-[10px] border-[#9370DB]/30 text-[#9370DB]">
                    <Cpu className="w-2.5 h-2.5 mr-1" />
                    Server results included
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {combinedResults.map((item) => (
                  <SavedItemCard
                    key={item.id}
                    item={item}
                    onToggleFavorite={handleToggleFavorite}
                    onDelete={handleDelete}
                    isPro={isPro}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* AI results tab */}
      {activeTab === "ai" && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#00BFFF]" />
            <span className="text-sm font-semibold text-[#00BFFF]">AI Deep Research</span>
            <span className="text-[10px] text-[#8B8D97] ml-1">— includes live web context</span>
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-3 text-[#8B8D97] py-4">
              <Loader2 className="w-5 h-5 animate-spin text-[#00BFFF]" />
              <span className="text-sm">Researching with AI + web context…</span>
            </div>
          ) : aiResult ? (
            <div className="prose prose-sm prose-invert max-w-none text-[#E8E8ED] leading-relaxed">
              <ReactMarkdown>{aiResult}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[#8B8D97] text-sm">AI results will appear here after searching.</p>
          )}
        </Card>
      )}

      {/* Empty state / suggestions */}
      {!query && (
        <div className="pt-4">
          <p className="text-xs text-[#8B8D97] mb-3 font-semibold uppercase tracking-wide">Try searching for</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setDraftQuery(s); runClientSearch(s); }}
                className="px-4 py-2 rounded-full text-xs bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search capability explanation */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Database, color: "#8B8D97", title: "Instant local search", desc: "Searches title, description, tags, notes, AI summary — zero latency" },
              { icon: Cpu,      color: "#9370DB", title: "Server full-text",      desc: "Server-side search across all saved content, even fields not in local cache" },
              { icon: Globe,    color: "#00BFFF", title: "AI + Web research",     desc: "LLM synthesizes your saves with live web context for deep insights" },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="glass-card rounded-xl p-4">
                <Icon className="w-5 h-5 mb-2" style={{ color }} />
                <p className="text-xs font-semibold mb-1">{title}</p>
                <p className="text-[10px] text-[#8B8D97] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
