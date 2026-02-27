import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Ticket, BarChart3, CreditCard, Sparkles, BookOpen, Loader2, Radio, UserPlus } from "lucide-react";
import StatsCard from "@/components/shared/StatsCard";
import AdminTickets from "@/components/admin/AdminTickets";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminChatbot from "@/components/admin/AdminChatbot";
import AdminDocs from "@/components/admin/AdminDocs";
import FeedbackIntelligence from "@/components/admin/FeedbackIntelligence";
import CreateSpecialAccountDialog from "@/components/admin/CreateSpecialAccountDialog";
import SpecialAccountsList from "@/components/admin/SpecialAccountsList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-[#00BFFF]" />
    </div>
  );

  if (!isAdmin) return (
    <div className="p-8 text-center max-w-md mx-auto mt-20">
      <div className="w-16 h-16 rounded-2xl bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-[#8B8D97]" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
      <p className="text-sm text-[#8B8D97]">This area is restricted to ClipForge admins only.</p>
    </div>
  );

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const paidSubs = allSubs.filter(s => s.plan !== "free" && s.status === "active");
  const planColors = { free: "#8B8D97", pro: "#00BFFF", premium: "#9370DB" };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9370DB] to-[#00BFFF] flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-xs text-[#8B8D97]">ClipForge control center</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Users" value={users.length} icon={Users} accent="#00BFFF" />
        <StatsCard title="Open Tickets" value={openTickets.length} icon={Ticket} accent="#F59E0B" />
        <StatsCard title="Paid Subs" value={paidSubs.length} icon={CreditCard} accent="#10B981" />
        <StatsCard title="Total Saves" value={allItems.length} icon={BarChart3} accent="#9370DB" />
        <StatsCard title="Active Today" value={users.filter(u => {
          const d = new Date(u.updated_date || u.created_date);
          return (Date.now() - d.getTime()) < 86400000;
        }).length} icon={Users} accent="#FFB6C1" />
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="bg-[#1A1D27] border border-[#2A2D3A] flex-wrap h-auto gap-1 p-1">
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
        </TabsList>

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
      </Tabs>
    </div>
  );
}