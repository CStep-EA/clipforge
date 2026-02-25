import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Info } from "lucide-react";

export default function ConsentModal({ open, onClose, onAccept, platform }) {
  if (!platform) return null;

  const dataPoints = {
    instagram: ["Your saved posts & collections", "Post captions and media URLs", "Account username"],
    pinterest: ["Your boards and saved pins", "Pin titles, descriptions, and URLs", "Board names"],
    twitter: ["Your bookmarked tweets", "Tweet text and linked URLs", "Account handle"],
    tiktok: ["Your favorited videos", "Video descriptions and author info", "Account username"],
  };

  const points = dataPoints[platform.id] || ["Account data and saved content"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Data Access Consent
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-[#8B8D97]">
            To connect <strong className="text-[#E8E8ED]">{platform.name}</strong>, ClipForge will read the following data using your API token:
          </p>

          <ul className="space-y-2">
            {points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: `${platform.color}25`, color: platform.color }}>✓</span>
                {p}
              </li>
            ))}
          </ul>

          <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A] flex gap-2">
            <Info className="w-4 h-4 text-[#00BFFF] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#8B8D97]">
              Your token is stored encrypted and only used to fetch your saved content. We never post on your behalf. You can revoke access at any time.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-[#2A2D3A] text-[#8B8D97]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="text-white"
            style={{ background: platform.color }}
            onClick={onAccept}
          >
            I Agree — Connect {platform.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}