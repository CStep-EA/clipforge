import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from "recharts";
import { TrendingUp, Eye, Heart, Clock } from "lucide-react";
import StatsCard from "@/components/shared/StatsCard";

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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-[#8B8D97] text-sm">Personal trends and insights</p>
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
        <Card className="glass-card p-5 lg:col-span-2">
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
      </div>
    </div>
  );
}