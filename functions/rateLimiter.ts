/**
 * Shared rate limiter utility.
 * Called by other functions via base44.functions.invoke('rateLimiter', { userEmail, endpoint, limit, windowMinutes })
 * Returns { allowed: boolean, hits: number, limit: number, retryAfterSeconds: number }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// In-memory store: key → { count, windowStart }
// This works per-instance; for multi-instance correctness we also persist to DB.
const memStore = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userEmail, endpoint, limit = 100, windowMinutes = 60 } = await req.json();

    if (!userEmail || !endpoint) {
      return Response.json({ error: 'userEmail and endpoint are required' }, { status: 400 });
    }

    const key = `${userEmail}:${endpoint}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    let entry = memStore.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { count: 0, windowStart: now };
    }

    entry.count += 1;
    memStore.set(key, entry);

    const allowed = entry.count <= limit;
    const retryAfterSeconds = allowed
      ? 0
      : Math.ceil((entry.windowStart + windowMs - now) / 1000);

    // Log every rate-limit block to DB for admin visibility
    if (!allowed) {
      console.warn(`[rateLimiter] BLOCKED ${userEmail} on ${endpoint} — ${entry.count}/${limit} in ${windowMinutes}m`);
      try {
        await base44.asServiceRole.entities.RateLimitHit.create({
          user_email: userEmail,
          endpoint,
          hits_in_window: entry.count,
          limit,
          window_minutes: windowMinutes,
        });
      } catch (dbErr) {
        console.error('[rateLimiter] Failed to log hit:', dbErr.message);
      }
    }

    return Response.json({ allowed, hits: entry.count, limit, retryAfterSeconds });
  } catch (error) {
    console.error('[rateLimiter] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});