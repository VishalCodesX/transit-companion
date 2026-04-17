import { Link, useLocation } from "react-router-dom";
import { Bus, LayoutDashboard, Map, Truck, Users, History, Bell, LogOut, Settings } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { useAuth } from "@/context/AuthContext";
import { useAllBuses } from "@/hooks/useBuses";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/fleet", label: "Fleet Map", icon: Map },
  { to: "/admin/buses", label: "Buses", icon: Truck },
  { to: "/admin/drivers", label: "Drivers", icon: Users },
  { to: "/admin/history", label: "History", icon: History },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

export function AdminSidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { buses } = useAllBuses();
  const onlineCount = buses.filter((b) => b.status === "active").length;

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 glass border-r border-border flex flex-col">
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
          <Bus className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">TransitIQ</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Console</p>
        </div>
      </div>

      {user && (
        <div className="mx-3 my-2 p-3 rounded-lg bg-surface-elevated/60 border border-border flex items-center gap-3">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <Badge variant="info" className="mt-0.5">Admin</Badge>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                "flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent",
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              {label === "Fleet Map" && onlineCount > 0 && (
                <Badge variant="success">{onlineCount}</Badge>
              )}
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
