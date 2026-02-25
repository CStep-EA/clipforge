import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { topic, savedContext = [] } = await req.json();
    if (!topic) return Response.json({ error: 'topic required' }, { status: 400 });

    // Build context string from user's saved items
    const ctxStr = savedContext.slice(0, 20).map(i =>
      `• ${i.title} (${i.category}): ${i.ai_summary || i.description || ""}`
    ).join("\n");

    // Web-augmented deep research via InvokeLLM
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert researcher. Deeply research the following topic and provide a comprehensive, structured report.

TOPIC: "${topic}"

USER CONTEXT (their saved items related to this topic):
${ctxStr || "No saved items yet"}

Your report must include:
1. **Executive Summary** – 2-3 sentences
2. **Key Findings** – 4-6 bullet points with the most important facts
3. **Trend Analysis** – What's trending, why it matters
4. **Recommendations** – 3 specific actionable items for the user
5. **Related Topics** – 3-5 related areas to explore
6. **Sources & Credibility** – Note data freshness

Format as clean Markdown. Be specific, data-driven, and insightful. Reference current information.`,
      add_context_from_internet: true,
    });

    // Also extract structured insights
    const structured = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Based on the topic "${topic}", extract structured NLP insights:
- Top 5 keywords/entities
- Sentiment (positive/neutral/negative)
- Category (shopping/lifestyle/food/travel/tech/entertainment/other)
- Trend direction (rising/stable/declining)
- Urgency score 1-10 (how time-sensitive is this)
- Gift potential 1-10 (how good is this as a gift idea)`,
      response_json_schema: {
        type: "object",
        properties: {
          keywords: { type: "array", items: { type: "string" } },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          category: { type: "string" },
          trend_direction: { type: "string", enum: ["rising", "stable", "declining"] },
          urgency_score: { type: "number" },
          gift_potential: { type: "number" },
        },
      },
      add_context_from_internet: false,
    });

    return Response.json({ report: result, insights: structured });
  } catch (err) {
    console.error("deepResearch error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});