import { Users, Zap, Bell, Target, Award, LayoutDashboard, BookOpen, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  color: string;
}

export const mainNav: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, color: "text-[#4ecdc4]" },
  { href: "/groups", labelKey: "myGroups", icon: Users, color: "text-[#ff6b6b]" },
  { href: "/habits", labelKey: "myHabits", icon: Target, color: "text-[#a78bfa]" },
  { href: "/journal", labelKey: "journal", icon: BookOpen, color: "text-[#ffa06b]" },
  { href: "/analytics", labelKey: "analytics", icon: BarChart3, color: "text-[#f472b6]" },
  { href: "/badges", labelKey: "badges", icon: Award, color: "text-[#f472b6]" },
  { href: "/xp-history", labelKey: "xpHistory", icon: Zap, color: "text-[#ffa06b]" },
  { href: "/reminders", labelKey: "reminders", icon: Bell, color: "text-[#4ecdc4]" },
];
