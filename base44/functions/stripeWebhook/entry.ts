import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email;
      const plan = session.metadata?.plan;

      if (userEmail && plan) {
        const existing = await base44.asServiceRole.entities.UserSubscription.filter({ user_email: userEmail });
        if (existing.length > 0) {
          await base44.asServiceRole.entities.UserSubscription.update(existing[0].id, {
            plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: "active",
          });
        } else {
          await base44.asServiceRole.entities.UserSubscription.create({
            user_email: userEmail,
            plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: "active",
          });
        }
        console.log(`Subscription activated: ${userEmail} -> ${plan}`);
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const existing = await base44.asServiceRole.entities.UserSubscription.filter({ stripe_subscription_id: sub.id });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.UserSubscription.update(existing[0].id, {
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          plan: event.type === "customer.subscription.deleted" ? "free" : existing[0].plan,
        });
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err.message);
  }

  return Response.json({ received: true });
});