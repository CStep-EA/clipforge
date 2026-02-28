/**
 * Rate-limited wrapper for AI item analysis used in AddItemDialog.
 * Limit: 100 requests/hour per user.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { sentryCaptureError } from './sentryCaptureError.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 100/hr
    const rl = await base44.functions.invoke('rateLimiter', {
      userEmail: user.email, endpoint: 'analyzeItem', limit: 100, windowMinutes: 60,
    });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSeconds) },
      });
    }

    const { title, url, description } = await req.json();

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this content and provide categorization:\nTitle: ${title || ''}\nURL: ${url || ''}\nDescription: ${description || ''}\n\nProvide a category, summary, tags, and relevance rating.`,
      response_json_schema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['deal', 'recipe', 'event', 'product', 'article', 'travel', 'gift_idea', 'other'] },
          ai_summary: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          rating: { type: 'number' },
          suggested_title: { type: 'string' },
        },
      },
      add_context_from_internet: !!url,
    });

    return Response.json(result);
  } catch (err) {
    console.error('[analyzeItem] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});