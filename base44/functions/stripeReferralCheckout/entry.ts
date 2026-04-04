import Stripe from "npm:stripe@15.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const { plan, referralCode, successUrl, cancelUrl } = await req.json();
    const appId = Deno.env.get("BASE44_APP_ID");

    if (!plan || !successUrl || !cancelUrl) {
      console.error("Missing required fields");
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const sessionConfig = {
      payment_method_types: ["card"],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price: plan,
          quantity: 1,
        },
      ],
      metadata: {
        base44_app_id: appId,
        referral_code: referralCode || "",
      },
    };

    // Apply referral discount code if provided
    if (referralCode) {
      try {
        // Try to retrieve discount code
        const coupons = await stripe.coupons.list({ limit: 100 });
        const referralCoupon = coupons.data.find((c) => c.id === `REF_${referralCode}`);

        if (referralCoupon) {
          sessionConfig.discounts = [{ coupon: referralCoupon.id }];
          console.log(`Applied referral discount: ${referralCoupon.id}`);
        }
      } catch (err) {
        console.log("Referral coupon not found, proceeding without discount");
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Checkout session created: ${session.id}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});