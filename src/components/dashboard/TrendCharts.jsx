import React, { useMemo } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO, isAfter } from "date-fns";

const CATEGORY_COLORS = {
  deal: "#00BFFF",
  recipe: "#FFB6C1",
  event: "#9370DB",
  product: "#F59E0B",
  article: "#10B981",
  travel: "#3B82F6",
  gift_idea: "#EC4899",
  other: "#6B7280",
};

export default function TrendCharts({ items }) {
  const savesOverTime = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, "MMM d"), count: 0, day: d };
    });
    items.forEach(item => {
      const created = parseISO(item.created_date);
      const slot = days.find(d =>
        format(d.day, "yyyy-MM-dd") === format(created, "yyyy-MM-dd")
      );
      if (slot) slot.count += 1;
    });
    return days.map(({ date, count }) => ({ date, saves: count }));
  }, [items]);

  const categoryBreakdown = useMemo(() => {
    const counts = {};
    items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-lg px-3 py-2 text-xs">
        <p className="text-[#8B8D97] mb-0.5">{label}</p>
        <p className="text-[#00BFFF] font-bold">{payload[0].value} saves</p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Saves over time */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-[#E8E8ED]">Saves (Last 14 Days)</h3>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={savesOverTime} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="savesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00BFFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#8B8D97", fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
            <YAxis tick={{ fill: "#8B8D97", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="saves" stroke="#00BFFF" strokeWidth={2} fill="url(#savesGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-[#E8E8ED]">Category Breakdown</h3>
        {categoryBreakdown.length === 0 ? (
          <div className="h-[120px] flex items-center justify-center text-xs text-[#8B8D97]">No data yet</div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                  {categoryBreakdown.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#6B7280"} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {categoryBreakdown.slice(0, 5).map(({ name, value }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[name] || "#6B7280" }} />
                  <span className="text-[10px] text-[#8B8D97] flex-1 capitalize">{name.replace("_", " ")}</span>
                  <span className="text-[10px] text-[#E8E8ED] font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}