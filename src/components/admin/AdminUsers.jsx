import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCheck, UserX, Loader2, Pencil, Check, X, Trash2, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const planColors = { free: "#8B8D97", pro: "#00BFFF", premium: "#9370DB", family: "#FFB6C1" };

export default function AdminUsers({ allSubs = [] }) {
  const [search, setSearch] = useState("");
  const [editingTierId, setEditingTierId] = useState(null);
  const [editTier, setEditTier] = useState("");
  const [savingTier, setSavingTier] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: specialAccounts = [] } = useQuery({
    queryKey: ["specialAccounts"],
    queryFn: () => base44.entities.SpecialAccount.list(),
  });

  const { data: allTickets = [] } = useQuery({
    queryKey: ["dataRequestTickets"],
    queryFn: () => base44.entities.SupportTicket.filter({ category: "account", status: "open" }),
  });

  // Filter to just deletion/export requests
  const dataRequests = allTickets.filter(t =>
    t.subject?.includes("Deletion Request") || t.subject?.includes("Data Export Request")
  );

  const getSubForUser = (email) => allSubs.find(s => s.user_email === email);
  const getSpecialAccount = (email) => specialAccounts.find(s => s.email === email);

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (user, role) => {
    await base44.entities.User.update(user.id, { role });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleEditTier = (userId, currentTier) => {
    setEditingTierId(userId);
    setEditTier(currentTier);
  };

  const handleSaveTier = async (userEmail) => {
    setSavingTier(true);
    try {
      await base44.functions.invoke("adjustSubscriptionTier", {
        target_email: userEmail,
        new_tier: editTier,
        reason: "Admin manual adjustment via Users panel",
      });
      queryClient.invalidateQueries({ queryKey: ["allSubscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["specialAccounts"] });
      toast.success(`Plan updated to ${editTier} for ${userEmail}`);
      setEditingTierId(null);
    } catch (err) {
      toast.error("Failed to update plan");
    } finally {
      setSavingTier(false);
    }
  };

  const handleResolveDataRequest = async (ticket, action) => {
    const response = action === "approved"
      ? `Request approved by admin. ${ticket.subject.includes("Deletion") ? "Account and data deletion has been initiated." : "Data export has been prepared and sent to the user's email."}`
      : "Request reviewed but could not be processed at this time. Please contact privacy@clipforge.app.";
    await base44.entities.SupportTicket.update(ticket.id, {
      status: "resolved",
      response,
      priority: ticket.priority,
    });
    queryClient.invalidateQueries({ queryKey: ["dataRequestTickets"] });
    toast.success(action === "approved" ? "Request approved & marked resolved" : "Request declined & closed");
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BFFF]" /></div>;

  return (
    <div className="space-y-6">

      {/* Data Deletion/Export Requests */}
      {dataRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            <h3 className="font-semibold text-sm text-[#EF4444]">Pending Data Requests ({dataRequests.length})</h3>
            <Badge className="text-[9px] bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">Action Required</Badge>
          </div>
          <div className="space-y-2">
            {dataRequests.map(ticket => {
              const isDeletion = ticket.subject?.includes("Deletion");
              return (
                <div key={ticket.id} className={`glass-card rounded-xl p-4 border ${isDeletion ? "border-[#EF4444]/30" : "border-[#00BFFF]/30"}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2 min-w-0">
                      {isDeletion
                        ? <Trash2 className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                        : <Download className="w-4 h-4 text-[#00BFFF] mt-0.5 flex-shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{ticket.subject}</p>
                        <p className="text-xs text-[#8B8D97] mt-0.5 line-clamp-2">{ticket.message}</p>
                        <p className="text-[10px] text-[#8B8D97] mt-1">
                          Submitted: {new Date(ticket.created_date).toLocaleDateString()} · by {ticket.created_by}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="text-[10px] h-7 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/25 gap-1"
                        variant="outline"
                        onClick={() => handleResolveDataRequest(ticket, "declined")}
                      >
                        <X className="w-3 h-3" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        className="text-[10px] h-7 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 gap-1"
                        variant="outline"
                        onClick={() => handleResolveDataRequest(ticket, "approved")}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User search & table */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8B8D97]" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
        />
      </div>
      <Card className="glass-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2A2D3A]">
              <TableHead className="text-[#8B8D97]">User</TableHead>
              <TableHead className="text-[#8B8D97]">Plan</TableHead>
              <TableHead className="text-[#8B8D97]">Role</TableHead>
              <TableHead className="text-[#8B8D97]">Joined</TableHead>
              <TableHead className="text-[#8B8D97]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => {
              const sub = getSubForUser(u.email);
              const plan = sub?.plan || "free";
              const isActive = sub?.status === "active" || !sub;
              const special = getSpecialAccount(u.email);
              const isEditing = editingTierId === u.id;
              const hasPendingDataRequest = dataRequests.some(t => t.created_by === u.email);
              return (
                <TableRow key={u.id} className={`border-[#2A2D3A] hover:bg-[#1A1D27] ${hasPendingDataRequest ? "bg-[#EF4444]/5" : ""}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm">{u.full_name || "—"}</p>
                          {special && (
                            <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400 px-1 py-0">
                              {special.account_type === "development" ? "🛠️ Dev" : "🎁 Gift"}
                            </Badge>
                          )}
                          {hasPendingDataRequest && (
                            <Badge variant="outline" className="text-[8px] border-red-500/30 text-red-400 px-1 py-0">
                              ⚠️ Data Request
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#8B8D97]">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Select value={editTier} onValueChange={setEditTier}>
                          <SelectTrigger className="h-6 w-28 text-[10px] bg-[#0F1117] border-[#2A2D3A]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="family">Family</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-5 w-5 text-emerald-400" onClick={() => handleSaveTier(u.email)} disabled={savingTier}>
                          {savingTier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400" onClick={() => setEditingTierId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <Badge variant="outline" className="text-[10px]" style={{ color: planColors[plan] || planColors.free, borderColor: `${planColors[plan] || planColors.free}40` }}>
                          {plan}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-[#8B8D97]" onClick={() => handleEditTier(u.id, plan)}>
                          <Pencil className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={u.role || "user"} onValueChange={(v) => handleRoleChange(u, v)}>
                      <SelectTrigger className="w-24 h-7 text-xs bg-transparent border-[#2A2D3A]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-[#8B8D97]">
                    {new Date(u.created_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {isActive
                      ? <UserCheck className="w-4 h-4 text-emerald-400" />
                      : <UserX className="w-4 h-4 text-red-400" />
                    }
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}