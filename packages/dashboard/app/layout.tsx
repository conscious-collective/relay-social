"use client";

import { AuthProvider, useAuth } from "@/lib/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavBar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;
  
  // Don't show nav on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">📡</span>
        <span className="font-bold text-lg">Relay Social</span>
      </div>
      
      <div className="flex gap-6 text-sm text-zinc-400">
        <Link href="/" className={`hover:text-white ${pathname === "/" ? "text-white" : ""}`}>Dashboard</Link>
        <Link href="/posts" className={`hover:text-white ${pathname === "/posts" ? "text-white" : ""}`}>Posts</Link>
        <Link href="/accounts" className={`hover:text-white ${pathname === "/accounts" ? "text-white" : ""}`}>Accounts</Link>
        <Link href="/profile" className={`hover:text-white ${pathname === "/profile" ? "text-white" : ""}`}>Profile</Link>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-zinc-400">{user.email}</span>
            <button
              onClick={logout}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  // Allow auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  // Require auth for everything else
  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return <>{children}</>;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </AuthGuard>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <html lang="en" className="dark">
        <body className="bg-zinc-950 text-zinc-100 min-h-screen">
          <LayoutContent>{children}</LayoutContent>
        </body>
      </html>
    </AuthProvider>
  );
}
