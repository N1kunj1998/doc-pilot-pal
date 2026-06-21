import { Link } from "@tanstack/react-router";
import { MessageSquare, FileText, Users, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof MessageSquare; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/team", label: "Team", icon: Users, adminOnly: true },
  { to: "/admin", label: "Admin", icon: LayoutDashboard, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({ pathname, role }: { pathname: string; role?: string }) {
  const items = NAV.filter((n) => !n.adminOnly || role === "Admin");

  return (
    <nav className="flex md:hidden h-16 shrink-0 items-stretch border-t bg-sidebar pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
              active ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
