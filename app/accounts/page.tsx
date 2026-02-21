"use client";

import { useState, useEffect } from "react";
import { useApi, useAuth } from "@/lib/auth";
import { useSearchParams } from "next/navigation";

interface Account {
  id: string;
  platform: string;
  name: string;
  handle: string;
}

export default function AccountsPage() {
  const api = useApi();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [success, setSuccess] = useState(searchParams.get("success") || "");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!authLoading) loadAccounts();
  }, [authLoading]);

  const loadAccounts = async () => {
    try {
      const data = await api("/api/accounts");
      setAccounts(data.accounts || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const connectInstagram = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConnecting(true);
    try {
      await api("/api/accounts/connect/instagram", {
        method: "POST",
        body: JSON.stringify({ access_token: accessToken, instagram_username: igUsername }),
      });
      setAccessToken("");
      setIgUsername("");
      setShowConnect(false);
      loadAccounts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectAccount = async (id: string) => {
    if (!confirm("Disconnect this account?")) return;
    try {
      await api(`/api/accounts/${id}`, { method: "DELETE" });
      loadAccounts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  if (loading || authLoading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Connected Accounts</h1>
        <button
          onClick={() => setShowConnect(!showConnect)}
          className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200"
        >
          {showConnect ? "Cancel" : "Connect Account"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-2 rounded-lg mb-4">{error}</div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-800 text-green-400 px-4 py-2 rounded-lg mb-4">Instagram connected successfully!</div>
      )}

      {showConnect && (
        <div className="mb-6">
          {/* OAuth Connect Button */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-4">Quick Connect</h3>
            <p className="text-sm text-zinc-400 mb-4">Connect with Instagram via OAuth (recommended)</p>
            {user && (
              <a
                href={`/api/auth/connect/instagram?userId=${user.id}`}
                className="inline-block bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90"
              >
                Connect with Instagram
              </a>
            )}
          </div>

          {/* Manual Token Form */}
          <p className="text-sm text-zinc-500 mb-2">Or connect manually with access token:</p>
          <form onSubmit={connectInstagram} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="font-semibold mb-4">Manual Connect</h3>
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Instagram Username</label>
            <input
              type="text"
              value={igUsername}
              onChange={(e) => setIgUsername(e.target.value)}
              placeholder="your_username"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Access Token</label>
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste your Instagram access token"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 font-mono text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={connecting}
            className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </form>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-12 border border-zinc-800 rounded-lg">
          <p className="text-zinc-400 mb-4">No accounts connected yet</p>
          <button onClick={() => setShowConnect(true)} className="text-white underline">
            Connect your first account
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{account.platform === "instagram" ? "📷" : "📱"}</span>
                <div>
                  <p className="font-medium">@{account.name}</p>
                  <p className="text-sm text-zinc-400">{account.platform}</p>
                </div>
              </div>
              <button onClick={() => disconnectAccount(account.id)} className="text-red-400 hover:text-red-300 text-sm">
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
