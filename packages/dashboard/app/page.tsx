const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getOverview() {
  try {
    const res = await fetch(`${API_URL}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${process.env.API_KEY || ""}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const overview = await getOverview();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Accounts" value={overview.accounts} />
          <StatCard label="Published" value={overview.posts?.published || 0} />
          <StatCard label="Scheduled" value={overview.posts?.scheduled || 0} />
          <StatCard label="Drafts" value={overview.posts?.drafts || 0} />
          <StatCard label="Total Likes" value={overview.engagement?.likes || 0} />
          <StatCard label="Total Reach" value={overview.engagement?.reach || 0} />
          <StatCard label="Comments" value={overview.engagement?.comments || 0} />
          <StatCard label="Shares" value={overview.engagement?.shares || 0} />
        </div>
      ) : (
        <div className="text-zinc-500 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-lg mb-2">Connect the API to see your dashboard</p>
          <p className="text-sm">
            Set <code className="bg-zinc-800 px-2 py-0.5 rounded">NEXT_PUBLIC_API_URL</code> and{" "}
            <code className="bg-zinc-800 px-2 py-0.5 rounded">API_KEY</code> in your environment
          </p>
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/posts"
            className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition"
          >
            <h3 className="font-semibold mb-1">📝 Posts</h3>
            <p className="text-sm text-zinc-400">Create, schedule, and manage posts</p>
          </a>
          <a
            href="/accounts"
            className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition"
          >
            <h3 className="font-semibold mb-1">🔗 Accounts</h3>
            <p className="text-sm text-zinc-400">Connect your social accounts</p>
          </a>
          <div className="border border-zinc-800 rounded-lg p-6 opacity-50">
            <h3 className="font-semibold mb-1">📊 Analytics</h3>
            <p className="text-sm text-zinc-400">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
