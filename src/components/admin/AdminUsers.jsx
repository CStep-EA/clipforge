import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCheck, UserX, Loader2 } from "lucide-react";

export default function AdminUsers({ allSubs = [] }) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const getSubForUser = (email) => allSubs.find(s => s.user_email === email);

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const planColors = { free: "#8B8D97", pro: "#00BFFF", premium: "#9370DB" };

  const handleRoleChange = async (user, role) => {
    await base44.entities.User.update(user.id, { role });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BFFF]" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8B8D97]" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
        />
      </div>
      <Card className="glass-card overflow-hidden">
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
              return (
                <TableRow key={u.id} className="border-[#2A2D3A] hover:bg-[#1A1D27]">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{u.full_name || "—"}</p>
                      <p className="text-xs text-[#8B8D97]">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]" style={{ color: planColors[plan], borderColor: `${planColors[plan]}40` }}>
                      {plan}
                    </Badge>
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