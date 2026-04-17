import { Bus, MapPin, Navigation } from "lucide-react";
import clsx from "clsx";

interface Props {
  lat: number | null;
  lng: number | null;
  heading?: number;
  busNumber?: string;
  status?: "active" | "idle" | "offline";
  className?: string;
}

/**
 * Stubbed map view — placeholder until Google Maps API key is provided.
 * Renders a stylized dark grid with a centered bus marker.
 */
export function MapView({ lat, lng, heading = 0, busNumber, status = "idle", className }: Props) {
  const hasFix = lat != null && lng != null;
  const statusColor =
    status === "active" ? "text-success" : status === "idle" ? "text-warning" : "text-muted-foreground";

  return (
    <div
      className={clsx(
        "relative w-full h-full overflow-hidden rounded-xl border border-border bg-surface",
        className,
      )}
    >
      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      {/* Soft glow ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Marker */}
      <div className="absolute inset-0 flex items-center justify-center">
        {hasFix ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="relative">
              <div className={clsx("absolute inset-0 rounded-full blur-xl", status === "active" ? "bg-success/40" : "bg-primary/30")} />
              <div
                className={clsx(
                  "relative flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated ring-2 transition-transform",
                  status === "active" ? "ring-success" : "ring-primary",
                )}
                style={{ transform: `rotate(${heading}deg)` }}
              >
                <Navigation className={clsx("h-6 w-6", statusColor)} fill="currentColor" />
              </div>
            </div>
            {busNumber && (
              <div className="glass rounded-md px-3 py-1.5 text-xs font-medium font-mono">
                {busNumber}
              </div>
            )}
            <div className="font-mono text-[11px] text-muted-foreground">
              {lat!.toFixed(5)}, {lng!.toFixed(5)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <MapPin className="h-8 w-8" />
            <p className="text-sm">Awaiting GPS signal…</p>
          </div>
        )}
      </div>

      {/* Legend chip */}
      <div className="absolute top-3 left-3 glass rounded-md px-2.5 py-1.5 text-[11px] flex items-center gap-2">
        <Bus className="h-3.5 w-3.5 text-primary" />
        <span className="text-muted-foreground">Map preview · API key pending</span>
      </div>
    </div>
  );
}
