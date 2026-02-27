import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Ticket, BarChart3, CreditCard, Sparkles, BookOpen, Loader2, Radio, UserPlus, Bug, TrendingUp, Map } from "lucide-react";
import { toast } from "sonner";
import DebugModeToggle from "@/components/admin/DebugModeToggle";
import StatsCard from "@/components/shared/StatsCard";
import AdminTickets from "@/components/admin/AdminTickets";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminChatbot from "@/components/admin/AdminChatbot";
import AdminDocs from "@/components/admin/AdminDocs";
import FeedbackIntelligence from "@/components/admin/FeedbackIntelligence";
import CreateSpecialAccountDialog from "@/components/admin/CreateSpecialAccountDialog";
import SpecialAccountsList from "@/components/admin/SpecialAccountsList";
import AdminMetrics from "@/components/admin/AdminMetrics";
import DevLogManager from "@/components/admin/DevLogManager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("metrics");

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthLoading(false); }).catch(() => setAuthLoading(false));
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: tickets = [] } = useQuery({
    queryKey: ["allTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    enabled: isAdmin,
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ["allSavedItems"],
    queryFn: () => base44.entities.SavedItem.list(),
    enabled: isAdmin,
  });
  const { data: allSubs = [] } = useQuery({
    queryKey: ["allSubscriptions"],
    queryFn: () => base44.entities.UserSubscription.list("-created_date"),
    enabled: isAdmin,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });
  const { data: referrals = [] } = useQuery({
    queryKey: ["allReferrals"],
    queryFn: () => base44.entities.Referral.list("-created_date"),
    enabled: isAdmin,
  });

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-[#00BFFF]" />
    </div>
  );

  if (!isAdmin) return (
    <div className="p-8 text-center max-w-md mx-auto mt-20 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center mx-auto">
        <Shield className="w-8 h-8 text-[#8B8D97]" />
      </div>
      <h2 className="text-lg font-semibold">Admin Access Required</h2>
      <p className="text-sm text-[#8B8D97]">This area is restricted to ClipForge admins only.</p>
    </div>
  );

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const paidSubs = allSubs.filter(s => s.plan !== "free" && s.status === "active");
  const planColors = { free: "#8B8D97", pro: "#00BFFF", premium: "#9370DB" };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9370DB] to-[#00BFFF] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-[#8B8D97]">ClipForge control center</p>
          </div>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white font-semibold btn-glow gap-2"
        >
          <UserPlus className="w-4 h-4" /> Create Special Account
        </Button>
      </div>

      <CreateSpecialAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Debug mode */}
      <DebugModeToggle />

      {/* Quick stats row — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { title: "Total Users", value: users.length, icon: Users, accent: "#00BFFF", tab: "users" },
          { title: "Open Tickets", value: openTickets.length, icon: Ticket, accent: "#F59E0B", tab: "tickets" },
          { title: "Paid Subs", value: paidSubs.length, icon: CreditCard, accent: "#10B981", tab: "subscriptions" },
          { title: "Total Saves", value: allItems.length, icon: BarChart3, accent: "#9370DB", tab: "metrics" },
          { title: "Active Today", value: users.filter(u => (Date.now() - new Date(u.updated_date || u.created_date).getTime()) < 86400000).length, icon: Users, accent: "#FFB6C1", tab: "users" },
        ].map(({ title, value, icon: Icon, accent, tab }) => (
          <button key={title} onClick={() => setActiveTab(tab)}
            className="glass-card rounded-xl p-4 text-left hover:border-[#00BFFF]/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#8B8D97] uppercase tracking-wide">{title}</span>
              <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
            <div className="text-2xl font-black" style={{ color: accent }}>{value}</div>
          </button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1A1D27] border border-[#2A2D3A] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="metrics" className="data-[state=active]:bg-[#10B981]/10 data-[state=active]:text-[#10B981] gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Metrics
          </TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5">
            <Ticket className="w-3.5 h-3.5" /> Support Tickets
            {openTickets.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] font-bold">{openTickets.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5">
            <Users className="w-3.5 h-3.5" /> Users
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Subscriptions
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Docs Generator
          </TabsTrigger>
          <TabsTrigger value="feedback" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Feedback Intel
          </TabsTrigger>
          <TabsTrigger value="special" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Special Accounts
          </TabsTrigger>
          <TabsTrigger value="devlog" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5">
            <Map className="w-3.5 h-3.5" /> Dev Log
          </TabsTrigger>
          <TabsTrigger value="debug" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 gap-1.5">
            <Bug className="w-3.5 h-3.5" /> Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="mt-4">
          <AdminMetrics tickets={tickets} users={users} subs={allSubs} referrals={referrals} onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <AdminTickets />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <AdminUsers allSubs={allSubs} />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2D3A]">
                  <TableHead className="text-[#8B8D97]">Email</TableHead>
                  <TableHead className="text-[#8B8D97]">Plan</TableHead>
                  <TableHead className="text-[#8B8D97]">Status</TableHead>
                  <TableHead className="text-[#8B8D97]">Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSubs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-[#8B8D97] text-sm py-8">No subscriptions yet</TableCell></TableRow>
                ) : allSubs.map(sub => (
                  <TableRow key={sub.id} className="border-[#2A2D3A] hover:bg-[#1A1D27]">
                    <TableCell className="text-xs text-[#8B8D97]">{sub.user_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]" style={{ color: planColors[sub.plan], borderColor: `${planColors[sub.plan]}40` }}>
                        {sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sub.status === "active" ? "text-[10px] text-emerald-400 border-emerald-400/30" : "text-[10px] text-red-400 border-red-400/30"}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#8B8D97]">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="chatbot" className="mt-4">
          <AdminChatbot />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <AdminDocs />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <FeedbackIntelligence />
        </TabsContent>

        <TabsContent value="devlog" className="mt-4">
          <Card className="glass-card p-5">
            <DevLogManager />
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="mt-4">
          <DebugModeToggle />
          <div className="mt-4 p-4 rounded-xl glass-card space-y-2">
            <p className="text-sm font-semibold text-amber-300 flex items-center gap-2"><Bug className="w-4 h-4" /> Test Features Guide</p>
            <ul className="text-xs text-[#8B8D97] space-y-1.5 list-none">
              <li>• <strong className="text-[#E8E8ED]">Tier Preview</strong> — Toggle Debug Mode ON, then pick a tier to see how upgrade prompts and locks appear for that plan</li>
              <li>• <strong className="text-[#E8E8ED]">Trial test</strong> — "Create Trial" inserts a test PremiumTrial record you can verify in dashboard banners</li>
              <li>• <strong className="text-[#E8E8ED]">Referral test</strong> — "Create Referral" creates a test referral flow entry visible in Settings → Referrals</li>
              <li>• <strong className="text-[#E8E8ED]">Family test</strong> — "Create Family" inserts a test family member to preview parental controls</li>
              <li>• <strong className="text-[#E8E8ED]">Special Accounts</strong> — Use the Special Accounts tab to grant real premium tiers to test emails</li>
              <li>• <strong className="text-[#E8E8ED]">OAuth Flows</strong> — Go to Integrations page and click Connect on any platform to preview the consent dialog</li>
              <li>• <strong className="text-[#E8E8ED]">Onboarding</strong> — Navigate to /Onboarding to preview the full signup flow including trial/referral/family steps</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="special" className="mt-4">
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">For internal development or gift use only — not for resale or public distribution. These accounts bypass Stripe billing and are tracked here.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white gap-2 text-sm">
                <UserPlus className="w-4 h-4" /> New Special Account
              </Button>
            </div>
            <SpecialAccountsList />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}