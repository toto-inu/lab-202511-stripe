'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: 'MONTH' | 'YEAR';
}

export default function Subscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription-plans');
      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setPlans(data);
      } else {
        console.error('API response is not an array:', data);
        setPlans([]);
      }
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setCheckoutLoading(planId);

    try {
      const response = await fetch('/api/checkout-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          customerEmail: email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  };

  const formatInterval = (interval: 'MONTH' | 'YEAR') => {
    return interval === 'MONTH' ? '月額' : '年額';
  };

  // Group plans by interval
  const monthlyPlans = plans.filter((plan) => plan.interval === 'MONTH');
  const yearlyPlans = plans.filter((plan) => plan.interval === 'YEAR');

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Back to Products
          </Link>
        </div>

        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Subscription Plans
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Choose a plan that works for you
          </p>
        </div>

        <div className="mb-8">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Your Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-md rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
          />
        </div>

        {loading ? (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            Loading plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-zinc-900">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              No subscription plans available. Add some plans to the database to
              get started.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              You can add plans using Prisma Studio or by creating a seed
              script.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {monthlyPlans.length > 0 && (
              <div>
                <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Monthly Plans
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {monthlyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex flex-col rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-zinc-900"
                    >
                      <div className="mb-2 text-sm font-medium uppercase text-zinc-500 dark:text-zinc-400">
                        {formatInterval(plan.interval)}
                      </div>
                      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        {plan.name}
                      </h2>
                      {plan.description && (
                        <p className="mb-4 flex-grow text-zinc-600 dark:text-zinc-400">
                          {plan.description}
                        </p>
                      )}
                      <div className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {formatPrice(plan.price, plan.currency)}
                        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                          /月
                        </span>
                      </div>
                      <button
                        onClick={() => handleCheckout(plan.id)}
                        disabled={!email || checkoutLoading !== null}
                        className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {checkoutLoading === plan.id
                          ? 'Processing...'
                          : 'Subscribe'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {yearlyPlans.length > 0 && (
              <div>
                <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Yearly Plans
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {yearlyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex flex-col rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-zinc-900"
                    >
                      <div className="mb-2 text-sm font-medium uppercase text-zinc-500 dark:text-zinc-400">
                        {formatInterval(plan.interval)}
                      </div>
                      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        {plan.name}
                      </h2>
                      {plan.description && (
                        <p className="mb-4 flex-grow text-zinc-600 dark:text-zinc-400">
                          {plan.description}
                        </p>
                      )}
                      <div className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {formatPrice(plan.price, plan.currency)}
                        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                          /年
                        </span>
                      </div>
                      <button
                        onClick={() => handleCheckout(plan.id)}
                        disabled={!email || checkoutLoading !== null}
                        className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {checkoutLoading === plan.id
                          ? 'Processing...'
                          : 'Subscribe'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
