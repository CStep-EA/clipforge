import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scheduled function: runs hourly via automation.
 * Sends 7-day, 24-hour, and 1-hour (Premium) reminders for upcoming events
 * where reminder_enabled=true and ticket_purchased=false.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no-auth) calls OR admin user calls
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
    } catch {
      // Scheduled automation — no user token, allow through
    }

    const now = new Date();
    const H = 3600000;
    const D = 86400000;

    // Fetch all EventSuggestion records with reminders enabled and not yet purchased
    const allEvents = await base44.asServiceRole.entities.EventSuggestion.filter({
      reminder_enabled: true,
    });
    const events = allEvents.filter(e => !e.ticket_purchased);

    // Fetch event-category SavedItems with reminders enabled
    const allSaved = await base44.asServiceRole.entities.SavedItem.filter({
      category: 'event',
      reminder_enabled: true,
    });
    const savedEvents = allSaved.filter(e => !e.ticket_purchased);

    let sent = 0;

    const sendReminder = async (item, entity, hoursUntil, reminderKey) => {
      const email = item.reminder_email || item.created_by;
      if (!email) return;

      const eventDate = new Date(item.date || item.event_date);
      const name = item.name || item.title || 'Upcoming Event';
      const venue = item.venue || item.event_venue || '';
      const city = item.city || item.event_city || '';
      const buyLink = item.ticketmaster_url || item.ticket_url || item.url || 'https://www.ticketmaster.com';
      const timeLabel = hoursUntil >= 168 ? '7 days' : hoursUntil >= 24 ? '24 hours' : '1 hour';

      const subject = `⏰ Reminder: "${name}" is in ${timeLabel}!`;
      const body = `
Hi there!

Your saved event is coming up soon:

🎟 ${name}
📍 ${[venue, city].filter(Boolean).join(', ')}
📅 ${eventDate.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}

It looks like you haven't purchased tickets yet. Don't miss out!

👉 Get Tickets: ${buyLink}

You're receiving this because you enabled reminders in ClipForge.
To turn off reminders, open the event in ClipForge and disable them.
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body });

      // Mark as sent
      const update = { [reminderKey]: true };
      if (entity === 'EventSuggestion') {
        await base44.asServiceRole.entities.EventSuggestion.update(item.id, update);
      } else {
        await base44.asServiceRole.entities.SavedItem.update(item.id, update);
      }
      sent++;
    };

    const check = async (item, entity) => {
      const dateField = item.date || item.event_date;
      if (!dateField) return;
      const eventDate = new Date(dateField);
      const diff = eventDate - now;
      if (diff < 0) return; // past event

      // 7-day: diff between 7d and 6d23h
      if (!item.reminder_7d_sent && diff <= 7 * D && diff > 7 * D - H) {
        await sendReminder(item, entity, 168, 'reminder_7d_sent');
      }
      // 24-hour
      if (!item.reminder_24h_sent && diff <= 24 * H && diff > 23 * H) {
        await sendReminder(item, entity, 24, 'reminder_24h_sent');
      }
      // 1-hour (checked separately — only for premium users, enforced on enable)
      if (!item.reminder_1h_sent && diff <= H && diff > 0) {
        await sendReminder(item, entity, 1, 'reminder_1h_sent');
      }
    };

    for (const ev of events) await check(ev, 'EventSuggestion');
    for (const si of savedEvents) await check(si, 'SavedItem');

    console.log(`[eventReminders] Checked ${events.length + savedEvents.length} events, sent ${sent} reminders`);
    return Response.json({ ok: true, checked: events.length + savedEvents.length, sent });
  } catch (error) {
    console.error('[eventReminders] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});