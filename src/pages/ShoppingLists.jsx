import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ShoppingCart, Sparkles, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ShoppingLists() {
  const [createOpen, setCreateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery({
    queryKey: ["shoppingLists"],
    queryFn: () => base44.entities.ShoppingList.list("-created_date"),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.SavedItem.filter({ category: "recipe" }),
  });

  const generateFromRecipe = async (recipe) => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract a shopping list from this recipe:\nTitle: ${recipe.title}\nDescription: ${recipe.description || ""}\nSummary: ${recipe.ai_summary || ""}\nURL: ${recipe.url || ""}\n\nReturn a list of ingredients with quantities grouped by grocery category.`,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                category: { type: "string" },
              },
            },
          },
        },
      },
      add_context_from_internet: !!recipe.url,
    });

    const listItems = (result.items || []).map(item => ({ ...item, checked: false }));
    await base44.entities.ShoppingList.create({
      name: `🍽️ ${recipe.title}`,
      items: listItems,
      source_item_id: recipe.id,
    });
    queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    setGenerating(false);
    setCreateOpen(false);
  };

  const toggleItem = async (list, idx) => {
    const updatedItems = [...list.items];
    updatedItems[idx] = { ...updatedItems[idx], checked: !updatedItems[idx].checked };
    await base44.entities.ShoppingList.update(list.id, { items: updatedItems });
    queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
  };

  const addItemToList = async (list) => {
    if (!newItemName.trim()) return;
    const updatedItems = [...(list.items || []), { name: newItemName.trim(), quantity: "", checked: false, category: "" }];
    await base44.entities.ShoppingList.update(list.id, { items: updatedItems });
    setNewItemName("");
    queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
  };

  const deleteList = async (list) => {
    await base44.entities.ShoppingList.delete(list.id);
    if (selectedList?.id === list.id) setSelectedList(null);
    queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shopping Lists</h1>
          <p className="text-[#8B8D97] text-sm">Auto-generate from recipes or create manually</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#FFB6C1] to-[#00BFFF] text-white gap-2">
          <Plus className="w-4 h-4" /> New List
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists */}
        <div className="lg:col-span-1 space-y-3">
          {lists.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <ShoppingCart className="w-10 h-10 text-[#FFB6C1] mx-auto mb-3" />
              <p className="text-sm text-[#8B8D97]">No shopping lists yet</p>
            </div>
          ) : lists.map((list) => {
            const checkedCount = list.items?.filter(i => i.checked).length || 0;
            const totalCount = list.items?.length || 0;
            return (
              <motion.div key={list.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card
                  className={`glass-card p-4 cursor-pointer transition-all ${selectedList?.id === list.id ? "border-[#00BFFF]/50" : "hover:border-[#2A2D3A]"}`}
                  onClick={() => setSelectedList(list)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm truncate">{list.name}</h3>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-[#8B8D97] hover:text-red-400"
                            onClick={(e) => { e.stopPropagation(); deleteList(list); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#2A2D3A] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] transition-all"
                        style={{ width: totalCount ? `${(checkedCount / totalCount) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-[10px] text-[#8B8D97]">{checkedCount}/{totalCount}</span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selectedList ? (
            <Card className="glass-card p-6">
              <h2 className="font-semibold text-lg mb-4">{selectedList.name}</h2>
              <div className="space-y-2 mb-4">
                {selectedList.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#0F1117] transition-colors">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleItem(selectedList, idx)}
                      className="border-[#2A2D3A] data-[state=checked]:bg-[#00BFFF] data-[state=checked]:border-[#00BFFF]"
                    />
                    <span className={`text-sm flex-1 ${item.checked ? "line-through text-[#8B8D97]" : ""}`}>
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="text-xs text-[#8B8D97] bg-[#2A2D3A] px-2 py-0.5 rounded">{item.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add item..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItemToList(selectedList)}
                  className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
                />
                <Button onClick={() => addItemToList(selectedList)} className="bg-[#00BFFF] text-white">
                  Add
                </Button>
              </div>
            </Card>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-[#8B8D97]">Select a list to view items</p>
            </div>
          )}
        </div>
      </div>

      {/* Generate dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text">Create Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {recipes.length > 0 && (
              <div>
                <p className="text-xs text-[#8B8D97] mb-2">Generate from a saved recipe</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recipes.map(recipe => (
                    <button
                      key={recipe.id}
                      onClick={() => generateFromRecipe(recipe)}
                      disabled={generating}
                      className="w-full text-left p-3 rounded-xl bg-[#0F1117] hover:bg-[#2A2D3A] transition-colors flex items-center gap-3"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#FFB6C1]" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[#FFB6C1]" />
                      )}
                      <span className="text-sm truncate">{recipe.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-[#2A2D3A] pt-4">
              <p className="text-xs text-[#8B8D97] mb-2">Or create a blank list</p>
              <Input
                placeholder="List name..."
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    await base44.entities.ShoppingList.create({ name: e.target.value.trim(), items: [] });
                    queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
                    setCreateOpen(false);
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}