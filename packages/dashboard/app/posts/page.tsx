"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

interface Post {
  id: string;
  accountId: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) {
      console.error("Failed to fetch posts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createPost() {
    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: newAccountId,
          content: newContent,
          scheduled_at: newScheduledAt || undefined,
        }),
      });
      if (res.ok) {
        setNewContent("");
        setNewAccountId("");
        setNewScheduledAt("");
        setShowCreate(false);
        fetchPosts();
      }
    } catch (e) {
      console.error("Failed to create post:", e);
    }
  }

  async function deletePost(id: string) {
    try {
      await fetch(`${API_URL}/api/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      fetchPosts();
    } catch (e) {
      console.error("Failed to delete post:", e);
    }
  }

  const statusColor: Record<string, string> = {
    draft: "bg-zinc-700",
    scheduled: "bg-blue-600",
    publishing: "bg-yellow-600",
    published: "bg-green-600",
    failed: "bg-red-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Posts</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition"
        >
          + New Post
        </button>
      </div>

      {showCreate && (
        <div className="border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Create Post</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Account ID (e.g. acc_xxx)"
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
            />
            <textarea
              placeholder="What's on your mind? ✨"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={createPost}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500"
              >
                {newScheduledAt ? "Schedule" : "Save Draft"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="text-zinc-400 px-4 py-2 text-sm hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="text-zinc-500 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-lg">No posts yet</p>
          <p className="text-sm mt-1">Create your first post or use the API</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border border-zinc-800 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusColor[post.status] || "bg-zinc-700"}`}
                  >
                    {post.status}
                  </span>
                  <span className="text-xs text-zinc-500">{post.id}</span>
                </div>
                <p className="text-sm">{post.content}</p>
                {post.scheduledAt && (
                  <p className="text-xs text-zinc-500 mt-1">
                    📅 {new Date(post.scheduledAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => deletePost(post.id)}
                className="text-zinc-500 hover:text-red-400 text-sm ml-4"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
