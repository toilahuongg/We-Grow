import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-mesh bg-grid-pattern px-4">
      <div className="animate-scale-in text-center">
        {/* 404 Number */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className="font-display text-8xl font-bold text-[#ff6b6b]">4</div>
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-5xl shadow-2xl shadow-[#ff6b6b]/25">
            0
          </div>
          <div className="font-display text-8xl font-bold text-[#4ecdc4]">4</div>
        </div>

        {/* Message */}
        <h1 className="mb-4 font-display text-3xl font-bold">
          Page Not <span className="gradient-text">Found</span>
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track!
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button
              size="lg"
              className="rounded-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-base font-semibold text-white shadow-lg shadow-[#ff6b6b]/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ff6b6b]/40"
            >
              Go Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full border border-white/10 bg-white/5 text-base font-semibold transition-all hover:bg-white/10 hover:scale-[1.02]"
            >
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Floating Elements */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="animate-float absolute top-1/4 left-1/4 h-20 w-20 rounded-full bg-gradient-to-br from-[#ff6b6b]/20 to-transparent blur-2xl" />
          <div className="animate-float absolute bottom-1/4 right-1/4 h-32 w-32 rounded-full bg-gradient-to-br from-[#4ecdc4]/20 to-transparent blur-2xl" style={{ animationDelay: "2s" }} />
          <div className="animate-float absolute top-1/2 right-1/3 h-16 w-16 rounded-full bg-gradient-to-br from-[#ffa06b]/20 to-transparent blur-2xl" style={{ animationDelay: "4s" }} />
        </div>
      </div>
    </div>
  );
}
