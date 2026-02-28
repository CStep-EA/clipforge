/**
 * Rate-limited wrapper for save import operations.
 * Limit: 100 bulk imports per hour per user (prevents mass-import abuse).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 100 bulk imports per hour
    const rateLimitRes = await base44.functions.invoke('rateLimiter', {
      userEmail: user.email,
      endpoint: 'save_import',
      limit: 100,
      windowMinutes: 60,
    });

    if (!rateLimitRes.data.allowed) {
      console.warn(`[saveImportRateLimited] Rate limit blocked for ${user.email}`);
      return Response.json(
        { error: 'Rate limit exceeded. Max 100 bulk imports per hour.' },
        { status: 429, headers: { 'Retry-After': rateLimitRes.data.retryAfterSeconds } }
      );
    }

    // Call the actual import logic
    const body = await req.json();
    const { items = [] } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    try {
      const created = await base44.entities.SavedItem.bulkCreate(
        items.map(item => ({
          ...item,
          // Ensure title is set
          title: item.title || item.url || 'Imported Item',
          category: item.category || 'other',
          source: item.source || 'manual',
        }))
      );

      console.log(`[saveImportRateLimited] Imported ${created.length} items for ${user.email}`);
      return Response.json({ success: true, imported: created.length });
    } catch (importErr) {
      console.error('[saveImportRateLimited] Import error:', importErr.message);
      return Response.json({ error: 'Failed to import items' }, { status: 500 });
    }
  } catch (error) {
    console.error('[saveImportRateLimited] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});