import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle subscription checkout
        if (session.mode === 'subscription') {
          const subscriptionId = session.metadata?.subscriptionId;

          if (subscriptionId && session.subscription) {
            console.log(`Processing subscription checkout: ${subscriptionId}`);

            await prisma.subscription.update({
              where: { id: subscriptionId },
              data: {
                stripeSubscriptionId: session.subscription as string,
                stripeCustomerId: session.customer as string,
              },
            });

            console.log(`Updated subscription ${subscriptionId} with Stripe IDs`);
          }
        }
        // Handle one-time payment checkout
        else if (session.mode === 'payment') {
          const orderId = session.metadata?.orderId;

          if (orderId) {
            // Update order status
            await prisma.order.update({
              where: { id: orderId },
              data: { status: 'COMPLETED' },
            });

            // Create payment record
            if (session.payment_intent) {
              await prisma.payment.create({
                data: {
                  orderId,
                  stripePaymentIntentId: session.payment_intent as string,
                  status: 'SUCCEEDED',
                  amount: session.amount_total || 0,
                  currency: session.currency || 'jpy',
                  paidAt: new Date(),
                },
              });
            }
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Find payment by payment intent ID and update status
        const payment = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
        }
        break;
      }

      case 'customer.subscription.created': {
        const stripeSubscription = event.data
          .object as Stripe.Subscription;

        console.log(
          `Subscription created: ${stripeSubscription.id}, status: ${stripeSubscription.status}`
        );

        // Try to find subscription by metadata first
        let subscription = stripeSubscription.metadata?.subscriptionId
          ? await prisma.subscription.findUnique({
              where: { id: stripeSubscription.metadata.subscriptionId },
            })
          : null;

        // If not found by metadata, try by stripeSubscriptionId
        if (!subscription) {
          subscription = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: stripeSubscription.id },
          });
        }

        if (subscription) {
          console.log(`Updating subscription ${subscription.id}`);

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              stripeSubscriptionId: stripeSubscription.id,
              stripeCustomerId: stripeSubscription.customer as string,
              status: stripeSubscription.status.toUpperCase() as any,
              currentPeriodStart: new Date(
                stripeSubscription.current_period_start * 1000
              ),
              currentPeriodEnd: new Date(
                stripeSubscription.current_period_end * 1000
              ),
            },
          });

          console.log(
            `Updated subscription ${subscription.id} to status ${stripeSubscription.status.toUpperCase()}`
          );
        } else {
          console.log(
            `No subscription found for Stripe subscription ${stripeSubscription.id}`
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSubscription = event.data
          .object as Stripe.Subscription;

        console.log(
          `Subscription updated: ${stripeSubscription.id}, status: ${stripeSubscription.status}`
        );

        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: stripeSubscription.id },
        });

        if (subscription) {
          console.log(`Updating subscription ${subscription.id}`);

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: stripeSubscription.status.toUpperCase() as any,
              currentPeriodStart: new Date(
                stripeSubscription.current_period_start * 1000
              ),
              currentPeriodEnd: new Date(
                stripeSubscription.current_period_end * 1000
              ),
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
          });

          console.log(
            `Updated subscription ${subscription.id} to status ${stripeSubscription.status.toUpperCase()}`
          );
        } else {
          console.log(
            `No subscription found for Stripe subscription ${stripeSubscription.id}`
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data
          .object as Stripe.Subscription;

        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: stripeSubscription.id },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'CANCELED',
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
