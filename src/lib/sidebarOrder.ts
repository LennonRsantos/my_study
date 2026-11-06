import { LayoutDashboard, CalendarDays, CalendarRange, BookOpen, BarChart3, Trophy, Timer, GraduationCap, MapPin, Languages, LucideIcon } from "lucide-react";

export interface SidebarLink {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const SIDEBAR_LINKS: Record<string, SidebarLink> = {
  "/": { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  "/calendar": { to: "/calendar", icon: CalendarDays, label: "Calendário" },
  "/sessions": { to: "/sessions", icon: BookOpen, label: "Sessões" },
  "/pomodoro": { to: "/pomodoro", icon: Timer, label: "Pomodoro" },
  "/subjects": { to: "/subjects", icon: BarChart3, label: "Matérias" },
  "/courses": { to: "/courses", icon: GraduationCap, label: "Cursos" },
  "/goals": { to: "/goals", icon: Trophy, label: "Metas" },
  "/learning-paths": { to: "/learning-paths", icon: MapPin, label: "Trilhas" },
  "/languages": { to: "/languages", icon: Languages, label: "Linguagens" },
  "/planejador": { to: "/planejador", icon: CalendarRange, label: "Planejador" },
};

export const DEFAULT_ORDER: string[] = [
  "/", "/calendar", "/sessions", "/pomodoro", "/subjects",
  "/courses", "/goals", "/learning-paths", "/languages", "/planejador",
];

const KEY = "sidebar_order_v1";

export function getSidebarOrder(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ORDER;
    const arr: string[] = JSON.parse(raw);
    // Keep only known keys, then append any missing defaults (for new modules)
    const filtered = arr.filter((k) => SIDEBAR_LINKS[k]);
    for (const k of DEFAULT_ORDER) if (!filtered.includes(k)) filtered.push(k);
    return filtered;
  } catch {
    return DEFAULT_ORDER;
  }
}

export function setSidebarOrder(order: string[]) {
  localStorage.setItem(KEY, JSON.stringify(order));
  window.dispatchEvent(new Event("sidebar-order-changed"));
}

export function resetSidebarOrder() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("sidebar-order-changed"));
}
