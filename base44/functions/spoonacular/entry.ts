import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SENTRY_DSN = "https://f66f91cc6ce5c0e70b61f87c4a803d86@o4510964671905792.ingest.us.sentry.io/4510964678459392";
async function sentryCaptureError(error, context = {}) {
  try {
    const url = new URL(SENTRY_DSN);
    const key = url.username;
    const projectId = url.pathname.replace("/", "");
    const envelope = [
      JSON.stringify({ sent_at: new Date().toISOString() }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({ event_id: crypto.randomUUID().replace(/-/g,""), timestamp: new Date().toISOString(), platform: "javascript", level: "error", environment: "production", exception: { values: [{ type: error?.name||"Error", value: error?.message||String(error) }] }, tags: context.tags||{} }),
    ].join("\n");
    await fetch(`https://${url.hostname}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body: envelope });
  } catch (e) { console.error("Sentry capture failed:", e.message); }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, url, recipeId, query } = await req.json();

    // Rate limit: 100 requests/hour per user
    const rlRes = await base44.functions.invoke('rateLimiter', {
      userEmail: user.email, endpoint: 'spoonacular', limit: 100, windowMinutes: 60,
    });
    if (!rlRes.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rlRes.retryAfterSeconds) },
      });
    }

    const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
    if (!apiKey) return Response.json({ error: 'SPOONACULAR_API_KEY not configured' }, { status: 500 });

    // Extract recipe info from a URL
    if (action === 'extract' && url) {
      const params = new URLSearchParams({ apiKey, url, forceExtraction: 'true', analyze: 'true' });
      const res = await fetch(`https://api.spoonacular.com/recipes/extract?${params}`);
      if (!res.ok) {
        const txt = await res.text();
        console.error('Spoonacular extract error:', res.status, txt);
        return Response.json({ error: `Spoonacular error: ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      const ingredients = (data.extendedIngredients || []).map(ing => ({
        name: ing.name,
        quantity: `${ing.amount} ${ing.unit}`.trim(),
        category: ing.aisle || 'Other',
        checked: false,
      }));
      return Response.json({
        title: data.title,
        image: data.image,
        servings: data.servings,
        readyInMinutes: data.readyInMinutes,
        calories: data.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || null,
        ingredients,
        sourceUrl: data.sourceUrl,
      });
    }

    // Search recipes by keyword
    if (action === 'search' && query) {
      const params = new URLSearchParams({ apiKey, query, number: '6', addRecipeInformation: 'true' });
      const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
      if (!res.ok) {
        const txt = await res.text();
        console.error('Spoonacular search error:', res.status, txt);
        return Response.json({ error: `Spoonacular error: ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      return Response.json({ results: data.results || [] });
    }

    // Get ingredients for a known recipe ID
    if (action === 'ingredients' && recipeId) {
      const params = new URLSearchParams({ apiKey });
      const res = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/ingredientWidget.json?${params}`);
      if (!res.ok) {
        const txt = await res.text();
        console.error('Spoonacular ingredients error:', res.status, txt);
        return Response.json({ error: `Spoonacular error: ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      const ingredients = (data.ingredients || []).map(ing => ({
        name: ing.name,
        quantity: `${ing.amount?.us?.value || ''} ${ing.amount?.us?.unit || ''}`.trim(),
        category: 'Ingredient',
        checked: false,
      }));
      return Response.json({ ingredients });
    }

    return Response.json({ error: 'Invalid action. Use: extract, search, or ingredients' }, { status: 400 });
  } catch (err) {
    console.error('spoonacular function error:', err.message);
    await sentryCaptureError(err, { tags: { function: 'spoonacular' } });
    return Response.json({ error: err.message }, { status: 500 });
  }
});