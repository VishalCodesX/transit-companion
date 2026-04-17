import { Link, useLocation } from "react-router-dom";
import { Bus, LayoutDashboard, History, Bell, LogOut } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { useAuth } from "@/context/AuthContext";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const DRIVER_NAV: NavItem[] = [
  { to: "/driver", label: "Dashboard", icon: LayoutDashboard },
  { to: "/driver/history", label: "Trip History", icon: History },
  { to: "/driver/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({ navItems = DRIVER_NAV, roleLabel = "Driver" }: { navItems?: NavItem[]; roleLabel?: string }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 glass border-r border-border flex flex-col">
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
          <Bus className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">TransitIQ</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Smart Tracking</p>
        </div>
      </div>

      {user && (
        <div className="mx-3 my-2 p-3 rounded-lg bg-surface-elevated/60 border border-border flex items-center gap-3">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <Badge variant="info" className="mt-0.5">{roleLabel}</Badge>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Button variant="ghost" size="sm" onClick={() => signOut()} leftIcon={<LogOut className="h-4 w-4" />} className="w-full justify-start">
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
