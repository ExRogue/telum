import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(stripeSecretKey, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

// Map our plan slugs to Stripe Price IDs (set these in Vercel env vars)
export function getStripePriceId(planSlug: string, interval: 'monthly' | 'yearly'): string {
  const key = `STRIPE_PRICE_${planSlug.toUpperCase()}_${interval.toUpperCase()}`;
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${planSlug} ${interval}. Set ${key} in environment variables.`);
  }
  return priceId;
}

export async function createCheckoutSession({
  userId,
  userEmail,
  planSlug,
  interval,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  planSlug: string;
  interval: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const priceId = getStripePriceId(planSlug, interval);

  // Check if customer already exists
  const { sql } = await import('@vercel/postgres');
  const subResult = await sql`
    SELECT stripe_customer_id FROM subscriptions
    WHERE user_id = ${userId} AND stripe_customer_id IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  let customerId = subResult.rows[0]?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planSlug, interval },
    subscription_data: {
      metadata: { userId, planSlug },
    },
  });

  return session.url!;
}

export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export async function handleWebhookEvent(body: string, signature: string): Promise<Stripe.Event> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}
