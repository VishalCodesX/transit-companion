import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bus, Gauge, MapPin, Navigation2, Wifi, WifiOff, Crosshair, Clock } from "lucide-react";
import clsx from "clsx";
import { TopBar } from "@/components/common/TopBar";
import { Badge, LiveDot } from "@/components/common/Badge";
import { Spinner } from "@/components/common/Spinner";
import { SmartMapView as MapView } from "@/components/common/SmartMapView";
import { useAuth } from "@/context/AuthContext";
import { useAllBuses, useBusLocation, type BusDoc } from "@/hooks/useBuses";
import { useNotifications } from "@/hooks/useNotifications";
import { distanceMeters } from "@/utils/mapUtils";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { buses, loading: busesLoading } = useAllBuses();
  const [selectedBusId, setSelectedBusId] = useState<string | null>(user?.assignedBusId ?? null);
  const [myStop, setMyStop] = useState<{ lat: number; lng: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const { items: notifications } = useNotifications("student");

  // Pick assigned bus on first load if available
  useEffect(() => {
    if (!selectedBusId && user?.assignedBusId) setSelectedBusId(user.assignedBusId);
  }, [user?.assignedBusId, selectedBusId]);

  // Tick "Updated 3s ago"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { bus, loading: busLoading } = useBusLocation(selectedBusId);

  const lastUpdatedSec = bus?.lastUpdated ? Math.max(0, Math.floor((now - bus.lastUpdated.toMillis()) / 1000)) : null;
  const isStale = lastUpdatedSec != null && lastUpdatedSec > 60;

  // ETA calculation: distance / speed. Falls back to 0 if no movement.
  const eta = useMemo(() => {
    if (!bus || !myStop) return null;
    const meters = distanceMeters(bus.lat, bus.lng, myStop.lat, myStop.lng);
    const km = meters / 1000;
    const speedKmh = Math.max(bus.speed, 12); // assume 12 km/h baseline if idling
    const minutes = (km / speedKmh) * 60;
    return { km, minutes };
  }, [bus, myStop]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar roleLabel="Student" notificationsFor="student" />

      <main className="flex-1 max-w-[1500px] mx-auto w-full px-5 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Live Bus Tracking</h1>
          <p className="text-sm text-muted-foreground">Watch your bus in real time and set a stop pin to get an ETA.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your Bus</p>
              <BusSelector
                buses={buses}
                value={selectedBusId}
                onChange={setSelectedBusId}
                loading={busesLoading}
                assignedBusId={user?.assignedBusId ?? null}
              />
            </div>

            <ETACard
              bus={bus}
              loading={busLoading}
              lastUpdatedSec={lastUpdatedSec}
              isStale={isStale}
              eta={eta}
              hasStop={!!myStop}
              onClearStop={() => setMyStop(null)}
            />

            <div className="glass rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Live Activity</p>
              {!bus ? (
                <p className="text-xs text-muted-foreground">Select a bus to see updates.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  <ActivityRow ts={bus.lastUpdated?.toMillis() ?? null} text={`${bus.busNumber} reported position`} />
                  {bus.status === "active" && (
                    <ActivityRow ts={bus.lastUpdated?.toMillis() ?? null} text={`Speed: ${bus.speed.toFixed(0)} km/h`} />
                  )}
                  {myStop && eta && (
                    <ActivityRow ts={now} text={`ETA to your stop: ${formatMinutes(eta.minutes)}`} />
                  )}
                </ul>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="glass rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Notifications</p>
                <ul className="space-y-2">
                  {notifications.slice(0, 4).map((n) => (
                    <li key={n.id} className="text-xs border-l-2 border-primary/60 pl-3 py-0.5">
                      <p>{n.message}</p>
                      {n.createdAt && (
                        <p className="text-muted-foreground mt-0.5">
                          {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right column — map */}
          <div className="lg:col-span-2 h-[640px] lg:sticky lg:top-20">
            {busLoading ? (
              <div className="h-full flex items-center justify-center glass rounded-xl">
                <Spinner size="lg" />
              </div>
            ) : (
              <MapView
                buses={
                  bus
                    ? [{
                        id: bus.id,
                        busNumber: bus.busNumber,
                        lat: bus.lat,
                        lng: bus.lng,
                        heading: bus.heading,
                        status: isStale ? "offline" : bus.status,
                      }]
                    : []
                }
                selectedBusId={bus?.id ?? null}
                myStop={myStop}
                onMapClick={(c) => setMyStop(c)}
                className="h-full"
              />
            )}
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <Crosshair className="h-3 w-3" />
              Tap the map to drop a "My Stop" pin and get an ETA.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function BusSelector({
  buses,
  value,
  onChange,
  loading,
  assignedBusId,
}: {
  buses: BusDoc[];
  value: string | null;
  onChange: (id: string) => void;
  loading: boolean;
  assignedBusId: string | null;
}) {
  if (loading) return <Spinner size="sm" />;
  if (buses.length === 0) {
    return <p className="text-xs text-muted-foreground">No buses available yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {buses.map((b) => {
        const active = b.id === value;
        const dot =
          b.status === "active" ? "bg-success" : b.status === "idle" ? "bg-warning" : "bg-muted-foreground";
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className={clsx(
              "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-left transition-colors",
              active
                ? "border-primary/60 bg-primary/10"
                : "border-border bg-surface/60 hover:border-primary/30",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={clsx("h-2 w-2 rounded-full shrink-0", dot)} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{b.busNumber}</p>
                <p className="text-[11px] text-muted-foreground truncate">{b.routeName}</p>
              </div>
            </div>
            {b.id === assignedBusId && <Badge variant="info">Yours</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function ETACard({
  bus,
  loading,
  lastUpdatedSec,
  isStale,
  eta,
  hasStop,
  onClearStop,
}: {
  bus: BusDoc | null;
  loading: boolean;
  lastUpdatedSec: number | null;
  isStale: boolean;
  eta: { km: number; minutes: number } | null;
  hasStop: boolean;
  onClearStop: () => void;
}) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-6 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!bus) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <Bus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Select a bus to see live status.</p>
      </div>
    );
  }
  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Now Tracking</p>
          <h3 className="text-lg font-semibold">{bus.busNumber}</h3>
          <p className="text-xs text-muted-foreground">{bus.routeName}</p>
        </div>
        {bus.status === "active" && !isStale ? (
          <Badge variant="success" className="gap-1.5"><LiveDot /> Live</Badge>
        ) : isStale || bus.status === "offline" ? (
          <Badge variant="neutral"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>
        ) : (
          <Badge variant="warning">Idle</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 text-sm">
        <Stat label="Driver" value={bus.driverName ?? "—"} icon={<Navigation2 className="h-3.5 w-3.5" />} />
        <Stat label="Speed" value={`${bus.speed.toFixed(0)} km/h`} icon={<Gauge className="h-3.5 w-3.5" />} mono />
        <Stat
          label="Updated"
          value={lastUpdatedSec == null ? "—" : lastUpdatedSec < 60 ? `${lastUpdatedSec}s ago` : `${Math.floor(lastUpdatedSec / 60)}m ago`}
          icon={<Wifi className="h-3.5 w-3.5" />}
        />
        <Stat
          label="ETA"
          value={eta ? formatMinutes(eta.minutes) : hasStop ? "—" : "Set stop"}
          icon={<Clock className="h-3.5 w-3.5" />}
        />
      </div>

      {hasStop && eta && (
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="font-mono">{eta.km.toFixed(2)} km away</span>
          </div>
          <button onClick={onClearStop} className="text-primary hover:underline">Clear stop</button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, mono }: { label: string; value: string; icon: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-md bg-surface/60 border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={clsx("mt-1 text-sm font-medium truncate", mono && "font-mono")}>{value}</div>
    </div>
  );
}

function ActivityRow({ ts, text }: { ts: number | null; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
      <div className="flex-1">
        <p>{text}</p>
        {ts && <p className="text-muted-foreground text-[10px]">{formatDistanceToNow(new Date(ts), { addSuffix: true })}</p>}
      </div>
    </li>
  );
}

function formatMinutes(min: number): string {
  if (!Number.isFinite(min) || min < 0) return "—";
  if (min < 1) return "<1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}
