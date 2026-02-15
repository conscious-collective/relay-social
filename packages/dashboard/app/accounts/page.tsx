"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

interface Account {
  id: string;
  platform: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  createdAt: string;
}

const platformEmoji: Record<string, string> = {
  instagram: "📸",
  twitter: "🐦",
  facebook: "👤",
  tiktok: "🎵",
  linkedin: "💼",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch(`${API_URL}/api/accounts`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error("Failed to fetch accounts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Disconnect this account?")) return;
    try {
      await fetch(`${API_URL}/api/accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      fetchAccounts();
    } catch (e) {
      console.error("Failed to delete account:", e);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p className="text-sm text-zinc-500">OAuth coming soon — use API for now</p>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : accounts.length === 0 ? (
        <div className="text-zinc-500 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-lg">No accounts connected</p>
          <p className="text-sm mt-1">Use the API to connect accounts</p>
          <pre className="mt-4 text-xs bg-zinc-900 p-4 rounded-lg text-left max-w-lg mx-auto overflow-x-auto">
{`curl -X POST /api/accounts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"platform":"instagram","name":"My Brand","handle":"@mybrand","access_token":"..."}'`}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="border border-zinc-800 rounded-lg p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">
                  {platformEmoji[account.platform] || "🌐"}
                </span>
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-zinc-400">@{account.handle}</p>
                  <p className="text-xs text-zinc-600 mt-1">{account.platform} · {account.id}</p>
                </div>
              </div>
              <button
                onClick={() => deleteAccount(account.id)}
                className="text-zinc-500 hover:text-red-400 text-sm"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
