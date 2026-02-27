import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  Shield, Users, TrendingUp, Gift, Zap, Crown, Copy, Download,
  BarChart3, ArrowRight, RefreshCw, Loader2
} from "lucide-react";

function StatTile({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8B8D97] uppercase tracking-wider">{label}</p>
        <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] text-[#8B8D97]">{sub}</p>}
    </div>
  );
}

export default function MarketingLaunch() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === "admin");
    }).catch(() => {}).finally(() => setCheckingAuth(false));
  }, []);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ["allReferrals"],
    queryFn: () => base44.entities.Referral.list("-created_date", 100),
    enabled: isAdmin,
  });

  const { data: trials = [], isLoading: loadingTrials } = useQuery({
    queryKey: ["allTrials"],
    queryFn: () => base44.entities.PremiumTrial.list("-created_date", 100),
    enabled: isAdmin,
  });

  const { data: subs = [] } = useQuery({
    queryKey: ["allSubs"],
    queryFn: () => base44.entities.UserSubscription.list("-created_date", 200),
    enabled: isAdmin,
  });

  if (checkingAuth) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-[#00BFFF]" />
    </div>
  );

  if (!isAdmin) return (
    <div className="p-8 text-center max-w-md mx-auto mt-20 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center mx-auto">
        <Shield className="w-8 h-8 text-[#8B8D97]" />
      </div>
      <h2 className="text-lg font-semibold">Admin Access Required</h2>
      <p className="text-sm text-[#8B8D97]">Marketing & Growth is restricted to ClipForge admins.</p>
    </div>
  );

  const isLoading = loadingUsers || loadingReferrals || loadingTrials;

  // Compute stats
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const signupsThisWeek = allUsers.filter(u => u.created_date && new Date(u.created_date) >= oneWeekAgo).length;

  const activeTrials = trials.filter(t => t.is_active && !t.converted && new Date(t.trial_end) > now);
  const convertedTrials = trials.filter(t => t.converted);
  const conversionRate = trials.length > 0 ? Math.round((convertedTrials.length / trials.length) * 100) : 0;

  const activePaidSubs = subs.filter(s => s.status === "active" && s.plan !== "free");
  const referralsSubscribed = referrals.filter(r => r.status === "subscribed" || r.status === "rewarded");

  const exportCSV = (data, filename) => {
    if (!data.length) return toast.error("No data to export");
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} rows`);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#00BFFF]" /> Marketing & Growth
            </h1>
            <p className="text-xs text-[#8B8D97] mt-0.5">User acquisition, referrals, and trial performance</p>
          </div>
          <Link to={createPageUrl("Admin")}>
            <Button variant="outline" size="sm" className="border-[#2A2D3A] text-[#8B8D97] text-xs gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Admin
            </Button>
          </Link>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#00BFFF]" />
        </div>
      ) : (
        <>
          {/* Growth Stats */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#8B8D97] uppercase tracking-wider">Growth Stats</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile label="Total Users" value={allUsers.length} icon={Users} color="#00BFFF" sub="All registered accounts" />
              <StatTile label="Signups this week" value={signupsThisWeek} icon={TrendingUp} color="#9370DB" sub="New in last 7 days" />
              <StatTile label="Paid Subscribers" value={activePaidSubs.length} icon={Crown} color="#FFB6C1" sub="Active paid plans" />
              <StatTile label="Total Referrals" value={referrals.length} icon={Gift} color="#10B981" sub={`${referralsSubscribed.length} converted`} />
            </div>
          </section>

          {/* Trial Overview */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#8B8D97] uppercase tracking-wider">Trials & Conversion</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatTile label="Active Trials" value={activeTrials.length} icon={Zap} color="#00BFFF" sub="Currently in trial" />
              <StatTile label="Converted" value={convertedTrials.length} icon={Crown} color="#9370DB" sub="Trial → paid" />
              <StatTile label="Conv. Rate" value={`${conversionRate}%`} icon={BarChart3} color="#10B981" sub="Trial to paid %" />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="border-[#2A2D3A] text-[#8B8D97] text-xs gap-1.5"
                onClick={() => exportCSV(trials, "trials.csv")}
              >
                <Download className="w-3.5 h-3.5" /> Export Trials CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#2A2D3A] text-[#8B8D97] text-xs gap-1.5"
                onClick={() => exportCSV(referrals, "referrals.csv")}
              >
                <Download className="w-3.5 h-3.5" /> Export Referrals CSV
              </Button>
            </div>
          </section>

          {/* Referral Link Generator */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#8B8D97] uppercase tracking-wider">Admin Referral Link</h2>
            <div className="glass-card rounded-2xl p-5 border border-[#FFB6C1]/20 space-y-3">
              <p className="text-xs text-[#8B8D97]">Share this link to track admin-sourced signups:</p>
              {(() => {
                const adminCode = `CF-ADMIN-${(user?.email || "").split("@")[0].toUpperCase()}`;
                const link = `${window.location.origin}?ref=${adminCode}`;
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl bg-[#0F1117] border border-[#2A2D3A] text-xs text-[#8B8D97] font-mono truncate">
                      {link}
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#FFB6C1]/15 border border-[#FFB6C1]/30 text-[#FFB6C1] hover:bg-[#FFB6C1]/25 gap-1.5 text-xs shrink-0"
                      onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied!"); }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Recent Referrals table */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#8B8D97] uppercase tracking-wider">Recent Referrals</h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              {referrals.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#8B8D97]">No referrals yet. Share your referral link to get started.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#2A2D3A]">
                        {["Referrer", "Referred", "Status", "Bonus", "Date"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[#8B8D97] font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.slice(0, 15).map((r) => (
                        <tr key={r.id} className="border-b border-[#1A1D27] hover:bg-[#1A1D27]/50">
                          <td className="px-4 py-3 text-[#E8E8ED]">{r.referrer_email}</td>
                          <td className="px-4 py-3 text-[#8B8D97]">{r.referred_email || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[9px] ${
                              r.status === "rewarded" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              r.status === "subscribed" ? "bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/20" :
                              "bg-[#2A2D3A] text-[#8B8D97] border-[#2A2D3A]"
                            }`}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-[#8B8D97]">{r.bonus_type !== "none" ? r.bonus_type : "—"}</td>
                          <td className="px-4 py-3 text-[#8B8D97]">{r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Quick links */}
          <section>
            <h2 className="text-sm font-semibold text-[#8B8D97] uppercase tracking-wider mb-3">Quick Links</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "About Page", page: "About", color: "#00BFFF" },
                { label: "Vision & Mission", page: "VisionMission", color: "#9370DB" },
                { label: "Launch Roadmap", page: "LaunchRoadmap", color: "#FFB6C1" },
                { label: "Pricing", page: "Pricing", color: "#10B981" },
              ].map(item => (
                <Link key={item.page} to={createPageUrl(item.page)}>
                  <div className="glass-card rounded-xl p-3 flex items-center justify-between hover:border-opacity-50 transition-all"
                    style={{ borderColor: `${item.color}20` }}>
                    <span className="text-xs font-medium" style={{ color: item.color }}>{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-50" style={{ color: item.color }} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}