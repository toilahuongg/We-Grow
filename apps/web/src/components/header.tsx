"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import UserMenu from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";

export default function Header() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  const publicLinks = [
    { href: "/", label: "Home" },
  ] as const;

  const authenticatedLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/habits", label: "Habits" },
    { href: "/groups", label: "Groups" },
    { href: "/leaderboard", label: "Leaderboard" },
  ] as const;

  const navLinks = session?.user ? authenticatedLinks : publicLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-[70px] max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white shadow-lg shadow-[#ff6b6b]/25">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold">we-grow</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all ${isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[#ff6b6b]/20 via-[#ffa06b]/20 to-[#4ecdc4]/20" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <ModeToggle />

          {!isPending && (
            <>
              {session?.user ? (
                <UserMenu />
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white shadow-md shadow-[#ff6b6b]/20 hover:shadow-lg hover:shadow-[#ff6b6b]/30"
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
