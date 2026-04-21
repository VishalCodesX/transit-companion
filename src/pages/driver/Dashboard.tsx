import { useEffect, useState, useCallback } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Bus, Gauge, Timer, MapPin, Satellite, AlertTriangle, Play, Square } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Badge, LiveDot } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { StatCard } from "@/components/common/StatCard";
import { Modal } from "@/components/common/Modal";
import { SmartMapView as MapView } from "@/components/common/SmartMapView";
import { Spinner } from "@/components/common/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useGeoLocation, useTripTimer } from "@/hooks/useGeoLocation";
import { startTrip, pushLocation, endTrip } from "@/services/tripService";

interface BusInfo {
  id: string;
  busNumber: string;
  routeName: string;
  licensePlate: string;
  capacity: number;
  status: string;
  currentTripId: string | null;
}

interface RecentTrip {
  id: string;
  startTime?: { toDate: () => Date };
  endTime?: { toDate: () => Date } | null;
  totalDistance?: number;
  status: string;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [bus, setBus] = useState<BusInfo | null>(null);
  const [busLoading, setBusLoading] = useState(true);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripStartMs, setTripStartMs] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [now, setNow] = useState(new Date());

  const tripActive = !!tripId;

  // Live clock for greeting
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Load assigned bus
  useEffect(() => {
    if (!user?.assignedBusId) {
      setBusLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "buses", user.assignedBusId!));
        if (!cancelled && snap.exists()) {
          const d = snap.data();
          setBus({
            id: snap.id,
            busNumber: d.busNumber,
            routeName: d.routeName,
            licensePlate: d.licensePlate,
            capacity: d.capacity,
            status: d.status,
            currentTripId: d.currentTripId ?? null,
          });
          // Resume an in-progress trip
          if (d.currentTripId) {
            setTripId(d.currentTripId);
            const trip = await getDoc(doc(db, "trips", d.currentTripId));
            const start = trip.data()?.startTime?.toDate?.() as Date | undefined;
            if (start) setTripStartMs(start.getTime());
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setBusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.assignedBusId]);

  // Load recent trips
  const reloadRecent = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "trips"),
        where("driverId", "==", user.uid),
        orderBy("startTime", "desc"),
        limit(5),
      );
      const snap = await getDocs(q);
      setRecentTrips(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RecentTrip, "id">) })));
    } catch (e) {
      // Likely missing composite index — fail silently with a console hint
      console.warn("Recent trips query failed (you may need a Firestore composite index on driverId+startTime):", e);
    }
  }, [user]);
  useEffect(() => { reloadRecent(); }, [reloadRecent, tripId]);

  // GPS push handler
  const onGpsUpdate = useCallback(
    async (pos: Parameters<NonNullable<Parameters<typeof useGeoLocation>[0]["onUpdate"]>>[0]) => {
      if (!tripId || !bus || !user) return;
      try {
        await pushLocation({
          busId: bus.id,
          driverId: user.uid,
          tripId,
          lat: pos.lat,
          lng: pos.lng,
          heading: pos.heading,
          speed: pos.speed,
        });
      } catch (e) {
        console.error("Failed to push location", e);
      }
    },
    [tripId, bus, user],
  );

  const { position, error: gpsError, supported, totalDistance } = useGeoLocation({
    enabled: tripActive,
    onUpdate: onGpsUpdate,
  });
  const { elapsed } = useTripTimer(tripStartMs);

  async function handleStartTrip() {
    if (!user || !bus) return;
    if (!supported) {
      toast.error("Geolocation isn't supported on this device.");
      return;
    }
    setStarting(true);
    try {
      // Need a fix to start. Wait briefly for one if not present.
      const fix = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        });
      });
      const id = await startTrip({
        busId: bus.id,
        driverId: user.uid,
        lat: fix.coords.latitude,
        lng: fix.coords.longitude,
      });
      setTripId(id);
      setTripStartMs(Date.now());
      setBus((b) => (b ? { ...b, status: "active", currentTripId: id } : b));
      toast.success("Trip started — broadcasting your location.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start trip";
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  }

  async function handleEndTrip() {
    if (!bus || !tripId) return;
    setEnding(true);
    try {
      await endTrip(bus.id, tripId, +(totalDistance / 1000).toFixed(2));
      toast.success("Trip ended.");
      setTripId(null);
      setTripStartMs(null);
      setConfirmEnd(false);
      setBus((b) => (b ? { ...b, status: "idle", currentTripId: null } : b));
      reloadRecent();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not end trip");
    } finally {
      setEnding(false);
    }
  }

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const gpsSignal = (() => {
    if (gpsError) return { label: "No Signal", variant: "danger" as const };
    if (!position) return { label: "Acquiring…", variant: "warning" as const };
    if (position.accuracy > 50) return { label: "Weak", variant: "warning" as const };
    return { label: "Strong", variant: "success" as const };
  })();

  return (
    <div className="flex min-h-screen">
      <Sidebar roleLabel="Driver" />

      <main className="flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {user?.name?.split(" ")[0] ?? "Driver"}</h1>
            <p className="text-sm text-muted-foreground font-mono">{format(now, "EEEE, MMMM d · HH:mm")}</p>
          </div>
          {tripActive && (
            <div className="flex items-center gap-2 glass rounded-full px-4 py-2 animate-fade-in">
              <LiveDot />
              <span className="text-sm font-medium">Trip Active</span>
              {bus && <span className="text-sm text-muted-foreground">· {bus.busNumber} · {bus.routeName}</span>}
            </div>
          )}
        </div>

        {busLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : !bus ? (
          <div className="glass rounded-xl p-10 text-center">
            <Bus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="font-semibold">No bus assigned</h2>
            <p className="text-sm text-muted-foreground mt-1">An administrator needs to assign a bus to your account.</p>
          </div>
        ) : tripActive ? (
          <ActiveTripView
            bus={bus}
            elapsed={elapsed}
            position={position}
            gpsSignal={gpsSignal}
            gpsError={gpsError}
            distanceKm={totalDistance / 1000}
            onEnd={() => setConfirmEnd(true)}
            ending={ending}
          />
        ) : (
          <IdleView
            bus={bus}
            onStart={handleStartTrip}
            starting={starting}
            gpsSupported={supported}
            recentTrips={recentTrips}
          />
        )}
      </main>

      <Modal isOpen={confirmEnd} onClose={() => setConfirmEnd(false)} title="End this trip?">
        <p className="text-sm text-muted-foreground">
          Ending the trip will stop broadcasting your location and mark the trip as complete. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmEnd(false)} disabled={ending}>Cancel</Button>
          <Button variant="danger" onClick={handleEndTrip} loading={ending} leftIcon={<Square className="h-4 w-4" />}>
            End Trip
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function IdleView({
  bus,
  onStart,
  starting,
  gpsSupported,
  recentTrips,
}: {
  bus: BusInfo;
  onStart: () => void;
  starting: boolean;
  gpsSupported: boolean;
  recentTrips: RecentTrip[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="glass rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Assigned Bus</p>
              <h2 className="text-2xl font-semibold tracking-tight">{bus.busNumber}</h2>
              <p className="text-sm text-muted-foreground mt-1">{bus.routeName}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="neutral" className="font-mono">{bus.licensePlate}</Badge>
                <Badge variant="neutral">{bus.capacity} seats</Badge>
                <Badge variant={bus.status === "active" ? "success" : bus.status === "idle" ? "warning" : "neutral"}>
                  {bus.status}
                </Badge>
              </div>
            </div>
            <div className="h-16 w-16 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
              <Bus className="h-7 w-7 text-primary" />
            </div>
          </div>

          {!gpsSupported && (
            <div className="mt-5 flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Geolocation isn't supported on this device. You won't be able to start a trip.</p>
            </div>
          )}

          <Button
            size="lg"
            variant="success"
            onClick={onStart}
            loading={starting}
            disabled={!gpsSupported}
            leftIcon={<Play className="h-5 w-5" />}
            className={`w-full mt-6 ${!gpsSupported ? "animate-shake" : ""}`}
          >
            Start Trip
          </Button>
        </div>

        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Trips</h3>
            <span className="text-xs text-muted-foreground">Last 5</span>
          </div>
          {recentTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No trips yet. Your trip history will appear here.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-2 py-2 font-medium">Started</th>
                    <th className="px-2 py-2 font-medium">Ended</th>
                    <th className="px-2 py-2 font-medium">Distance</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-2 py-2 font-mono text-xs">
                        {t.startTime ? format(t.startTime.toDate(), "MMM d, HH:mm") : "—"}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">
                        {t.endTime ? format(t.endTime.toDate(), "HH:mm") : "—"}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{t.totalDistance?.toFixed(2) ?? "0.00"} km</td>
                      <td className="px-2 py-2">
                        <Badge variant={t.status === "completed" ? "success" : "info"}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-6 flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-full bg-success/15 ring-1 ring-success/30 flex items-center justify-center mb-3">
          <Satellite className="h-7 w-7 text-success" />
        </div>
        <h3 className="font-semibold">Ready to drive</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          Tap <span className="text-foreground font-medium">Start Trip</span> to begin broadcasting your location to students.
        </p>
        <ul className="mt-5 text-xs text-muted-foreground space-y-1.5 text-left w-full">
          <li>· GPS updates throttled to ≥10 m or 8 s</li>
          <li>· Speed and heading auto-calculated</li>
          <li>· Location log saved for trip history</li>
        </ul>
      </div>
    </div>
  );
}

function ActiveTripView({
  bus,
  elapsed,
  position,
  gpsSignal,
  gpsError,
  distanceKm,
  onEnd,
  ending,
}: {
  bus: BusInfo;
  elapsed: string;
  position: { lat: number; lng: number; heading: number; speed: number } | null;
  gpsSignal: { label: string; variant: "success" | "warning" | "danger" };
  gpsError: string | null;
  distanceKm: number;
  onEnd: () => void;
  ending: boolean;
}) {
  return (
    <div className="space-y-5">
      {gpsError && (
        <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{gpsError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Speed"
          value={<>{(position?.speed ?? 0).toFixed(0)}<span className="text-base text-muted-foreground ml-1">km/h</span></>}
          icon={<Gauge className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="Duration"
          value={elapsed}
          icon={<Timer className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="Distance"
          value={<>{distanceKm.toFixed(2)}<span className="text-base text-muted-foreground ml-1">km</span></>}
          icon={<MapPin className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="GPS Signal"
          value={<span className={
            gpsSignal.variant === "success" ? "text-success" :
            gpsSignal.variant === "warning" ? "text-warning" : "text-destructive"
          }>{gpsSignal.label}</span>}
          icon={<Satellite className="h-4 w-4" />}
          accent={gpsSignal.variant === "success" ? "success" : gpsSignal.variant === "warning" ? "warning" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-[480px]">
          <MapView
            buses={
              position
                ? [{
                    id: bus.id,
                    busNumber: bus.busNumber,
                    lat: position.lat,
                    lng: position.lng,
                    heading: position.heading,
                    status: "active",
                  }]
                : []
            }
            selectedBusId={bus.id}
            className="h-full"
          />
        </div>
        <div className="glass rounded-xl p-6 flex flex-col">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Broadcasting</p>
          <h3 className="text-lg font-semibold mt-1">{bus.busNumber} · {bus.routeName}</h3>
          <Badge variant="neutral" className="mt-2 self-start font-mono">{bus.licensePlate}</Badge>

          <div className="mt-5 space-y-3 text-sm">
            <Row label="Latitude" value={position ? position.lat.toFixed(6) : "—"} />
            <Row label="Longitude" value={position ? position.lng.toFixed(6) : "—"} />
            <Row label="Heading" value={position ? `${position.heading.toFixed(0)}°` : "—"} />
            <Row label="Updates" value="every ≥10 m or 8 s" valueClass="text-muted-foreground text-xs" />
          </div>

          <Button
            size="lg"
            variant="danger"
            onClick={onEnd}
            loading={ending}
            leftIcon={<Square className="h-5 w-5" />}
            className="w-full mt-auto pt-0"
          >
            End Trip
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
