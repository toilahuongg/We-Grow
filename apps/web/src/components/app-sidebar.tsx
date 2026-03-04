"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Settings, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { mainNav } from "@/lib/navigation";
import { authClient } from "@/lib/auth-client";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#059669] text-white shadow-lg shadow-emerald-500/25">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 512 512">
          <path d="M246 400 C246 340 250 280 256 240 C262 280 266 340 266 400Z" />
          <path d="M260 268 C290 230 345 185 395 155 C380 215 315 268 262 275Z" />
          <path d="M252 228 C222 190 167 145 117 115 C132 175 197 228 250 235Z" />
        </svg>
      </div>
      <span className="font-display text-lg font-bold">we-grow</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="flex flex-col gap-1">
      {mainNav.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href as any}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {isActive && (
              <>
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#ff6b6b]/15 via-[#ffa06b]/10 to-[#4ecdc4]/15" />
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-[#ff6b6b] to-[#4ecdc4]" />
              </>
            )}
            <Icon className={cn("relative h-4 w-4", isActive ? item.color : "")} />
            <span className="relative">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserSection() {
  const router = useRouter();
  const t = useTranslations("nav");
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return (
      <div className="flex items-center gap-3 px-3 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-1 h-4 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const userInitials =
    session.user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <div className="border-t border-border px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-xs font-bold text-white overflow-hidden">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || ""}
              className="h-full w-full object-cover"
            />
          ) : (
            userInitials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{session.user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-400"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/");
                },
              },
            });
          }}
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">{t("signOut")}</span>
        </Button>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const isSettingsActive = pathname === "/settings";

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks onNavigate={onNavigate} />
      </div>

      {/* Bottom section */}
      <div className="px-3 pb-2">
        <div className="flex flex-col gap-1">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isSettingsActive
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {isSettingsActive && (
              <>
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#ff6b6b]/15 via-[#ffa06b]/10 to-[#4ecdc4]/15" />
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-[#ff6b6b] to-[#4ecdc4]" />
              </>
            )}
            <Settings className={cn("relative h-4 w-4", isSettingsActive ? "text-[#a78bfa]" : "")} />
            <span className="relative">{t("settings")}</span>
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground">
            <ModeToggle />
            <LanguageSwitcher />
            <span>{t("theme")}</span>
          </div>
        </div>
      </div>

      {/* User */}
      <UserSection />
    </div>
  );
}

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-svh">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="hidden md:flex w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-background">
          <SidebarContent />
        </aside>
      )}

      {/* Mobile top bar + sheet */}
      {isMobile && (
        <>
          <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t("openMenu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Logo />
          </div>
        </>
      )}

      {/* Main content */}
      <main
        className={cn(
          "flex-1 overflow-y-auto",
          isMobile && "pt-14",
        )}
      >
        {children}
      </main>
    </div>
  );
}
