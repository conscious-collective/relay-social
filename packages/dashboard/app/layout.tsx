import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay Social",
  description: "Social media scheduling for machines and humans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <span className="font-bold text-lg">Relay Social</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-400">
            <a href="/" className="hover:text-white">Dashboard</a>
            <a href="/posts" className="hover:text-white">Posts</a>
            <a href="/accounts" className="hover:text-white">Accounts</a>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
