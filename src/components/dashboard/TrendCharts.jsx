import React, { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";

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

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-lg px-3 py-2 text-xs space-y-1">
      <p className="text-[#8B8D97] mb-0.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-bold capitalize">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function TrendCharts({ items }) {
  const [range, setRange] = useState(14);
  const [view, setView] = useState("area"); // "area" | "bar" | "pie"

  const topCategories = useMemo(() => {
    const counts = {};
    items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);
  }, [items]);

  const timeData = useMemo(() => {
    const days = Array.from({ length: range }, (_, i) => {
      const d = subDays(new Date(), range - 1 - i);
      const entry = { date: format(d, range <= 7 ? "EEE" : "MMM d"), total: 0, _day: format(d, "yyyy-MM-dd") };
      topCategories.forEach(c => { entry[c] = 0; });
      return entry;
    });
    items.forEach(item => {
      if (!item.created_date) return;
      const key = format(parseISO(item.created_date), "yyyy-MM-dd");
      const slot = days.find(d => d._day === key);
      if (slot) {
        slot.total += 1;
        if (item.category in slot) slot[item.category] += 1;
      }
    });
    return days;
  }, [items, range, topCategories]);

  const categoryBreakdown = useMemo(() => {
    const counts = {};
    items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items]);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#E8E8ED]">Saves Over Time</h3>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-[#2A2D3A] rounded-lg overflow-hidden text-[10px]">
            {[["area","Area"], ["bar","Stacked"], ["pie","Pie"]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 py-1 transition-colors ${view === v ? "bg-[#00BFFF]/10 text-[#00BFFF]" : "text-[#8B8D97] hover:text-[#E8E8ED]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Range toggle */}
          <div className="flex border border-[#2A2D3A] rounded-lg overflow-hidden text-[10px]">
            {RANGE_OPTIONS.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setRange(days)}
                className={`px-2.5 py-1 transition-colors ${range === days ? "bg-[#9370DB]/10 text-[#9370DB]" : "text-[#8B8D97] hover:text-[#E8E8ED]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {view === "area" && (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={timeData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="savesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00BFFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#8B8D97", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#8B8D97", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" name="saves" stroke="#00BFFF" strokeWidth={2} fill="url(#savesGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {view === "bar" && (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={timeData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: "#8B8D97", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#8B8D97", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {topCategories.map(cat => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || "#6B7280"} radius={cat === topCategories[topCategories.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {view === "pie" && (
        <div className="flex items-center gap-4 h-[140px]">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={32} outerRadius={55} dataKey="value" strokeWidth={0}>
                {categoryBreakdown.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#6B7280"} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[130px]">
            {categoryBreakdown.map(({ name, value }) => (
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
  );
}