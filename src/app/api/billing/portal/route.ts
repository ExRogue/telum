import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createBillingPortalSession } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/billing';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const subscription = await getUserSubscription(user.id);
    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No active billing account. Subscribe to a plan first.' }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const url = await createBillingPortalSession(
      subscription.stripe_customer_id,
      `${origin}/billing`
    );

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 });
  }
}
