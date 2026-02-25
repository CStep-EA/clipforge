import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Ticket, BarChart3, Shield, Loader2 } from "lucide-react";
import StatsCard from "@/components/shared/StatsCard";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [responding, setResponding] = useState(null);
  const [responseText, setResponseText] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === "admin",
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["allTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    enabled: user?.role === "admin",
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["allSavedItems"],
    queryFn: () => base44.entities.SavedItem.list(),
    enabled: user?.role === "admin",
  });

  if (user && user.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-[#8B8D97] mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-sm text-[#8B8D97]">Admin access required.</p>
      </div>
    );
  }

  const handleRespond = async (ticket) => {
    await base44.entities.SupportTicket.update(ticket.id, {
      response: responseText,
      status: "resolved",
    });
    setResponding(null);
    setResponseText("");
    queryClient.invalidateQueries({ queryKey: ["allTickets"] });
  };

  const updateTicketStatus = async (ticket, status) => {
    await base44.entities.SupportTicket.update(ticket.id, { status });
    queryClient.invalidateQueries({ queryKey: ["allTickets"] });
  };

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={users.length} icon={Users} accent="#00BFFF" />
        <StatsCard title="Open Tickets" value={openTickets.length} icon={Ticket} accent="#F59E0B" />
        <StatsCard title="Total Saves" value={allItems.length} icon={BarChart3} accent="#9370DB" />
        <StatsCard title="Active Today" value={users.filter(u => {
          const d = new Date(u.updated_date || u.created_date);
          return (Date.now() - d.getTime()) < 86400000;
        }).length} icon={Users} accent="#10B981" />
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="bg-[#1A1D27] border border-[#2A2D3A]">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF]">
            Support Tickets
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF]">
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4">
          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2D3A]">
                  <TableHead className="text-[#8B8D97]">Subject</TableHead>
                  <TableHead className="text-[#8B8D97]">Status</TableHead>
                  <TableHead className="text-[#8B8D97]">Priority</TableHead>
                  <TableHead className="text-[#8B8D97]">Date</TableHead>
                  <TableHead className="text-[#8B8D97]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map(ticket => (
                  <React.Fragment key={ticket.id}>
                    <TableRow className="border-[#2A2D3A] hover:bg-[#1A1D27]">
                      <TableCell className="font-medium text-sm">{ticket.subject}</TableCell>
                      <TableCell>
                        <Select value={ticket.status} onValueChange={(v) => updateTicketStatus(ticket, v)}>
                          <SelectTrigger className="w-28 h-7 text-xs bg-transparent border-[#2A2D3A]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                            <SelectItem value="open" className="text-[#E8E8ED]">Open</SelectItem>
                            <SelectItem value="in_progress" className="text-[#E8E8ED]">In Progress</SelectItem>
                            <SelectItem value="resolved" className="text-[#E8E8ED]">Resolved</SelectItem>
                            <SelectItem value="closed" className="text-[#E8E8ED]">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{ticket.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#8B8D97]">
                        {new Date(ticket.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-[#2A2D3A]"
                          onClick={() => setResponding(responding?.id === ticket.id ? null : ticket)}
                        >
                          Respond
                        </Button>
                      </TableCell>
                    </TableRow>
                    {responding?.id === ticket.id && (
                      <TableRow className="border-[#2A2D3A]">
                        <TableCell colSpan={5}>
                          <div className="p-3 space-y-2">
                            <p className="text-xs text-[#8B8D97]">{ticket.message}</p>
                            <Textarea
                              placeholder="Type your response..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-20"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleRespond(ticket)}
                              className="bg-[#00BFFF] text-white"
                            >
                              Send Response
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2D3A]">
                  <TableHead className="text-[#8B8D97]">Name</TableHead>
                  <TableHead className="text-[#8B8D97]">Email</TableHead>
                  <TableHead className="text-[#8B8D97]">Role</TableHead>
                  <TableHead className="text-[#8B8D97]">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id} className="border-[#2A2D3A] hover:bg-[#1A1D27]">
                    <TableCell className="font-medium text-sm">{u.full_name}</TableCell>
                    <TableCell className="text-xs text-[#8B8D97]">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={u.role === "admin" ? "text-[#00BFFF] border-[#00BFFF]/30" : "text-[#8B8D97]"}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#8B8D97]">
                      {new Date(u.created_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}