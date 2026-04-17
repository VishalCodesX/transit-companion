import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="sticky top-0 z-50 bg-warning/15 border-b border-warning/30 text-warning text-xs py-1.5 px-4 flex items-center justify-center gap-2 backdrop-blur">
      <WifiOff className="h-3.5 w-3.5" />
      You're offline — showing last known data
    </div>
  );
}
