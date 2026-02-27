import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, CheckCircle2, Clock, Infinity } from "lucide-react";

const tierColors = { free: "#8B8D97", pro: "#00BFFF", premium: "#9370DB", family: "#FFB6C1" };
const typeColors = { development: "#00BFFF", gift: "#FFB6C1" };

export default function SpecialAccountsList() {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["specialAccounts"],
    queryFn: () => base44.entities.SpecialAccount.list("-created_date"),
  });

  if (isLoading) return <div className="text-center py-8 text-[#8B8D97] text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-[#9370DB]" />
        <span className="text-sm font-semibold">Special Accounts ({accounts.length})</span>
        <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 ml-auto">Admin-only visibility</Badge>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 text-[#8B8D97] text-sm">No special accounts created yet.</div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2A2D3A]">
                <TableHead className="text-[#8B8D97] text-xs">Email</TableHead>
                <TableHead className="text-[#8B8D97] text-xs">Type</TableHead>
                <TableHead className="text-[#8B8D97] text-xs">Tier</TableHead>
                <TableHead className="text-[#8B8D97] text-xs">Status</TableHead>
                <TableHead className="text-[#8B8D97] text-xs">Expires</TableHead>
                <TableHead className="text-[#8B8D97] text-xs">Email Sent</TableHead>
                <TableHead className="text-[#8B8D97] text-xs">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map(acct => {
                const expired = acct.expiration_date && new Date(acct.expiration_date) < new Date();
                return (
                  <TableRow key={acct.id} className="border-[#2A2D3A] hover:bg-[#1A1D27]">
                    <TableCell className="text-xs font-mono text-[#E8E8ED]">{acct.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] capitalize" style={{ color: typeColors[acct.account_type], borderColor: `${typeColors[acct.account_type]}40` }}>
                        {acct.account_type === "development" ? "🛠️ Dev" : "🎁 Gift"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] capitalize" style={{ color: tierColors[acct.tier], borderColor: `${tierColors[acct.tier]}40` }}>
                        {acct.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${acct.is_active && !expired ? "text-emerald-400 border-emerald-400/30" : "text-red-400 border-red-400/30"}`}>
                        {acct.is_active && !expired ? "Active" : "Expired"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#8B8D97]">
                      {acct.expiration_date
                        ? <span className={expired ? "text-red-400" : ""}>{new Date(acct.expiration_date).toLocaleDateString()}</span>
                        : <span className="flex items-center gap-1 text-emerald-400/70"><Infinity className="w-3 h-3" /> Forever</span>
                      }
                    </TableCell>
                    <TableCell>
                      {acct.welcome_email_sent
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        : <Clock className="w-3.5 h-3.5 text-amber-400" />
                      }
                    </TableCell>
                    <TableCell className="text-xs text-[#8B8D97] max-w-[140px] truncate" title={acct.notes}>
                      {acct.notes || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}