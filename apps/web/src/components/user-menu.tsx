import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, User, LogOut, Settings, Trophy } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!session) {
    return (
      <Link href="/login">
        <Button variant="ghost" size="sm" className="rounded-full">
          Sign In
        </Button>
      </Link>
    );
  }

  const userInitials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 gap-2 rounded-full border border-white/10 bg-white/5 px-3 hover:bg-white/10"
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-xs font-bold text-white">
          {userInitials}
        </div>
        <span className="hidden sm:inline text-sm font-medium">
          {session.user.name?.split(" ")[0]}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-56 border-white/10">
        <div className="border-b border-white/10 px-2 pb-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-sm font-bold text-white">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">{session.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-3 cursor-pointer rounded-xl transition-colors hover:bg-white/10"
            onClick={() => router.push("/groups")}
          >
            <User className="h-4 w-4 text-[#ff6b6b]" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 cursor-pointer rounded-xl transition-colors hover:bg-white/10"
            onClick={() => router.push("/achievements" as any)}
          >
            <Trophy className="h-4 w-4 text-[#ffa06b]" />
            <span>Achievements</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 cursor-pointer rounded-xl transition-colors hover:bg-white/10"
            onClick={() => router.push("/settings" as any)}
          >
            <Settings className="h-4 w-4 text-[#4ecdc4]" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="gap-3 cursor-pointer rounded-xl text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
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
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
