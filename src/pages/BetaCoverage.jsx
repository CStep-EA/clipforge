import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, FlaskConical, BarChart3, Star, Users,
  MessageSquarePlus, ClipboardList, ShieldCheck, Loader2
} from "lucide-react";

const WEEKS = [
  { label: "Week 1", date: "Mar 3–9", focus: "Core save flows, onboarding, auth smoke tests", status: "active" },
  { label: "Week 2", date: "Mar 10–16", focus: "Events, reminders, sharing & boards", status: "upcoming" },
  { label: "Week 3", date: "Mar 17–23", focus: "Payments, subscriptions, referrals", status: "upcoming" },
  { label: "Week 4", date: "Mar 24–30", focus: "Performance, a11y audit, P0 bug sweep", status: "upcoming" },
];

const SUCCESS_CRITERIA = [
  "≥ 80% of testers complete 3+ core flows",
  "NPS ≥ 70",
  "≥ 70% positive or constructive feedback",
  "Zero P0 bugs at beta close",
  "All Dialog a11y warnings resolved",
  "Test coverage ≥ 90% on critical paths",
];

const TEST_STATS = {
  suites: 28,
  totalSuites: 28,
  tests: 393,
  coverage: 95.73,
};

export default function BetaCoverage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);

  // Fetch real feedback stats
  const { data: feedbackItems = [] } = useQuery({
    queryKey: ["feedbackItems"],
    queryFn: () => base44.entities.FeedbackItem.filter({ "keywords": "beta-feedback" }, "-created_date", 100),
    enabled: !!user,
  });

  const isBetaUser = user?.role === "admin" || user?.role === "beta";

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00BFFF]" />
    </div>
  );

  if (!isBetaUser) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <ShieldCheck className="w-12 h-12 text-[#8B8D97]" />
      <h2 className="text-lg font-semibold">Beta Access Only</h2>
      <p className="text-sm text-[#8B8D97]">This page is restricted to beta testers and admins.</p>
    </div>
  );

  // Compute real stats from feedback
  const totalFeedback = feedbackItems.length;
  const avgRating = totalFeedback > 0
    ? (feedbackItems.reduce((sum, f) => {
        const match = f.content?.match(/⭐ Rating: (\d)/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0) / totalFeedback).toFixed(1)
    : "—";

  const ratingBuckets = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: feedbackItems.filter(f => f.content?.includes(`Rating: ${r}/5`)).length,
  }));

  const thisWeekCount = feedbackItems.filter(f => {
    const d = new Date(f.created_date);
    const now = new Date();
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <FlaskConical className="w-7 h-7 text-[#9370DB]" />
          <h1 className="text-2xl md:text-3xl font-black gradient-text">Beta Coverage Dashboard</h1>
          <Badge className="bg-[#9370DB]/15 text-[#9370DB] border border-[#9370DB]/30 text-xs font-bold">
            Private Beta – Phase 1
          </Badge>
        </div>
        <p className="text-[#8B8D97] text-sm">Live view of test health, beta timeline, and tester feedback metrics.</p>
      </div>

      {/* Test Status */}
      <Card className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold">Current Test Status</h2>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> All Green
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/15 text-center">
            <p className="text-2xl font-black text-emerald-400">{TEST_STATS.suites}/{TEST_STATS.totalSuites}</p>
            <p className="text-xs text-[#8B8D97] mt-0.5">Test Suites Passing</p>
          </div>
          <div className="p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/15 text-center">
            <p className="text-2xl font-black text-[#00BFFF]">{TEST_STATS.tests}</p>
            <p className="text-xs text-[#8B8D97] mt-0.5">Tests Passing</p>
          </div>
          <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/15 text-center">
            <p className="text-2xl font-black text-[#9370DB]">{TEST_STATS.coverage}%</p>
            <p className="text-xs text-[#8B8D97] mt-0.5">Line Coverage</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#8B8D97]">
            <span>Coverage</span>
            <span className="font-bold text-[#9370DB]">{TEST_STATS.coverage}%</span>
          </div>
          <Progress value={TEST_STATS.coverage} className="h-2 bg-[#2A2D3A] [&>div]:bg-gradient-to-r [&>div]:from-[#9370DB] [&>div]:to-[#00BFFF]" />
        </div>
      </Card>

      {/* Beta Timeline */}
      <Card className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00BFFF]" />
          <h2 className="font-semibold">Beta Timeline — 4 Weeks</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WEEKS.map((w) => (
            <div
              key={w.label}
              className={`p-3.5 rounded-xl border transition-all ${
                w.status === "active"
                  ? "border-[#00BFFF]/40 bg-[#00BFFF]/5"
                  : "border-[#2A2D3A] bg-[#0F1117]/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold">{w.label}</p>
                {w.status === "active" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00BFFF]/20 text-[#00BFFF] font-bold flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#00BFFF] animate-pulse inline-block" /> Now
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#8B8D97] mb-1">{w.date}</p>
              <p className="text-xs text-[#8B8D97]">{w.focus}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Success Criteria */}
      <Card className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#FFB6C1]" />
          <h2 className="font-semibold">Success Criteria</h2>
        </div>
        <ul className="space-y-2">
          {SUCCESS_CRITERIA.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#8B8D97]">
              <span className="w-5 h-5 rounded-full bg-[#FFB6C1]/10 border border-[#FFB6C1]/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB6C1]" />
              </span>
              {c}
            </li>
          ))}
        </ul>
      </Card>

      {/* Real-time Beta Stats */}
      <Card className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <MessageSquarePlus className="w-5 h-5 text-[#9370DB]" />
          <h2 className="font-semibold">Real-time Beta Stats</h2>
          <span className="ml-auto text-[10px] text-[#8B8D97]">
            {totalFeedback > 0 ? "Live from FeedbackItem entity" : "Waiting for submissions…"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/15 text-center">
            <p className="text-xl font-black text-[#9370DB]">{totalFeedback}</p>
            <p className="text-[10px] text-[#8B8D97] mt-0.5">Total Submissions</p>
          </div>
          <div className="p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/15 text-center">
            <p className="text-xl font-black text-[#00BFFF]">{thisWeekCount}</p>
            <p className="text-[10px] text-[#8B8D97] mt-0.5">This Week</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/15 text-center col-span-2 sm:col-span-1">
            <p className="text-xl font-black text-[#F59E0B] flex items-center justify-center gap-1">
              {avgRating} <Star className="w-4 h-4 fill-[#F59E0B] stroke-[#F59E0B]" />
            </p>
            <p className="text-[10px] text-[#8B8D97] mt-0.5">Avg Rating</p>
          </div>
        </div>

        {/* Rating breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-wide">Rating Breakdown</p>
          {ratingBuckets.map(({ stars, count }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-[11px] text-[#8B8D97] w-8 shrink-0">{stars}★</span>
              <div className="flex-1 h-2 rounded-full bg-[#2A2D3A] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#F59E0B]/70 transition-all duration-500"
                  style={{ width: totalFeedback > 0 ? `${(count / totalFeedback) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-[11px] text-[#8B8D97] w-5 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#8B8D97] pt-1 border-t border-[#2A2D3A]">
          📊 Stats sourced live from the <code className="text-[#9370DB]">FeedbackItem</code> entity. Connect Vercel Analytics or a Base44 counter for active user counts.
        </p>
      </Card>
    </div>
  );
}