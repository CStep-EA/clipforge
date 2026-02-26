import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { TrendingUp, Eye, Heart, Clock, Sparkles, Loader2, Share2 } from "lucide-react";
import StatsCard from "@/components/shared/StatsCard";
import ShareModal from "@/components/friends/ShareModal";
import { useSubscription } from "@/components/shared/useSubscription";
import ReactMarkdown from "react-markdown";

const COLORS = ["#00BFFF", "#9370DB", "#FFB6C1", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#6B7280"];

const categoryLabels = {
  deal: "Deals", recipe: "Recipes", event: "Events", product: "Products",
  article: "Articles", travel: "Travel", gift_idea: "Gifts", other: "Other"
};

export default function Analytics() {
  const { data: items = [] } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list(),
  });

  // Category distribution
  const categoryData = Object.entries(
    items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: categoryLabels[name] || name, value }));

  // Source distribution
  const sourceData = Object.entries(
    items.reduce((acc, item) => {
      acc[item.source || "unknown"] = (acc[item.source || "unknown"] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Saves over time (last 7 days)
  const now = new Date();
  const timeData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const count = items.filter(item => item.created_date?.startsWith(dateStr)).length;
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      saves: count,
    };
  });

  const avgRating = items.length
    ? (items.reduce((sum, i) => sum + (i.rating || 0), 0) / items.filter(i => i.rating).length).toFixed(1)
    : "—";

  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { user, plan, isPro } = useSubscription();

  const generateInsights = async () => {
    setAiLoading(true);
    const summary = categoryData.map(c => `${c.name}: ${c.value}`).join(", ");
    const topTags = items.flatMap(i => i.tags || []).reduce((acc, t) => { acc[t] = (acc[t]||0)+1; return acc; }, {});
    const tagStr = Object.entries(topTags).sort((a,b) => b[1]-a[1]).slice(0,8).map(([t,c]) => `${t}(${c})`).join(", ");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze these personal save patterns and generate insights:\n\nCategories: ${summary}\nTop tags: ${tagStr}\nTotal saves: ${items.length}\nFavorites: ${items.filter(i=>i.is_favorite).length}\n\nProvide 3-4 specific, actionable personal trend insights. Be specific and interesting. Use bullet points. Focus on shopping habits, interests, and recommendations.`,
    });
    setAiInsights(result);
    setAiLoading(false);
  };

  // Radar data for interest profile
  const radarData = categoryData.map(c => ({ subject: c.name, A: c.value, fullMark: Math.max(...categoryData.map(d => d.value)) + 2 }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-[#8B8D97] text-sm">Personal trends and insights</p>
        </div>
        <Button variant="outline" className="border-[#2A2D3A] text-[#E8E8ED] gap-2 animate-share-pulse"
          onClick={() => setShareOpen(true)}>
          <Share2 className="w-4 h-4" /> Share Analytics
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Saves" value={items.length} icon={Eye} accent="#00BFFF" />
        <StatsCard title="Favorites" value={items.filter(i => i.is_favorite).length} icon={Heart} accent="#FFB6C1" />
        <StatsCard title="Avg Rating" value={avgRating} icon={TrendingUp} accent="#9370DB" />
        <StatsCard title="With Reminders" value={items.filter(i => i.reminder_date).length} icon={Clock} accent="#10B981" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity trend */}
        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Saves This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeData}>
              <defs>
                <linearGradient id="colorSaves" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00BFFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="day" tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 12, color: "#E8E8ED", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="saves" stroke="#00BFFF" fill="url(#colorSaves)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category breakdown */}
        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 12, color: "#E8E8ED", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {categoryData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-[10px] text-[#8B8D97]">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                {cat.name}
              </div>
            ))}
          </div>
        </Card>

        {/* By source */}
        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">By Source</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="name" tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 12, color: "#E8E8ED", fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {sourceData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Interest Radar */}
        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Interest Profile</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2A2D3A" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#8B8D97", fontSize: 10 }} />
              <Radar dataKey="A" stroke="#9370DB" fill="#9370DB" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* AI Deep Insights */}
      <Card className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">AI Personal Trend Insights</h3>
          <Button
            size="sm"
            onClick={generateInsights}
            disabled={aiLoading}
            className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2 h-8"
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Generate Insights
          </Button>
        </div>
        {aiInsights ? (
          <div className="prose prose-sm prose-invert max-w-none text-[#E8E8ED]">
            <ReactMarkdown>{aiInsights}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-[#8B8D97]">Click "Generate Insights" to get personalized AI analysis of your saving habits and trends.</p>
        )}
      </Card>
    </div>
  );
}