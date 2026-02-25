import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const categories = [
  { value: "all", label: "All", color: "#E8E8ED" },
  { value: "deal", label: "Deals", color: "#00BFFF" },
  { value: "recipe", label: "Recipes", color: "#FFB6C1" },
  { value: "event", label: "Events", color: "#9370DB" },
  { value: "product", label: "Products", color: "#F59E0B" },
  { value: "article", label: "Articles", color: "#10B981" },
  { value: "travel", label: "Travel", color: "#3B82F6" },
  { value: "gift_idea", label: "Gifts", color: "#EC4899" },
];

export default function CategoryFilter({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border",
            active === cat.value
              ? "border-opacity-50"
              : "bg-transparent border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] hover:border-[#8B8D97]"
          )}
          style={active === cat.value ? {
            background: `${cat.color}15`,
            color: cat.color,
            borderColor: `${cat.color}40`,
          } : {}}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}