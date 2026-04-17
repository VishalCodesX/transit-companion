import { useMemo, useState, useEffect } from "react";
import { format, formatDistance } from "date-fns";
import { Calendar, Filter } from "lucide-react";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { Spinner } from "@/components/common/Spinner";
import { SmartMapView } from "@/components/common/SmartMapView";
import { type MapBus } from "@/components/common/MapView";
import { useAllBuses } from "@/hooks/useBuses";
import { useAllUsers } from "@/hooks/useUsers";
import { useTripHistory, fetchTripPath, type TripDoc, type LocationLogPoint } from "@/hooks/useTripHistory";

export default function AdminHistory() {
  const { buses } = useAllBuses();
  const { users } = useAllUsers();
  const drivers = users.filter((u) => u.role === "driver");
  const [busId, setBusId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const filters = useMemo(() => ({
    busId: busId || undefined,
    driverId: driverId || undefined,
    from: from ? new Date(from) : null,
    to: to ? new Date(to + "T23:59:59") : null,
  }), [busId, driverId, from, to]);

  const { trips, loading, error } = useTripHistory(filters);
  const [selected, setSelected] = useState<TripDoc | null>(null);
  const [path, setPath] = useState<LocationLogPoint[]>([]);
  const [pathLoading, setPathLoading] = useState(false);

  useEffect(() => {
    if (!selected) { setPath([]); return; }
    setPathLoading(true);
    fetchTripPath(selected.id)
      .then(setPath)
      .catch(console.error)
      .finally(() => setPathLoading(false));
  }, [selected]);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Trip History</h1>
          <p className="text-sm text-muted-foreground">Filter and inspect past trips.</p>
        </header>

        <div className="glass rounded-xl p-4 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Filters</div>
            <select value={busId} onChange={(e) => setBusId(e.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm">
              <option value="">All buses</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.busNumber}</option>)}
            </select>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm">
              <option value="">All drivers</option>
              {drivers.map((d) => <option key={d.uid} value={d.uid}>{d.name}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm font-mono" />
              <span className="text-muted-foreground text-xs">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm font-mono" />
            </div>
            {(busId || driverId || from || to) && (
              <button
                onClick={() => { setBusId(""); setDriverId(""); setFrom(""); setTo(""); }}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          {loading ? (
            <div className="py-10 flex items-center justify-center"><Spinner /></div>
          ) : error ? (
            <div className="text-sm text-destructive p-4">
              <p className="font-medium">Failed to load trips</p>
              <p className="text-xs mt-1 break-all opacity-80">{error}</p>
              <p className="text-xs mt-2 text-muted-foreground">If this is an "index required" error, click the URL Firebase prints in the browser console to auto-create the composite index.</p>
            </div>
          ) : trips.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No trips match these filters.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-2 py-2 font-medium">Trip ID</th>
                    <th className="px-2 py-2 font-medium">Bus</th>
                    <th className="px-2 py-2 font-medium">Driver</th>
                    <th className="px-2 py-2 font-medium">Start</th>
                    <th className="px-2 py-2 font-medium">End</th>
                    <th className="px-2 py-2 font-medium">Duration</th>
                    <th className="px-2 py-2 font-medium">Distance</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => {
                    const bus = buses.find((b) => b.id === t.busId);
                    const driver = drivers.find((d) => d.uid === t.driverId);
                    const dur = t.startTime && t.endTime
                      ? formatDistance(t.endTime.toDate(), t.startTime.toDate())
                      : t.startTime && t.status === "ongoing"
                        ? "ongoing"
                        : "—";
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelected(t)}
                        className="border-t border-border hover:bg-secondary/40 cursor-pointer"
                      >
                        <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{t.id.slice(0, 8)}…</td>
                        <td className="px-2 py-2 font-medium">{bus?.busNumber ?? t.busId}</td>
                        <td className="px-2 py-2">{driver?.name ?? <span className="text-muted-foreground text-xs">—</span>}</td>
                        <td className="px-2 py-2 font-mono text-xs">{t.startTime ? format(t.startTime.toDate(), "MMM d HH:mm") : "—"}</td>
                        <td className="px-2 py-2 font-mono text-xs">{t.endTime ? format(t.endTime.toDate(), "MMM d HH:mm") : "—"}</td>
                        <td className="px-2 py-2 text-xs">{dur}</td>
                        <td className="px-2 py-2 font-mono text-xs">{t.totalDistance.toFixed(2)} km</td>
                        <td className="px-2 py-2">
                          <Badge variant={t.status === "completed" ? "success" : "info"}>{t.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Trip ${selected.id.slice(0, 8)}…` : ""}
        className="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Row label="Bus" value={buses.find((b) => b.id === selected.busId)?.busNumber ?? selected.busId} />
              <Row label="Driver" value={drivers.find((d) => d.uid === selected.driverId)?.name ?? "—"} />
              <Row label="Started" value={selected.startTime ? format(selected.startTime.toDate(), "MMM d, yyyy HH:mm:ss") : "—"} />
              <Row label="Ended" value={selected.endTime ? format(selected.endTime.toDate(), "MMM d, yyyy HH:mm:ss") : "Ongoing"} />
              <Row label="Distance" value={`${selected.totalDistance.toFixed(2)} km`} mono />
              <Row label="Log points" value={String(path.length)} mono />
            </div>
            <div className="h-72 rounded-lg overflow-hidden">
              {pathLoading ? (
                <div className="h-full flex items-center justify-center bg-surface"><Spinner /></div>
              ) : (
                <PathMap path={path} />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

/** Renders bus path as polyline (Google Maps) or start/end markers (stub). */
function PathMap({ path }: { path: LocationLogPoint[] }) {
  if (path.length === 0) {
    return <div className="h-full flex items-center justify-center bg-surface text-sm text-muted-foreground">No location log points recorded.</div>;
  }
  const start = path[0];
  const end = path[path.length - 1];
  const buses: MapBus[] = [
    { id: "start", busNumber: "Start", lat: start.lat, lng: start.lng, heading: 0, status: "idle" },
    { id: "end", busNumber: "End", lat: end.lat, lng: end.lng, heading: 0, status: "active" },
  ];
  const polyline = path.map((p) => ({ lat: p.lat, lng: p.lng }));
  return <SmartMapView buses={buses} polyline={polyline} className="h-full" showStubBanner={false} />;
}
