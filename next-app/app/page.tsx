'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (productId: string) => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setCheckoutLoading(productId);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
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

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Stripe Payment Test
          </h1>
          <p className="mb-6 text-lg text-zinc-600 dark:text-zinc-400">
            Test Stripe integration with sample products
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/subscriptions"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              View Subscription Plans →
            </Link>
          </div>
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
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-zinc-900">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              No products available. Add some products to the database to get started.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              You can add products using Prisma Studio or by creating a seed script.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-zinc-900"
              >
                <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {product.name}
                </h2>
                {product.description && (
                  <p className="mb-4 flex-grow text-zinc-600 dark:text-zinc-400">
                    {product.description}
                  </p>
                )}
                <div className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatPrice(product.price, product.currency)}
                </div>
                <button
                  onClick={() => handleCheckout(product.id)}
                  disabled={!email || checkoutLoading !== null}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {checkoutLoading === product.id ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
