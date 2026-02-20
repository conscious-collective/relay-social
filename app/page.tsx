import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📡</span>
          <span className="font-bold text-lg">Relay Social</span>
        </div>
        <div className="flex gap-6 text-sm">
          <Link href="/" className="text-zinc-300 hover:text-white">Home</Link>
          <Link href="/api/reference" className="text-zinc-300 hover:text-white">API Docs</Link>
          <Link href="/login" className="text-zinc-300 hover:text-white">Login</Link>
          <Link href="/signup" className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 font-medium">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Schedule social media. Ship faster.
        </h1>
        <p className="text-xl text-zinc-400 mb-8">
          The REST API built for agents and developers.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-white text-black px-6 py-3 rounded-lg hover:bg-zinc-200 font-semibold"
          >
            Get started free →
          </Link>
          <Link
            href="/api/reference"
            className="border border-zinc-700 text-zinc-300 px-6 py-3 rounded-lg hover:border-zinc-500 font-semibold"
          >
            API Reference →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="text-3xl mb-4">📡</div>
            <h3 className="text-lg font-semibold mb-2">REST API</h3>
            <p className="text-zinc-400 text-sm">
              Full CRUD for posts, accounts, and analytics. Works with any HTTP client. Simple, predictable responses.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">Agent-native</h3>
            <p className="text-zinc-400 text-sm">
              Designed for AI agents. JWT auth, structured JSON, predictable responses. Perfect for automation.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="text-3xl mb-4">📷</div>
            <h3 className="text-lg font-semibold mb-2">Instagram Publishing</h3>
            <p className="text-zinc-400 text-sm">
              Schedule and publish posts to Instagram via the API. Connect your account and start scheduling.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Quick Start</h2>
        <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 overflow-x-auto text-sm font-mono text-zinc-300">
{`# Sign up
curl -X POST https://relay-social.pages.dev/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"yourpassword"}'

# Schedule a post
curl -X POST https://relay-social.pages.dev/api/posts \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"account_id":"acc_xxx","content":"Hello world!","scheduled_at":"2026-02-20T09:00:00Z"}'`}
        </pre>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm">Built by Bodmashverse</p>
          <div className="flex gap-6 text-sm">
            <Link href="/api/reference" className="text-zinc-400 hover:text-white">API Docs</Link>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white">Dashboard</Link>
            <a
              href="https://github.com/billo-rani-bai/relay-social"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
