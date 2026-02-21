"use client";

import { useState, useEffect } from "react";
import { useApi, useAuth } from "@/lib/auth";
import { useSearchParams } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  limits: {
    accounts: number;
    postsPerMonth: number;
    webhooks: number;
  };
}

export default function BillingPage() {
  const api = useApi();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentTier, setCurrentTier] = useState("free");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [success, setSuccess] = useState(searchParams.get("success") === "true");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await api("/api/billing/plans");
      setPlans(data.plans);
      setCurrentTier(data.currentTier);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const upgradeToPro = async () => {
    setUpgrading(true);
    try {
      const data = await api("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: "pro" }),
      });
      
      // For MVP: redirect to mock success page
      window.location.href = data.paymentUrl;
    } catch (err) {
      console.error(err);
      setUpgrading(false);
    }
  };

  if (loading || authLoading) {
    return <div className="text-zinc-400">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Billing & Plans</h1>

      {success && (
        <div className="bg-green-900/30 border border-green-800 text-green-400 px-4 py-3 rounded-lg mb-6">
          ✅ Successfully upgraded to Pro! Thank you for your support.
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Current Plan</p>
            <h2 className="text-2xl font-bold capitalize">{currentTier}</h2>
          </div>
          {currentTier === "free" && (
            <button
              onClick={upgradeToPro}
              disabled={upgrading}
              className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50"
            >
              {upgrading ? "Upgrading..." : "Upgrade to Pro"}
            </button>
          )}
          {currentTier === "pro" && (
            <span className="text-green-400">✓ Pro Member</span>
          )}
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-xl font-semibold mb-4">Plans</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-lg p-6 ${
              plan.id === currentTier
                ? "border-green-600 bg-zinc-900"
                : plan.id === "pro"
                ? "border-purple-600 bg-zinc-900"
                : "border-zinc-700 bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{plan.name}</h3>
              {plan.id === currentTier && (
                <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">
                  Current
                </span>
              )}
            </div>
            <p className="text-3xl font-bold mb-4">
              ${plan.price}
              <span className="text-sm font-normal text-zinc-400">/{plan.interval}</span>
            </p>
            <ul className="space-y-2 text-sm text-zinc-400 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i}>✓ {feature}</li>
              ))}
            </ul>
            {plan.id === "pro" && currentTier !== "pro" && (
              <button
                onClick={upgradeToPro}
                disabled={upgrading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {upgrading ? "Processing..." : "Get Pro"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Billing Info */}
      <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <p className="text-sm text-zinc-400">
          Payments powered by DoDo. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
