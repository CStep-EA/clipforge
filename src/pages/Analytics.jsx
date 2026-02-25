import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line
} from "recharts";
import { TrendingUp, Eye, Heart, Clock, Sparkles, Loader2, Tag, Crown } from "lucide-react";
import StatsCard from "@/components/shared/StatsCard";
import ReactMarkdown from "react-markdown";
import { usePlan } from "@/components/shared/usePlan";
import PremiumGate from "@/components/shared/PremiumGate";

const COLORS = ["#00BFFF", "#9370DB", "#FFB6C1", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#6B7280"];

const categoryLabels = {
  deal: "Deals", recipe: "Recipes", event: "Events", product: "Products",
  article: "Articles", travel: "Travel", gift_idea: "Gifts", other: "Other"
};

export default function Analytics() {
  const { isPro, isPremium } = usePlan();

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
      acc[item.source || "manual"] = (acc[item.source || "manual"] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Saves over last 30 days (weekly buckets)
  const now = new Date();
  const timeData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (11 - i) * 7);
    const weekStart = date.toISOString().split("T")[0];
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const count = items.filter(item => {
      if (!item.created_date) return false;
      const d = new Date(item.created_date);
      return d >= weekStartDate && d < weekEndDate;
    }).length;
    return {
      week: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      saves: count,
    };
  });

  // Top tags
  const topTags = Object.entries(
    items.flatMap(i => i.tags || []).reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));

  // Rating distribution
  const ratingData = [1,2,3,4,5,6,7,8,9,10].map(r => ({
    rating: r,
    count: items.filter(i => Math.round(i.rating) === r).length,
  }));

  const avgRating = items.filter(i => i.rating).length
    ? (items.reduce((sum, i) => sum + (i.rating || 0), 0) / items.filter(i => i.rating).length).toFixed(1)
    : "—";

  const radarData = categoryData.map(c => ({
    subject: c.name, A: c.value,
    fullMark: Math.max(...categoryData.map(d => d.value), 1) + 2,
  }));

  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateInsights = async () => {
    setAiLoading(true);
    const summary = categoryData.map(c => `${c.name}: ${c.value}`).join(", ");
    const tagStr = topTags.slice(0, 8).map(t => `${t.tag}(${t.count})`).join(", ");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze these personal save patterns and generate deep insights:\n\nCategories: ${summary}\nTop tags: ${tagStr}\nTotal saves: ${items.length}\nFavorites: ${items.filter(i=>i.is_favorite).length}\nAvg rating: ${avgRating}\n\nProvide:\n1. 3-4 specific personal trend insights\n2. Shopping habit patterns you notice\n3. Gift/recommendation opportunities based on interests\n4. What topics are trending up in their saves\n5. One surprising insight\n\nUse markdown with emojis. Be specific and actionable.`,
      add_context_from_internet: false,
    });
    setAiInsights(result);
    setAiLoading(false);
  };

  const tooltipStyle = { background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 12, color: "#E8E8ED", fontSize: 12 };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-[#8B8D97] text-sm">Personal trends, NLP insights, and habit patterns</p>
        </div>
        {isPremium && (
          <Badge className="bg-[#9370DB]/20 text-[#9370DB] border-[#9370DB]/30 gap-1">
            <Crown className="w-3 h-3" /> Premium Analytics
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Saves" value={items.length} icon={Eye} accent="#00BFFF" />
        <StatsCard title="Favorites" value={items.filter(i => i.is_favorite).length} icon={Heart} accent="#FFB6C1" />
        <StatsCard title="Avg Rating" value={avgRating} icon={TrendingUp} accent="#9370DB" />
        <StatsCard title="With Reminders" value={items.filter(i => i.reminder_date).length} icon={Clock} accent="#10B981" />
      </div>

      {/* Core charts — available to all */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Save Activity (12 weeks)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeData}>
              <defs>
                <linearGradient id="colorSaves" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00BFFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="week" tick={{ fill: "#8B8D97", fontSize: 10 }} axisLine={false} interval={2} />
              <YAxis tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="saves" stroke="#00BFFF" fill="url(#colorSaves)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {categoryData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-1 justify-center">
            {categoryData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center gap-1 text-[10px] text-[#8B8D97]">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                {cat.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pro: Advanced charts */}
      <PremiumGate allowed={isPro} plan="pro" label="Advanced trend charts require Pro">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By source */}
          <Card className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">By Source</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                <XAxis dataKey="name" tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {sourceData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
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

          {/* Rating distribution */}
          <Card className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                <XAxis dataKey="rating" tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "#8B8D97", fontSize: 11 }} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#FFB6C1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Tags */}
          <Card className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#00BFFF]" /> Top Tags (NLP)
            </h3>
            <div className="space-y-2">
              {topTags.slice(0, 8).map((t, i) => (
                <div key={t.tag} className="flex items-center gap-2">
                  <span className="text-xs text-[#8B8D97] w-4">{i + 1}</span>
                  <div className="flex-1 bg-[#0F1117] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(t.count / (topTags[0]?.count || 1)) * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#E8E8ED] w-24 truncate">#{t.tag}</span>
                  <span className="text-xs text-[#8B8D97]">{t.count}</span>
                </div>
              ))}
              {topTags.length === 0 && <p className="text-xs text-[#8B8D97]">No tags yet — add tags when saving items.</p>}
            </div>
          </Card>
        </div>
      </PremiumGate>

      {/* AI Insights */}
      <Card className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">AI Personal Trend Insights</h3>
          <PremiumGate allowed={isPro} plan="pro" label="">
            <Button size="sm" onClick={generateInsights} disabled={aiLoading}
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2 h-8">
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Generate Insights
            </Button>
          </PremiumGate>
        </div>
        {aiInsights ? (
          <div className="prose prose-sm prose-invert max-w-none text-[#E8E8ED]">
            <ReactMarkdown>{aiInsights}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-[#8B8D97]">
            {isPro
              ? 'Click "Generate Insights" to get personalized AI analysis of your saving habits and trends.'
              : "Upgrade to Pro to unlock AI-generated personal trend insights."}
          </p>
        )}
      </Card>
    </div>
  );
}