import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar, MapPin, Ticket, Sparkles, Loader2,
  ExternalLink, Star, DollarSign, Search, Bell
} from "lucide-react";
import AddToCalendarButton from "@/components/events/AddToCalendarButton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSubscription } from "@/components/shared/useSubscription";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  suggested: "bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/30",
  interested: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
  booked: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
  declined: "bg-[#8B8D97]/10 text-[#8B8D97] border-[#8B8D97]/30",
};

export default function Events() {
  const [searching, setSearching] = useState(false);
  const [city, setCity] = useState("");
  const [genre, setGenre] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const queryClient = useQueryClient();
  const { isPro, isPremium, isFamily, plan } = useSubscription();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.EventSuggestion.list("-created_date"),
  });

  const { data: savedEvents = [] } = useQuery({
    queryKey: ["savedEventItems"],
    queryFn: () => base44.entities.SavedItem.filter({ category: "event" }),
  });

  const searchEvents = async () => {
    if (!city.trim()) return;
    if (!isPro) {
      toast.error("Event search requires Pro or higher. Upgrade to unlock.");
      return;
    }
    setSearching(true);

    try {
      const response = await base44.functions.invoke('ticketmaster', { city, genre });
      const tmEvents = response.data?.events || [];

      if (tmEvents.length > 0) {
        for (const evt of tmEvents) {
          await base44.entities.EventSuggestion.create(evt);
        }
      } else {
        // Fallback: AI-generated events when no TM results
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Find 6 upcoming events in ${city} for genre: ${genre === "all" ? "any genre (music, sports, arts, comedy)" : genre}. Include variety of price ranges and venues.`,
          response_json_schema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    venue: { type: "string" },
                    date: { type: "string" },
                    city: { type: "string" },
                    category: { type: "string" },
                    min_price: { type: "number" },
                    max_price: { type: "number" },
                    ai_review: { type: "string" },
                  },
                },
              },
            },
          },
          add_context_from_internet: true,
        });
        for (const evt of result.events || []) {
          await base44.entities.EventSuggestion.create({
            ...evt,
            image_url: `https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600`,
            status: "suggested",
          });
        }
      }
    } catch (err) {
      console.error("Event search error:", err);
    }

    queryClient.invalidateQueries({ queryKey: ["events"] });
    setSearching(false);
    toast.success("Events loaded!");
  };

  const updateStatus = async (event, status) => {
    await base44.entities.EventSuggestion.update(event.id, { status });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    toast.success(status === "booked" ? "Marked as booked! 🎟" : "Status updated");
  };

  const getAIReview = async (event) => {
    setSelectedEvent({ ...event, loadingReview: true });
    const review = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a helpful 3-sentence event review for: "${event.name}" at ${event.venue} in ${event.city}. Include what to expect, who would enjoy it, and whether tickets are worth it at $${event.min_price}-$${event.max_price}.`,
      add_context_from_internet: true,
    });
    const updated = await base44.entities.EventSuggestion.update(event.id, { ai_review: review });
    setSelectedEvent({ ...event, ai_review: review, loadingReview: false });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Events & Tickets</h1>
          <p className="text-[#8B8D97] text-sm">Discover events with AI reviews and calendar reminders</p>
        </div>
        {events.filter(e => e.reminder_enabled && !e.ticket_purchased).length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-xs text-[#00BFFF]">
            <Bell className="w-3.5 h-3.5" />
            {events.filter(e => e.reminder_enabled && !e.ticket_purchased).length} reminder{events.filter(e => e.reminder_enabled && !e.ticket_purchased).length > 1 ? "s" : ""} active
          </div>
        )}
      </div>

      {/* Tier gate for event search */}
      {!isPro && (
        <Link to={createPageUrl("Pricing")} className="block p-4 rounded-2xl border border-[#9370DB]/30 bg-gradient-to-r from-[#9370DB]/8 to-[#00BFFF]/8 hover:border-[#9370DB]/50 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎟</span>
              <div>
                <p className="text-sm font-bold gradient-text">Pro required for event search</p>
                <p className="text-xs text-[#8B8D97]">Upgrade to search events, get AI reviews & set calendar reminders</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#9370DB] shrink-0" />
          </div>
        </Link>
      )}

      {/* Search Bar */}
      <Card className="glass-card p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8D97]" />
            <Input
              placeholder="Enter your city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchEvents()}
              className="pl-10 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
            />
          </div>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="w-40 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
              <SelectItem value="all" className="text-[#E8E8ED]">All Genres</SelectItem>
              <SelectItem value="music" className="text-[#E8E8ED]">Music</SelectItem>
              <SelectItem value="sports" className="text-[#E8E8ED]">Sports</SelectItem>
              <SelectItem value="arts" className="text-[#E8E8ED]">Arts & Theater</SelectItem>
              <SelectItem value="comedy" className="text-[#E8E8ED]">Comedy</SelectItem>
              <SelectItem value="family" className="text-[#E8E8ED]">Family</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={searchEvents}
            disabled={searching || !city.trim()}
            className="bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Find Events
          </Button>
        </div>
      </Card>

      {/* Saved Event Items */}
      {savedEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-[#8B8D97]">From Your Saves</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {savedEvents.slice(0, 5).map(ev => (
              <Card key={ev.id} className="glass-card p-3 min-w-[200px] flex-shrink-0 cursor-pointer hover:border-[#9370DB]/40 transition-all"
                    onClick={() => setCity(ev.title.split(" ").slice(0, 2).join(" "))}>
                <p className="text-xs font-medium truncate">{ev.title}</p>
                <p className="text-[10px] text-[#8B8D97] mt-1">Click to find nearby events</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="glass-card rounded-2xl h-64 shimmer-bg" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-[#9370DB] mx-auto mb-3" />
          <h3 className="font-semibold mb-2">No events yet</h3>
          <p className="text-sm text-[#8B8D97]">Search for events in your city above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event, i) => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="glass-card overflow-hidden group cursor-pointer hover:border-[#9370DB]/40 transition-all"
                    onClick={() => setSelectedEvent(event)}>
                {event.image_url && (
                  <div className="h-36 overflow-hidden relative">
                    <img src={event.image_url} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent" />
                    <Badge variant="outline" className={`absolute top-2 right-2 text-[10px] backdrop-blur-md ${statusColors[event.status]}`}>
                      {event.status}
                    </Badge>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-[#9370DB] transition-colors">{event.name}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-[#8B8D97]">
                    <MapPin className="w-3 h-3" /> {event.venue}{event.city && `, ${event.city}`}
                  </div>
                  {event.date && (
                    <div className="flex items-center gap-1 text-[10px] text-[#8B8D97]">
                      <Calendar className="w-3 h-3" /> {new Date(event.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                  {(event.min_price || event.max_price) && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <DollarSign className="w-3 h-3" /> ${event.min_price}–${event.max_price}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#8B8D97] hover:text-[#9370DB] px-2"
                            onClick={(e) => { e.stopPropagation(); updateStatus(event, "interested"); }}>
                      Interested
                    </Button>
                    <Button size="sm" className="h-7 text-[10px] bg-[#9370DB]/20 text-[#9370DB] hover:bg-[#9370DB]/30 px-2"
                            onClick={(e) => { e.stopPropagation(); updateStatus(event, "booked"); }}>
                      <Ticket className="w-3 h-3 mr-1" /> Booked
                    </Button>
                    <div onClick={e => e.stopPropagation()}>
                      <AddToCalendarButton event={event} entity="EventSuggestion" size="sm"
                        onEventUpdated={() => queryClient.invalidateQueries({ queryKey: ["events"] })} />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.image_url && (
                <img src={selectedEvent.image_url} alt={selectedEvent.name} className="w-full h-40 object-cover rounded-xl" />
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0F1117]">
                  <p className="text-[#8B8D97] mb-1">Venue</p>
                  <p>{selectedEvent.venue || "TBD"}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0F1117]">
                  <p className="text-[#8B8D97] mb-1">Price Range</p>
                  <p className="text-emerald-400">${selectedEvent.min_price}–${selectedEvent.max_price}</p>
                </div>
              </div>

              {selectedEvent.ai_review ? (
                <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20">
                  <p className="text-[10px] text-[#9370DB] font-medium flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3" /> AI Review
                  </p>
                  <p className="text-xs text-[#8B8D97]">{selectedEvent.ai_review}</p>
                </div>
              ) : (
                <Button
                  onClick={() => getAIReview(selectedEvent)}
                  disabled={selectedEvent.loadingReview}
                  className="w-full bg-[#9370DB]/20 text-[#9370DB] hover:bg-[#9370DB]/30 gap-2"
                >
                  {selectedEvent.loadingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Get AI Review
                </Button>
              )}

              <div className="flex gap-2 flex-wrap">
                {selectedEvent.ticketmaster_url ? (
                  <a href={selectedEvent.ticketmaster_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1" onClick={() => updateStatus(selectedEvent, "booked")}>
                    <Button className="w-full bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white gap-2">
                      <Ticket className="w-4 h-4" /> Get Tickets
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                ) : (
                  <Button className="flex-1 bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white gap-2"
                    onClick={() => updateStatus(selectedEvent, "booked")}>
                    <Ticket className="w-4 h-4" /> Mark as Booked
                  </Button>
                )}
                <AddToCalendarButton event={selectedEvent} entity="EventSuggestion"
                  onEventUpdated={(updated) => { setSelectedEvent(updated); queryClient.invalidateQueries({ queryKey: ["events"] }); }} />
              </div>

              {/* Ticket purchased toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
                <div>
                  <p className="text-xs font-medium">Ticket purchased?</p>
                  <p className="text-[10px] text-[#8B8D97]">Disables buy reminders once confirmed</p>
                </div>
                <Button size="sm" variant={selectedEvent.ticket_purchased ? "default" : "outline"}
                  className={selectedEvent.ticket_purchased ? "h-7 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "h-7 text-xs border-[#2A2D3A] text-[#8B8D97]"}
                  onClick={async () => {
                    const newVal = !selectedEvent.ticket_purchased;
                    await base44.entities.EventSuggestion.update(selectedEvent.id, { ticket_purchased: newVal, status: "booked" });
                    setSelectedEvent({ ...selectedEvent, ticket_purchased: newVal });
                    queryClient.invalidateQueries({ queryKey: ["events"] });
                    toast.success(newVal ? "🎟 Ticket purchase confirmed! Reminders disabled." : "Ticket purchase cleared");
                  }}>
                  {selectedEvent.ticket_purchased ? "✓ Purchased" : "Mark Purchased"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}