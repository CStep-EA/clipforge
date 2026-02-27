import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Users, Ticket, CreditCard, Star, ArrowRight, Activity } from "lucide-react";

function MetricCard({ label, value, sub, icon: Icon, color, href }) {
  const content = (
    <Card className={`glass-card p-4 flex flex-col gap-2 hover:border-[${color}]/30 transition-all cursor-pointer`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8B8D97]">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sub && <p className="text-[10px] text-[#8B8D97]">{sub}</p>}
    </Card>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}

export default function AdminMetrics({ tickets = [], users = [], subs = [] }) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0,0,0,0));
  const startOfWeek = new Date(Date.now() - 7 * 86400000);

  // KPIs
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  const resolvedToday = tickets.filter(t =>
    (t.status === "resolved" || t.status === "closed") && new Date(t.updated_date) >= startOfDay
  ).length;
  const createdThisWeek = tickets.filter(t => new Date(t.created_date) >= startOfWeek).length;

  const paidSubs = subs.filter(s => s.plan !== "free" && s.status === "active");
  const familySubs = subs.filter(s => s.plan === "family" && s.status === "active").length;
  const newSubsThisWeek = subs.filter(s => new Date(s.created_date) >= startOfWeek).length;

  const activeToday = users.filter(u => {
    const d = new Date(u.updated_date || u.created_date);
    return d >= new Date(Date.now() - 86400000);
  }).length;

  // Revenue estimate (from plan counts)
  const planPrices = { pro: 7.99, premium: 14.99, family: 19.99 };
  const mrrEst = subs.filter(s => s.status === "active").reduce((acc, s) => acc + (planPrices[s.plan] || 0), 0);

  // Chart data: tickets per day last 7 days
  const ticketChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const label = d.toLocaleDateString("en", { weekday: "short" });
    const count = tickets.filter(t => {
      const td = new Date(t.created_date);
      return td.toDateString() === d.toDateString();
    }).length;
    return { day: label, tickets: count };
  });

  // Sub plan breakdown
  const planBreakdown = [
    { name: "Pro", count: subs.filter(s => s.plan === "pro" && s.status === "active").length },
    { name: "Premium", count: subs.filter(s => s.plan === "premium" && s.status === "active").length },
    { name: "Family", count: subs.filter(s => s.plan === "family" && s.status === "active").length },
  ];

  return (
    <div className="space-y-6">
      {/* Support KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-[#8B8D97] mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4" /> Support KPIs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Open Tickets" value={openTickets} icon={Ticket} color="#F59E0B"
            href={createPageUrl("Admin")} sub="Needs attention" />
          <MetricCard label="Resolved Today" value={resolvedToday} icon={Star} color="#10B981" />
          <MetricCard label="Created This Week" value={createdThisWeek} icon={Activity} color="#00BFFF" />
          <MetricCard label="Active Users Today" value={activeToday} icon={Users} color="#9370DB"
            href={createPageUrl("Admin")} />
        </div>
      </div>

      {/* Revenue */}
      <div>
        <h3 className="text-sm font-semibold text-[#8B8D97] mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Revenue & Growth
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Est. MRR" value={`$${mrrEst.toFixed(0)}`} icon={TrendingUp} color="#10B981"
            sub={`${paidSubs.length} paid subs`} />
          <MetricCard label="Family Plans" value={familySubs} icon={Users} color="#EC4899" />
          <MetricCard label="New Subs (7d)" value={newSubsThisWeek} icon={Activity} color="#00BFFF" />
          <MetricCard label="Total Users" value={users.length} icon={Users} color="#9370DB"
            href={createPageUrl("Admin")} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[#8B8D97] mb-3">Ticket Volume (7d)</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={ticketChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", fontSize: 11 }} />
              <Bar dataKey="tickets" fill="#00BFFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[#8B8D97] mb-3">Plan Distribution</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={planBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#8B8D97" }} axisLine={false} tickLine={false} width={55} />
              <Tooltip contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", fontSize: 11 }} />
              <Bar dataKey="count" fill="#9370DB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}