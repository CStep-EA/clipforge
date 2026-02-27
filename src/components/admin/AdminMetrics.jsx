import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import {
  TrendingUp, Users, Ticket, CreditCard, Star, Activity,
  Clock, Gift, UserCheck, Zap, ChevronRight, ExternalLink
} from "lucide-react";

const PLAN_PRICES = { pro: 7.99, premium: 14.99, family: 19.99 };

// Clickable metric card — onNavigate navigates to a tab
function MetricCard({ label, value, sub, icon: Icon, color, badge, onNavigate }) {
  return (
    <Card
      onClick={onNavigate}
      className={`glass-card p-4 flex flex-col gap-1.5 transition-all ${onNavigate ? "cursor-pointer hover:border-[#00BFFF]/30 group" : ""}`}
      style={{ borderColor: onNavigate ? undefined : "transparent" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8B8D97] uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          {onNavigate && <ChevronRight className="w-3 h-3 text-[#8B8D97] opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sub && <p className="text-[10px] text-[#8B8D97]">{sub}</p>}
      {badge && (
        <Badge variant="outline" className="text-[9px] w-fit mt-0.5" style={{ color: badge.color, borderColor: `${badge.color}30` }}>
          {badge.label}
        </Badge>
      )}
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, color = "#8B8D97" }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color }}>
      <Icon className="w-3.5 h-3.5" /> {title}
    </h3>
  );
}

export default function AdminMetrics({ tickets = [], users = [], subs = [], referrals = [], onNavigate }) {
  const now = Date.now();
  const DAY = 86400000;
  const WEEK = 7 * DAY;
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now - WEEK);
  const startOf30d = new Date(now - 30 * DAY);

  // ── Support KPIs ──────────────────────────────────────────────────
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed");
  const resolvedToday = resolvedTickets.filter(t => new Date(t.updated_date) >= startOfDay).length;
  const createdThisWeek = tickets.filter(t => new Date(t.created_date) >= startOfWeek).length;

  // Avg resolution time (hours) for resolved tickets that have both dates
  const resolutionTimes = resolvedTickets
    .filter(t => t.created_date && t.updated_date)
    .map(t => (new Date(t.updated_date) - new Date(t.created_date)) / 3600000);
  const avgResolutionHrs = resolutionTimes.length
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : null;

  // ── Financial KPIs ────────────────────────────────────────────────
  const activeSubs = subs.filter(s => s.status === "active");
  const paidSubs = activeSubs.filter(s => s.plan !== "free");
  const mrrEst = activeSubs.reduce((acc, s) => acc + (PLAN_PRICES[s.plan] || 0), 0);
  const arrEst = mrrEst * 12;

  // Churn: subs canceled in last 30 days
  const churned30d = subs.filter(s =>
    (s.status === "canceled" || s.cancel_at_period_end) &&
    new Date(s.updated_date || s.created_date) >= startOf30d
  ).length;

  const familySubs = activeSubs.filter(s => s.plan === "family").length;
  const newSubsWeek = subs.filter(s => new Date(s.created_date) >= startOfWeek && s.plan !== "free").length;

  // Referral redemptions
  const referralRedeemed = referrals.filter(r => r.status === "rewarded" || r.bonus_applied).length;
  const referralPending = referrals.filter(r => r.status === "signed_up" || r.status === "subscribed").length;

  // ── Growth KPIs ───────────────────────────────────────────────────
  const activeToday = users.filter(u => (now - new Date(u.updated_date || u.created_date).getTime()) < DAY).length;
  const activeWeek = users.filter(u => (now - new Date(u.updated_date || u.created_date).getTime()) < WEEK).length;
  const newUsersWeek = users.filter(u => new Date(u.created_date) >= startOfWeek).length;

  // Feature adoption: users with at least one integration
  // (we approximate by counting StreamingConnections)
  const { data: connections = [] } = useQuery({
    queryKey: ["allStreamingConns"],
    queryFn: () => base44.entities.StreamingConnection.filter({ connected: true }),
  });
  const integrationAdopters = new Set(connections.map(c => c.user_email)).size;
  const adoptionPct = users.length ? Math.round((integrationAdopters / users.length) * 100) : 0;

  // ── Chart data ────────────────────────────────────────────────────
  const ticketChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY);
    const label = d.toLocaleDateString("en", { weekday: "short" });
    return {
      day: label,
      created: tickets.filter(t => new Date(t.created_date).toDateString() === d.toDateString()).length,
      resolved: resolvedTickets.filter(t => new Date(t.updated_date).toDateString() === d.toDateString()).length,
    };
  });

  const revenueChartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * DAY);
    const label = i % 7 === 0 ? d.toLocaleDateString("en", { month: "short", day: "numeric" }) : "";
    const subsOnDay = subs.filter(s =>
      s.status === "active" && new Date(s.created_date) <= d
    );
    const mrr = subsOnDay.reduce((acc, s) => acc + (PLAN_PRICES[s.plan] || 0), 0);
    return { day: label, mrr: parseFloat(mrr.toFixed(2)), subs: subsOnDay.filter(s => s.plan !== "free").length };
  });

  const growthChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY);
    const label = d.toLocaleDateString("en", { weekday: "short" });
    return {
      day: label,
      users: users.filter(u => new Date(u.created_date) <= d).length,
      dau: users.filter(u => {
        const diff = d.getTime() - new Date(u.updated_date || u.created_date).getTime();
        return diff >= 0 && diff < DAY;
      }).length,
    };
  });

  const planBreakdown = [
    { name: "Pro", count: activeSubs.filter(s => s.plan === "pro").length, color: "#00BFFF" },
    { name: "Premium", count: activeSubs.filter(s => s.plan === "premium").length, color: "#9370DB" },
    { name: "Family", count: activeSubs.filter(s => s.plan === "family").length, color: "#FFB6C1" },
  ];

  const tooltipStyle = { background: "#1A1D27", border: "1px solid #2A2D3A", fontSize: 11, borderRadius: 8 };

  return (
    <div className="space-y-8">

      {/* ── SUPPORT KPIs ── */}
      <div>
        <SectionHeader icon={Ticket} title="Support KPIs" color="#F59E0B" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Open Tickets" value={openTickets.length} icon={Ticket} color="#F59E0B"
            sub="Needs attention" onNavigate={() => onNavigate("tickets")} />
          <MetricCard label="Resolved Today" value={resolvedToday} icon={Star} color="#10B981"
            onNavigate={() => onNavigate("tickets")} />
          <MetricCard label="Created (7d)" value={createdThisWeek} icon={Activity} color="#00BFFF"
            onNavigate={() => onNavigate("tickets")} />
          <MetricCard label="Avg Resolution" value={avgResolutionHrs != null ? `${avgResolutionHrs}h` : "—"} icon={Clock}
            color="#9370DB" sub={`from ${resolvedTickets.length} resolved`} />
        </div>

        {/* Ticket chart */}
        <Card className="glass-card p-4 mt-3 cursor-pointer hover:border-[#F59E0B]/20 transition-all"
          onClick={() => onNavigate("tickets")}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#8B8D97]">Ticket Volume – Created vs Resolved (7d)</p>
            <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97]" />
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={ticketChartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "#8B8D97" }} />
              <Bar dataKey="created" name="Created" fill="#00BFFF" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── FINANCIAL KPIs ── */}
      <div>
        <SectionHeader icon={CreditCard} title="Revenue & Financial" color="#10B981" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Est. MRR" value={`$${mrrEst.toFixed(0)}`} icon={TrendingUp} color="#10B981"
            sub={`${paidSubs.length} paid subs`} onNavigate={() => onNavigate("subscriptions")} />
          <MetricCard label="Est. ARR" value={`$${arrEst.toFixed(0)}`} icon={TrendingUp} color="#00BFFF"
            onNavigate={() => onNavigate("subscriptions")} />
          <MetricCard label="New Paid (7d)" value={newSubsWeek} icon={Zap} color="#9370DB"
            onNavigate={() => onNavigate("subscriptions")} />
          <MetricCard label="Churn (30d)" value={churned30d} icon={Activity} color={churned30d > 0 ? "#F87171" : "#10B981"}
            badge={churned30d > 0 ? { label: "⚠ Monitor", color: "#F87171" } : { label: "✓ Clean", color: "#10B981" }}
            onNavigate={() => onNavigate("subscriptions")} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <MetricCard label="Referrals Redeemed" value={referralRedeemed} icon={Gift} color="#FFB6C1"
            sub={`${referralPending} pending`} />
          <MetricCard label="Family Plans" value={familySubs} icon={Users} color="#EC4899"
            onNavigate={() => onNavigate("subscriptions")} />
          <MetricCard label="Stripe" value="View Live →" icon={ExternalLink} color="#635BFF"
            onNavigate={() => window.open("https://dashboard.stripe.com/", "_blank")} />
          <MetricCard label="Total Paid Users" value={paidSubs.length} icon={UserCheck} color="#10B981"
            onNavigate={() => onNavigate("users")} />
        </div>

        {/* Revenue trend */}
        <Card className="glass-card p-4 mt-3 cursor-pointer hover:border-[#10B981]/20 transition-all"
          onClick={() => onNavigate("subscriptions")}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#8B8D97]">Est. MRR Trend (30d)</p>
            <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97]" />
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v}`, "MRR"]} />
              <Area type="monotone" dataKey="mrr" stroke="#10B981" fill="url(#mrrGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── GROWTH KPIs ── */}
      <div>
        <SectionHeader icon={Users} title="Growth & Adoption" color="#9370DB" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Users" value={users.length} icon={Users} color="#00BFFF"
            onNavigate={() => onNavigate("users")} />
          <MetricCard label="DAU (today)" value={activeToday} icon={Zap} color="#9370DB"
            onNavigate={() => onNavigate("users")} />
          <MetricCard label="WAU (7d)" value={activeWeek} icon={Activity} color="#FFB6C1" />
          <MetricCard label="New Users (7d)" value={newUsersWeek} icon={UserCheck} color="#10B981"
            onNavigate={() => onNavigate("users")} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mt-3">
          <MetricCard label="Integration Adoption" value={`${adoptionPct}%`} icon={Zap} color="#9370DB"
            sub={`${integrationAdopters} users connected a platform`} />
          <MetricCard label="Family Signups" value={familySubs} icon={Users} color="#EC4899"
            sub="Active family plans" onNavigate={() => onNavigate("subscriptions")} />
        </div>

        {/* Growth charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <Card className="glass-card p-4 cursor-pointer hover:border-[#9370DB]/20 transition-all"
            onClick={() => onNavigate("users")}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#8B8D97]">User Growth & DAU (7d)</p>
              <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97]" />
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={growthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "#8B8D97" }} />
                <Line type="monotone" dataKey="users" name="Total Users" stroke="#00BFFF" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="dau" name="DAU" stroke="#9370DB" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="glass-card p-4 cursor-pointer hover:border-[#9370DB]/20 transition-all"
            onClick={() => onNavigate("subscriptions")}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#8B8D97]">Plan Distribution</p>
              <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97]" />
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={planBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} width={55} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {planBreakdown.map((entry, i) => (
                    <rect key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}