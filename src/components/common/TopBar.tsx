import { Bus, Bell, LogOut } from "lucide-react";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import type { Role } from "@/utils/constants";

interface Props {
  roleLabel: string;
  notificationsFor?: Role;
}

export function TopBar({ roleLabel, notificationsFor }: Props) {
  const { user, signOut } = useAuth();
  const { items } = useNotifications(notificationsFor);
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <header className="glass border-b border-border sticky top-0 z-30">
      <div className="max-w-[1500px] mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
            <Bus className="h-4 w-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-tight leading-none">TransitIQ</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Smart Tracking</p>
          </div>
          <Badge variant="info" className="ml-2">{roleLabel}</Badge>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="relative h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </button>
          {user && (
            <div className="flex items-center gap-2">
              <Avatar name={user.name} size="sm" />
              <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="hidden sm:inline-flex">Sign out</Button>
          <button
            onClick={() => signOut()}
            className="sm:hidden h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
