"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/lib/auth";

interface ApiKey {
  id: string;
  name: string;
  key: string;
}

export default function ProfilePage() {
  const api = useApi();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const data = await api("/api/auth/keys");
      setKeys(data.keys || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const key = await api("/api/auth/keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName || "API Key" }),
      });
      setNewKey(key.key);
      setNewKeyName("");
      loadKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Delete this API key?")) return;
    try {
      await api(`/api/auth/keys/${id}`, { method: "DELETE" });
      loadKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Profile & API Keys</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {newKey && (
        <div className="bg-green-900/30 border border-green-800 text-green-400 px-4 py-2 rounded-lg mb-4">
          <p className="font-semibold mb-1">New API Key Created!</p>
          <p className="text-sm font-mono break-all">{newKey}</p>
          <p className="text-xs mt-1">Copy it now - you won&apos;t see it again!</p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API Keys</h2>
        
        <form onSubmit={createKey} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (optional)"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Key"}
          </button>
        </form>

        {keys.length === 0 ? (
          <p className="text-zinc-500">No API keys yet</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-sm text-zinc-400 font-mono">{key.key.slice(0, 20)}...</p>
                </div>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-sm">
          <p className="text-zinc-400"># Schedule a post</p>
          <p>curl -X POST http://localhost:3001/api/posts \</p>
          <p className="pl-4">-H &quot;Authorization: Bearer YOUR_API_KEY&quot; \</p>
          <p className="pl-4">-d &#39;&#123;&quot;account_id&quot;:&quot;...&quot;,&quot;content&quot;:&quot;Hello!&quot;&#125;&#39;</p>
        </div>
      </div>
    </div>
  );
}
