import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Valid email required"),
  full_name: z.string().optional(),
  account_type: z.enum(["development", "gift"]),
  tier: z.enum(["free", "pro", "premium", "family"]),
  special_status: z.enum(["free_forever", "free_months", "discounted"]),
  free_months: z.coerce.number().optional(),
  discount_amount: z.coerce.number().optional(),
  discount_months: z.coerce.number().optional(),
  expiration_date: z.string().optional(),
  notes: z.string().optional(),
});

export default function CreateSpecialAccountDialog({ open, onOpenChange, onCreated }) {
  const [step, setStep] = useState("form"); // "form" | "confirm"
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      account_type: "development",
      tier: "premium",
      special_status: "free_forever",
    },
  });

  const watchedValues = watch();
  const specialStatus = watchedValues.special_status;

  const onSubmit = (data) => {
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const data = watchedValues;
      await base44.functions.invoke("createSpecialAccount", {
        email: data.email,
        full_name: data.full_name || "",
        account_type: data.account_type,
        tier: data.tier,
        special_status: data.special_status,
        free_months: data.free_months || null,
        discount_amount: data.discount_amount || null,
        discount_months: data.discount_months || null,
        expiration_date: data.expiration_date || null,
        notes: data.notes || "",
      });
      toast.success(`✅ Special account created for ${data.email}`);
      queryClient.invalidateQueries({ queryKey: ["specialAccounts"] });
      reset();
      setStep("form");
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setStep("form");
    onOpenChange(false);
  };

  const tierLabels = { free: "Free", pro: "Pro", premium: "Premium", family: "Family Premium" };
  const typeLabels = { development: "Development/Internal", gift: "Gift Account" };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9370DB] to-[#00BFFF] flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base">Create Special Account</DialogTitle>
                  <DialogDescription className="text-xs text-[#8B8D97]">
                    For internal development or gift use only — not for resale or public distribution
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8B8D97]">Email <span className="text-red-400">*</span></Label>
              <Input {...register("email")} placeholder="user@example.com" className="bg-[#0F1117] border-[#2A2D3A] text-sm" />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8B8D97]">Full Name</Label>
              <Input {...register("full_name")} placeholder="Jane Smith (optional)" className="bg-[#0F1117] border-[#2A2D3A] text-sm" />
            </div>

            {/* Account Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8B8D97]">Account Type <span className="text-red-400">*</span></Label>
              <Select defaultValue="development" onValueChange={v => setValue("account_type", v)}>
                <SelectTrigger className="bg-[#0F1117] border-[#2A2D3A] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  <SelectItem value="development">🛠️ Development / Internal</SelectItem>
                  <SelectItem value="gift">🎁 Gift Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tier */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8B8D97]">Assign Tier <span className="text-red-400">*</span></Label>
              <Select defaultValue="premium" onValueChange={v => setValue("tier", v)}>
                <SelectTrigger className="bg-[#0F1117] border-[#2A2D3A] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">⚡ Pro</SelectItem>
                  <SelectItem value="premium">✨ Premium</SelectItem>
                  <SelectItem value="family">👨‍👩‍👧 Family Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Special Status */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8B8D97]">Special Status</Label>
              <Select defaultValue="free_forever" onValueChange={v => setValue("special_status", v)}>
                <SelectTrigger className="bg-[#0F1117] border-[#2A2D3A] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  <SelectItem value="free_forever">♾️ Free Forever</SelectItem>
                  <SelectItem value="free_months">📅 Free for X Months</SelectItem>
                  <SelectItem value="discounted">💲 Discounted Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: Free Months */}
            {specialStatus === "free_months" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8B8D97]">Number of Free Months</Label>
                <Input {...register("free_months")} type="number" min="1" placeholder="3" className="bg-[#0F1117] border-[#2A2D3A] text-sm" />
              </div>
            )}

            {/* Conditional: Discounted */}
            {specialStatus === "discounted" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8B8D97]">Discounted Rate ($/mo)</Label>
                  <Input {...register("discount_amount")} type="number" step="0.01" placeholder="4.99" className="bg-[#0F1117] border-[#2A2D3A] text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8B8D97]">For How Many Months</Label>
                  <Input {...register("discount_months")} type="number" placeholder="6" className="bg-[#0F1117] border-[#2A2D3A] text-sm" />
                </div>
              </div>
            )}

            {/* Expiration Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8B8D97]">Expiration Date (optional — leave blank for no expiry)</Label>
              <Input {...register("expiration_date")} type="date" className="bg-[#0F1117] border-[#2A2D3A] text-sm" />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8B8D97]">Internal Notes / Tag</Label>
              <textarea
                {...register("notes")}
                rows={2}
                placeholder='e.g. "Team test user", "Gift for partner at TechCrunch"'
                className="w-full rounded-md bg-[#0F1117] border border-[#2A2D3A] text-sm text-[#E8E8ED] px-3 py-2 placeholder:text-[#8B8D97] resize-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/40"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} className="text-[#8B8D97]">Cancel</Button>
              <Button type="submit" className="btn-primary btn-glow">
                <UserPlus className="w-4 h-4" /> Review & Create
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <DialogTitle className="text-base">Confirm Special Account</DialogTitle>
              </div>
            </DialogHeader>

            <div className="rounded-xl bg-[#0F1117] border border-[#2A2D3A] p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#8B8D97]">Email</span><span className="font-mono text-[#00BFFF]">{watchedValues.email}</span></div>
              {watchedValues.full_name && <div className="flex justify-between"><span className="text-[#8B8D97]">Name</span><span>{watchedValues.full_name}</span></div>}
              <div className="flex justify-between"><span className="text-[#8B8D97]">Type</span><Badge variant="outline" className="text-[10px] border-[#9370DB]/40 text-[#9370DB]">{typeLabels[watchedValues.account_type]}</Badge></div>
              <div className="flex justify-between"><span className="text-[#8B8D97]">Tier</span><Badge variant="outline" className="text-[10px] border-[#00BFFF]/40 text-[#00BFFF]">{tierLabels[watchedValues.tier]}</Badge></div>
              <div className="flex justify-between"><span className="text-[#8B8D97]">Status</span><span className="capitalize text-xs">{watchedValues.special_status?.replace(/_/g, " ")}</span></div>
              {watchedValues.expiration_date && <div className="flex justify-between"><span className="text-[#8B8D97]">Expires</span><span className="text-xs">{watchedValues.expiration_date}</span></div>}
              {watchedValues.notes && <div className="flex justify-between items-start gap-4"><span className="text-[#8B8D97] shrink-0">Notes</span><span className="text-xs text-right text-[#8B8D97]">{watchedValues.notes}</span></div>}
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">This account will <strong>bypass Stripe billing</strong> and grant special tier access. A welcome email will be sent automatically. This action is logged.</p>
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep("form")} className="text-[#8B8D97]">← Back</Button>
              <Button onClick={handleConfirm} disabled={loading} className="btn-primary btn-glow">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? "Creating..." : "Confirm & Create"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}