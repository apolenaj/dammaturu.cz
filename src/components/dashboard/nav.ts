import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { DASHBOARD_PATH_PREFIXES } from "@/lib/dashboard-paths";

export type DashboardNavItem = {
  href: (typeof DASHBOARD_PATH_PREFIXES)[number];
  label: string;
  icon: LucideIcon;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/prehled", label: "Přehled", icon: LayoutDashboard },
  { href: "/uceni", label: "Učení", icon: GraduationCap },
  { href: "/moje-chyby", label: "Moje chyby", icon: AlertCircle },
  { href: "/materialy", label: "Materiály", icon: BookOpen },
  { href: "/plan", label: "Plán", icon: CalendarDays },
  { href: "/statistiky", label: "Statistiky", icon: BarChart3 },
];
