/**
 * Rate-limited wrapper for analyzeItem (AI-heavy endpoint).
 * Limit: 100 requests per hour per user.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 100 calls per hour
    const rateLimitRes = await base44.functions.invoke('rateLimiter', {
      userEmail: user.email,
      endpoint: 'analyze_item',
      limit: 100,
      windowMinutes: 60,
    });

    if (!rateLimitRes.data.allowed) {
      console.warn(`[analyzeItemRateLimited] Rate limit blocked for ${user.email}`);
      return Response.json(
        { error: 'Rate limit exceeded. Max 100 AI analyses per hour.' },
        { status: 429, headers: { 'Retry-After': rateLimitRes.data.retryAfterSeconds } }
      );
    }

    // Call the original analyzeItem function
    const body = await req.json();
    const result = await base44.functions.invoke('analyzeItem', body);
    return Response.json(result.data);
  } catch (error) {
    console.error('[analyzeItemRateLimited] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});