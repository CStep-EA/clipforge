import React from "react";
import { Card } from "@/components/ui/card";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const COLORS = ["#00BFFF", "#9370DB", "#FFB6C1", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#6B7280"];
const categoryLabels = {
  deal: "Deals", recipe: "Recipes", event: "Events", product: "Products",
  article: "Articles", travel: "Travel", gift_idea: "Gifts", other: "Other"
};

export default function MiniTrendCharts({ items }) {
  const now = new Date();
  const timeData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      saves: items.filter(item => item.created_date?.startsWith(dateStr)).length,
      deals: items.filter(item => item.created_date?.startsWith(dateStr) && item.category === "deal").length,
    };
  });

  const categoryData = Object.entries(
    items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: categoryLabels[name] || name, value }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="glass-card p-4">
        <p className="text-xs font-semibold text-[#8B8D97] mb-3">Saves This Week</p>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={timeData}>
            <defs>
              <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00BFFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9370DB" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9370DB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis dataKey="day" tick={{ fill: "#8B8D97", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8B8D97", fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
            <Tooltip contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 10, color: "#E8E8ED", fontSize: 11 }} />
            <Area type="monotone" dataKey="saves" stroke="#00BFFF" fill="url(#dGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="deals" stroke="#9370DB" fill="url(#dealGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="glass-card p-4">
        <p className="text-xs font-semibold text-[#8B8D97] mb-3">Category Breakdown</p>
        {categoryData.length === 0 ? (
          <div className="h-[120px] flex items-center justify-center text-xs text-[#8B8D97]">No data yet</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={90}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 10, color: "#E8E8ED", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
              {categoryData.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-1 text-[10px] text-[#8B8D97]">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                  {cat.name} ({cat.value})
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}