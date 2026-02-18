"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApi, useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const api = useApi();
  const [stats, setStats] = useState({ accounts: 0, scheduled: 0, published: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) loadStats();
  }, [authLoading]);

  const loadStats = async () => {
    try {
      const [accountsData, postsData] = await Promise.all([
        api("/api/accounts"),
        api("/api/posts"),
      ]);
      const posts = postsData.posts || [];
      setStats({
        accounts: (accountsData.accounts || []).length,
        scheduled: posts.filter((p: { status: string }) => p.status === "scheduled").length,
        published: posts.filter((p: { status: string }) => p.status === "published").length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Accounts</p>
          <p className="text-2xl font-bold">{stats.accounts}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Scheduled</p>
          <p className="text-2xl font-bold">{stats.scheduled}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Published</p>
          <p className="text-2xl font-bold">{stats.published}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Plan</p>
          <p className="text-2xl font-bold capitalize">{user?.tier || "Free"}</p>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/posts" className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition">
            <h3 className="font-semibold mb-1">📝 Posts</h3>
            <p className="text-sm text-zinc-400">Create, schedule, and manage posts</p>
          </Link>
          <Link href="/accounts" className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition">
            <h3 className="font-semibold mb-1">🔗 Accounts</h3>
            <p className="text-sm text-zinc-400">Connect your social accounts</p>
          </Link>
          <Link href="/profile" className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition">
            <h3 className="font-semibold mb-1">🔑 API Keys</h3>
            <p className="text-sm text-zinc-400">Manage your API keys</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
