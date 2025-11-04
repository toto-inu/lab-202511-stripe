import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { planId, customerEmail } = await request.json();

    if (!planId || !customerEmail) {
      return NextResponse.json(
        { error: 'Plan ID and customer email are required' },
        { status: 400 }
      );
    }

    // Get subscription plan from database
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.active) {
      return NextResponse.json(
        { error: 'Subscription plan not found or inactive' },
        { status: 404 }
      );
    }

    // Create subscription record in database
    const subscription = await prisma.subscription.create({
      data: {
        planId: plan.id,
        customerEmail,
        status: 'PENDING',
      },
    });

    // Determine the interval for Stripe
    const stripeInterval = plan.interval === 'MONTH' ? 'month' : 'year';

    // Create Stripe Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: plan.description || undefined,
            },
            unit_amount: plan.price,
            recurring: {
              interval: stripeInterval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/cancel`,
      customer_email: customerEmail,
      metadata: {
        subscriptionId: subscription.id,
      },
      subscription_data: {
        metadata: {
          subscriptionId: subscription.id,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Subscription checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription checkout session' },
      { status: 500 }
    );
  }
}
