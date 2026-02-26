import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecipeExportButton({ item }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const queryClient = useQueryClient();

  if (item.category !== "recipe") return null;

  const handleExport = async (e) => {
    e.stopPropagation();
    setStatus("loading");
    try {
      const res = await base44.functions.invoke("spoonacular", {
        url: item.url,
        title: item.title,
      });
      const ingredients = res?.data?.ingredients || res?.data?.extendedIngredients?.map(i => ({
        name: i.name || i.original,
        quantity: i.amount ? `${i.amount} ${i.unit}` : "as needed",
        checked: false,
        category: "grocery",
      })) || [];

      const listItems = ingredients.length > 0 ? ingredients : [{ name: item.title + " (ingredients)", quantity: "1", checked: false }];

      await base44.entities.ShoppingList.create({
        name: `🍽️ ${item.title}`,
        items: listItems,
        source_item_id: item.id,
      });
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (_) {
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <Link to={createPageUrl("ShoppingLists")} onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-400 hover:bg-emerald-400/10 gap-1 px-2">
          <CheckCircle2 className="w-3 h-3" /> View List
        </Button>
      </Link>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-[10px] text-[#FFB6C1] hover:bg-[#FFB6C1]/10 gap-1 px-2"
      onClick={handleExport}
      disabled={status === "loading"}
    >
      {status === "loading" ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <ShoppingCart className="w-3 h-3" />
      )}
      {status === "loading" ? "Extracting…" : "→ List"}
    </Button>
  );
}