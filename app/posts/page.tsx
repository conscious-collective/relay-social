"use client";

import { useState, useEffect } from "react";
import { useApi, useAuth } from "@/lib/auth";

interface Post {
  id: string;
  accountId: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

interface Account {
  id: string;
  name: string;
}

export default function PostsPage() {
  const api = useApi();
  const { loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading]);

  const loadData = async () => {
    try {
      const [postsData, accountsData] = await Promise.all([
        api("/api/posts"),
        api("/api/accounts"),
      ]);
      setPosts(postsData.posts || []);
      setAccounts(accountsData.accounts || []);
      if (accountsData.accounts?.length) setNewAccountId(accountsData.accounts[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          account_id: newAccountId,
          content: newContent,
          scheduled_at: newScheduledAt || undefined,
        }),
      });
      setNewContent("");
      setNewScheduledAt("");
      setShowCreate(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    try {
      await api(`/api/posts/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading || authLoading) return <div className="text-zinc-400">Loading...</div>;

  const statusColors: Record<string, string> = {
    draft: "text-zinc-400",
    scheduled: "text-blue-400",
    published: "text-green-400",
    failed: "text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Posts</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200"
        >
          {showCreate ? "Cancel" : "New Post"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-2 rounded-lg mb-4">{error}</div>
      )}

      {showCreate && (
        <form onSubmit={createPost} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Account</label>
            <select
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Content</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 h-24"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
            />
          </div>
          <button type="submit" className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200">
            Schedule Post
          </button>
        </form>
      )}

      {posts.length === 0 ? (
        <p className="text-zinc-500">No posts yet</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between">
              <div className="flex-1">
                <p className="whitespace-pre-wrap">{post.content}</p>
                <div className="flex gap-4 mt-2 text-sm text-zinc-400">
                  <span className={statusColors[post.status]}>{post.status}</span>
                  {post.scheduledAt && <span>Scheduled: {new Date(post.scheduledAt).toLocaleString()}</span>}
                  {post.publishedAt && <span>Published: {new Date(post.publishedAt).toLocaleString()}</span>}
                </div>
              </div>
              <button onClick={() => deletePost(post.id)} className="text-red-400 hover:text-red-300 text-sm ml-4">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
