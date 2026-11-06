import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Menu, X, LogOut, Settings, Shield, ChevronsUpDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { SIDEBAR_LINKS, getSidebarOrder } from "@/lib/sidebarOrder";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SECTIONS: { label: string; keys: string[] }[] = [
  { label: "Navegação", keys: ["/", "/pomodoro", "/calendar"] },
  { label: "Estudos", keys: ["/subjects", "/courses", "/sessions", "/languages"] },
  { label: "Objetivos", keys: ["/goals", "/learning-paths"] },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

export default function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(() => getSidebarOrder());

  useEffect(() => {
    const onChange = () => setOrder(getSidebarOrder());
    window.addEventListener("sidebar-order-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("sidebar-order-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";
  const initial = displayName.charAt(0).toUpperCase();

  // Build sections respecting the user's saved order within each group
  const sections = SECTIONS.map((sec) => {
    const keysInOrder = order.filter((k) => sec.keys.includes(k));
    // include any keys the user hasn't got yet
    for (const k of sec.keys) if (!keysInOrder.includes(k)) keysInOrder.push(k);
    return {
      label: sec.label,
      links: keysInOrder.map((k) => SIDEBAR_LINKS[k]).filter(Boolean),
    };
  });

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="app-sidebar"
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        id="app-sidebar"
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 flex flex-col transition-transform duration-200 lg:translate-x-0 motion-reduce:transition-none",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-6">
          <Link to="/" onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg", focusRing)}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
              <BookOpen className="w-[18px] h-[18px]" strokeWidth={2.25} aria-hidden />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-sidebar-foreground">
              MetaStudy
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
          {sections.map((section) => (
            <div key={section.label}>
              <h2 className="px-3 mb-1.5 font-sans text-xs font-medium text-sidebar-foreground/45">
                {section.label}
              </h2>
              <ul className="space-y-0.5">
                {section.links.map((link) => {
                  const active = pathname === link.to;
                  const Icon = link.icon;
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                          focusRing,
                          active
                            ? "bg-sidebar-primary/15 text-sidebar-foreground"
                            : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-white/[0.05]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-[18px] h-[18px] shrink-0 transition-colors duration-150",
                            active
                              ? "text-sidebar-primary"
                              : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground"
                          )}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <span className="truncate">{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05] data-[state=open]:bg-white/[0.05]",
                focusRing,
              )}
              aria-label={`Conta de ${displayName}`}
            >
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 bg-sidebar-primary/15 text-sidebar-primary">
                {initial}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
                  {displayName}
                </span>
                <span className="block text-xs text-sidebar-foreground/50 truncate leading-tight mt-0.5">
                  {user?.email}
                </span>
              </span>
              <ChevronsUpDown className="w-4 h-4 shrink-0 text-sidebar-foreground/45" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
              <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" onClick={() => setOpen(false)}>
                  <Settings className="w-4 h-4" aria-hidden />
                  Configurações
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" onClick={() => setOpen(false)}>
                    <Shield className="w-4 h-4" aria-hidden />
                    Painel admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="w-4 h-4" aria-hidden />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
