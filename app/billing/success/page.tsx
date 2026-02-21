"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/auth";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkoutId = searchParams.get("checkout_id");
    const plan = searchParams.get("plan");

    if (!checkoutId || !plan) {
      setError("Missing checkout information");
      setLoading(false);
      return;
    }

    // Complete the checkout
    const completeCheckout = async () => {
      try {
        await api(`/api/billing/checkout?action=complete&checkout_id=${checkoutId}`);
        setLoading(false);
      } catch (err) {
        setError("Failed to complete checkout");
        setLoading(false);
      }
    };

    completeCheckout();
  }, [searchParams, api]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🎉</div>
          <p className="text-zinc-400">Setting up your Pro plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">❌</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/billing")}
            className="text-white underline"
          >
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-2">Welcome to Pro!</h1>
        <p className="text-zinc-400 mb-6">
          Your account has been upgraded. Enjoy unlimited posts, accounts, and more!
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
