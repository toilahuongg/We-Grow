import { Users, Zap, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const mainNav: NavItem[] = [
  { href: "/groups", label: "My Groups", icon: Users, color: "text-[#ff6b6b]" },
  { href: "/xp-history", label: "XP History", icon: Zap, color: "text-[#ffa06b]" },
  { href: "/reminders", label: "Reminders", icon: Bell, color: "text-[#4ecdc4]" },
];
