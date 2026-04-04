import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PRICE_IDS = {
  pro: "price_1T4ptiDBNOTwsaYxWLu8liEN",
  premium: "price_1T4ptiDBNOTwsaYxUDlFkgfc",
  family_monthly: "price_1T550MAzAnx06fD4nJT320Eo",
  family_yearly: "price_1T550MAzAnx06fD4IDCdTisI",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, success_url, cancel_url } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) return Response.json({ error: "Invalid plan" }, { status: 400 });

    // Normalize plan name for subscription storage
    const planName = plan === "family_monthly" || plan === "family_yearly" ? "family" : plan;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || "https://app.base44.com",
      cancel_url: cancel_url || "https://app.base44.com",
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        plan: planName,
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});