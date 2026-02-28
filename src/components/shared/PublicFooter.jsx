import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const links = [
  { label: "About", page: "About" },
  { label: "Vision", page: "VisionMission" },
  { label: "Roadmap", page: "LaunchRoadmap" },
  { label: "Pricing", page: "Pricing" },
  { label: "Privacy", page: "Privacy" },
  { label: "Terms", page: "Terms" },
  { label: "Cookies", page: "Cookies" },
  { label: "Support", page: "Support" },
];

export default function PublicFooter() {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#8B8D97] pb-10 pt-4">
      {links.map(l => (
        <Link key={l.page} to={createPageUrl(l.page)} className="hover:text-[#00BFFF] transition-colors">
          {l.label}
        </Link>
      ))}
      <span className="w-full text-center mt-1">© 2026 ClipForge</span>
    </div>
  );
}