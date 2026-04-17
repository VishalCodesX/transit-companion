import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Filter } from "lucide-react";
import { db } from "@/services/firebase";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { Badge, LiveDot } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { MapView } from "@/components/common/MapView";
import { Modal } from "@/components/common/Modal";
import { Spinner } from "@/components/common/Spinner";
import { useAllBuses, type BusDoc } from "@/hooks/useBuses";

type StatusFilter = "all" | "active" | "idle" | "offline";

export default function AdminFleet() {
  const { buses, loading } = useAllBuses();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [selected, setSelected] = useState<BusDoc | null>(null);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const routes = useMemo(() => Array.from(new Set(buses.map((b) => b.routeName))).filter(Boolean), [buses]);
  const filtered = useMemo(() => {
    return buses.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (routeFilter !== "all" && b.routeName !== routeFilter) return false;
      return true;
    });
  }, [buses, statusFilter, routeFilter]);

  async function handleEmergencyEnd() {
    if (!selected) return;
    setEnding(true);
    try {
      // End the active trip and reset bus to idle. We do not have direct trip
      // distance here, so we leave totalDistance untouched.
      const tripId = selected.currentTripId;
      if (tripId) {
        await updateDoc(doc(db, "trips", tripId), {
          status: "completed",
          endTime: serverTimestamp(),
        });
      }
      await updateDoc(doc(db, "buses", selected.id), {
        status: "idle",
        currentTripId: null,
        speed: 0,
        lastUpdated: serverTimestamp(),
      });
      toast.success(`Trip ended for ${selected.busNumber}`);
      setConfirmEnd(false);
      setSelected(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to end trip");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 flex flex-col">
        <div className="px-6 lg:px-8 pt-6 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fleet Map</h1>
            <p className="text-sm text-muted-foreground">All buses, live. Click a marker to inspect.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 rounded-md border border-border bg-input px-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="offline">Offline</option>
            </select>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-input px-2 text-sm"
            >
              <option value="all">All routes</option>
              {routes.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 px-6 lg:px-8 pb-6 grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3 min-h-[500px] lg:min-h-0 lg:h-[calc(100vh-150px)]">
            {loading ? (
              <div className="h-full glass rounded-xl flex items-center justify-center"><Spinner size="lg" /></div>
            ) : (
              <MapView
                buses={filtered.map((b) => ({
                  id: b.id, busNumber: b.busNumber, lat: b.lat, lng: b.lng, heading: b.heading, status: b.status,
                }))}
                selectedBusId={selected?.id ?? null}
                onBusClick={(b) => {
                  const full = filtered.find((x) => x.id === b.id) ?? null;
                  setSelected(full);
                }}
                className="h-full"
              />
            )}
          </div>

          <aside className="glass rounded-xl p-4 lg:h-[calc(100vh-150px)] overflow-y-auto">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Legend</p>
            <ul className="text-xs space-y-1.5 mb-4">
              <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" /> Active / moving</li>
              <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" /> Idle</li>
              <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Offline</li>
            </ul>

            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fleet ({filtered.length})</p>
            <ul className="space-y-1.5">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => setSelected(b)}
                    className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                      selected?.id === b.id ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{b.busNumber}</span>
                      <Badge variant={b.status === "active" ? "success" : b.status === "idle" ? "warning" : "neutral"} className="gap-1">
                        {b.status === "active" && <LiveDot />}
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{b.routeName}</p>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground">No buses match.</p>}
            </ul>
          </aside>
        </div>
      </main>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.busNumber} · ${selected.routeName}` : ""}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <Row label="Status" value={
              <Badge variant={selected.status === "active" ? "success" : selected.status === "idle" ? "warning" : "neutral"}>
                {selected.status}
              </Badge>
            } />
            <Row label="Driver" value={selected.driverName ?? "—"} />
            <Row label="Plate" value={<span className="font-mono">{selected.licensePlate}</span>} />
            <Row label="Capacity" value={`${selected.capacity} seats`} />
            <Row label="Speed" value={<span className="font-mono">{selected.speed.toFixed(0)} km/h</span>} />
            <Row label="Position" value={<span className="font-mono text-xs">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span>} />
            <Row label="Updated" value={selected.lastUpdated ? formatDistanceToNow(selected.lastUpdated.toDate(), { addSuffix: true }) : "—"} />
            {selected.currentTripId && (
              <div className="pt-3 border-t border-border">
                <Button variant="danger" className="w-full" onClick={() => setConfirmEnd(true)}>
                  Emergency End Trip
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={confirmEnd} onClose={() => setConfirmEnd(false)} title="Confirm emergency stop">
        <p className="text-sm text-muted-foreground">
          This will mark the active trip as completed and set the bus to idle. The driver will be notified by their UI on next refresh.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmEnd(false)} disabled={ending}>Cancel</Button>
          <Button variant="danger" onClick={handleEmergencyEnd} loading={ending}>End Trip</Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
