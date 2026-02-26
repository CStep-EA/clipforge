import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { RefreshCw, Loader2, AlertTriangle, ThumbsUp, ThumbsDown, Minus, Zap, ExternalLink, Ticket } from "lucide-react";
import { toast } from "sonner";
import FeedbackConfig from "./FeedbackConfig";

const SOURCE_EMOJI = { reddit: "🟠", twitter: "🐦", producthunt: "🚀", g2: "⭐", capterra: "📋", appstore: "🍎", playstore: "🤖", technews: "📰", manual: "✍️" };
const SENTIMENT_COLOR = { positive: "#10B981", negative: "#EF4444", neutral: "#8B8D97", mixed: "#F59E0B" };
const CATEGORY_COLOR = { bug: "#EF4444", feature_request: "#00BFFF", praise: "#10B981", complaint: "#F59E0B", question: "#9370DB", other: "#8B8D97" };

const SentimentIcon = ({ s }) => s === "positive" ? <ThumbsUp className="w-3 h-3" /> : s === "negative" ? <ThumbsDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />;

export default function FeedbackIntelligence() {
  const [fetching, setFetching] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedbackItems"],
    queryFn: () => base44.entities.FeedbackItem.list("-created_date", 100),
  });

  const handleFetch = async () => {
    setFetching(true);
    try {
      const res = await base44.functions.invoke("fetchFeedback", {});
      const d = res.data;
      setLastRun(d);
      queryClient.invalidateQueries({ queryKey: ["feedbackItems"] });
      queryClient.invalidateQueries({ queryKey: ["allTickets"] });
      toast.success(`Fetched ${d.items_fetched} items, created ${d.tickets_created} ticket(s)`);
    } catch (e) {
      toast.error("Fetch failed: " + e.message);
    }
    setFetching(false);
  };

  const handleCreateTicket = async (item) => {
    await base44.entities.SupportTicket.create({
      subject: `[Feedback] ${item.source.toUpperCase()}: ${(item.ai_summary || item.content).slice(0, 80)}`,
      message: `**Source:** ${item.source}\n**Author:** ${item.author || 'Unknown'}\n\n${item.content}`,
      status: "open",
      priority: item.priority || "medium",
      category: item.category === "bug" ? "bug" : "general",
    });
    await base44.entities.FeedbackItem.update(item.id, { ticket_created: true });
    queryClient.invalidateQueries({ queryKey: ["feedbackItems"] });
    queryClient.invalidateQueries({ queryKey: ["allTickets"] });
    toast.success("Ticket created");
  };

  // Build chart data
  const sentimentData = Object.entries(
    items.reduce((acc, i) => { acc[i.sentiment] = (acc[i.sentiment] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value, color: SENTIMENT_COLOR[name] }));

  const categoryData = Object.entries(
    items.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const sourceData = Object.entries(
    items.reduce((acc, i) => { acc[i.source] = (acc[i.source] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: SOURCE_EMOJI[name] + " " + name, value }));

  const urgentItems = items.filter(i => i.priority === "urgent" || i.priority === "high");
  const unticketedIssues = items.filter(i => !i.ticket_created && (i.category === "bug" || i.category === "complaint"));

  if (showConfig) return <FeedbackConfig onBack={() => setShowConfig(false)} />;

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-[#8B8D97]">{items.length} feedback items collected</p>
          {lastRun && <p className="text-[10px] text-emerald-400">Last run: {lastRun.items_fetched} fetched, {lastRun.tickets_created} tickets auto-created</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] gap-1.5" onClick={() => setShowConfig(true)}>
            ⚙️ Configure
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white gap-1.5" onClick={handleFetch} disabled={fetching}>
            {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {fetching ? "Fetching…" : "Fetch Now"}
          </Button>
        </div>
      </div>

      {/* Urgent alerts */}
      {urgentItems.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">{urgentItems.length} high-priority item{urgentItems.length > 1 ? "s" : ""} need attention</span>
          </div>
          {urgentItems.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-[#1A1D27] border border-red-500/10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs">{SOURCE_EMOJI[item.source]}</span>
                  <Badge variant="outline" className="text-[9px] text-red-400 border-red-400/30">{item.priority}</Badge>
                  <Badge variant="outline" className="text-[9px] text-[#8B8D97] border-[#2A2D3A]">{item.category}</Badge>
                </div>
                <p className="text-xs text-[#E8E8ED] line-clamp-2">{item.ai_summary || item.content}</p>
              </div>
              {!item.ticket_created && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-red-400/30 text-red-400 hover:bg-red-400/10 gap-1 shrink-0" onClick={() => handleCreateTicket(item)}>
                  <Ticket className="w-3 h-3" /> Create Ticket
                </Button>
              )}
              {item.ticket_created && <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30 shrink-0">✓ Ticketed</Badge>}
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card p-4">
            <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-wider mb-3">Sentiment</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {sentimentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 8, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card className="glass-card p-4">
            <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-wider mb-3">By Category</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8B8D97" }} width={80} />
                <Tooltip contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((e, i) => <Cell key={i} fill={CATEGORY_COLOR[e.name] || "#8B8D97"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="glass-card p-4">
            <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-wider mb-3">By Source</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sourceData} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#8B8D97" }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="value" fill="#9370DB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Feed */}
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#00BFFF]" /></div>}

      {!isLoading && items.length === 0 && (
        <Card className="glass-card p-10 text-center">
          <div className="text-4xl mb-3">📡</div>
          <p className="font-semibold mb-1">No feedback collected yet</p>
          <p className="text-sm text-[#8B8D97] mb-4">Click "Fetch Now" to scan for mentions, reviews, and feedback about ClipForge across the web.</p>
          <Button onClick={handleFetch} disabled={fetching} className="bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white gap-2">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {fetching ? "Scanning…" : "Start Intelligence Scan"}
          </Button>
        </Card>
      )}

      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Recent Feedback</p>
            {unticketedIssues.length > 0 && (
              <Badge variant="outline" className="text-[10px] text-[#F59E0B] border-[#F59E0B]/30">
                {unticketedIssues.length} unticketed issue{unticketedIssues.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {items.slice(0, 30).map(item => (
              <div key={item.id} className="glass-card p-3 rounded-xl flex items-start gap-3">
                <span className="text-lg mt-0.5 shrink-0">{SOURCE_EMOJI[item.source] || "💬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-semibold text-[#8B8D97] uppercase">{item.source}</span>
                    {item.author && <span className="text-[10px] text-[#8B8D97]">@{item.author}</span>}
                    <Badge variant="outline" className="text-[9px]" style={{ color: SENTIMENT_COLOR[item.sentiment], borderColor: `${SENTIMENT_COLOR[item.sentiment]}40` }}>
                      <SentimentIcon s={item.sentiment} />&nbsp;{item.sentiment}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]" style={{ color: CATEGORY_COLOR[item.category], borderColor: `${CATEGORY_COLOR[item.category]}40` }}>
                      {item.category}
                    </Badge>
                    {(item.priority === "urgent" || item.priority === "high") && (
                      <Badge variant="outline" className="text-[9px] text-red-400 border-red-400/30">⚠ {item.priority}</Badge>
                    )}
                    {item.ticket_created && <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30">✓ Ticketed</Badge>}
                  </div>
                  <p className="text-xs text-[#E8E8ED] line-clamp-2">{item.content}</p>
                  {item.ai_summary && <p className="text-[10px] text-[#8B8D97] mt-0.5 italic">{item.ai_summary}</p>}
                  {item.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.keywords.map(k => <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97]">{k}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {item.source_url && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#8B8D97] hover:text-[#00BFFF]" onClick={() => window.open(item.source_url, "_blank")}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                  {!item.ticket_created && (item.category === "bug" || item.category === "complaint") && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#8B8D97] hover:text-[#F59E0B]" title="Create ticket" onClick={() => handleCreateTicket(item)}>
                      <Ticket className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}