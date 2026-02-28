import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function RateLimitLog() {
  const { data: hits = [], isLoading, refetch } = useQuery({
    queryKey: ["rate-limit-hits"],
    queryFn: () => base44.entities.RateLimitHit.list("-created_date", 100),
  });

  const endpointColor = {
    deepResearch: "bg-[#9370DB]/20 text-[#9370DB]",
    streamingFetchItems: "bg-[#00BFFF]/20 text-[#00BFFF]",
    ticketmaster: "bg-[#F59E0B]/20 text-[#F59E0B]",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h3 className="font-semibold">Rate Limit Hits</h3>
          <Badge variant="outline" className="text-xs">{hits.length} logged</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#8B8D97]">Loading...</p>
      ) : hits.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center text-sm text-[#8B8D97]">
          No rate limit hits recorded yet.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {hits.map((hit) => (
            <div key={hit.id} className="glass-card rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono text-xs text-[#E8E8ED] truncate max-w-[160px]">{hit.user_email}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${endpointColor[hit.endpoint] || "bg-gray-500/20 text-gray-400"}`}>
                {hit.endpoint}
              </span>
              <span className="text-[#8B8D97] text-xs">
                {hit.hits_in_window}/{hit.limit} in {hit.window_minutes}m
              </span>
              <span className="ml-auto text-[10px] text-[#8B8D97]">
                {hit.created_date ? format(new Date(hit.created_date), "MMM d, HH:mm") : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}