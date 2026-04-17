import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Truck, Users, Activity, GraduationCap, Wifi } from "lucide-react";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { StatCard } from "@/components/common/StatCard";
import { Badge, LiveDot } from "@/components/common/Badge";
import { MapView } from "@/components/common/MapView";
import { Spinner } from "@/components/common/Spinner";
import { useAllBuses } from "@/hooks/useBuses";
import { useAllUsers } from "@/hooks/useUsers";
import { useTripHistory } from "@/hooks/useTripHistory";

export default function AdminOverview() {
  const { buses, loading } = useAllBuses();
  const { users } = useAllUsers();
  const { trips } = useTripHistory();

  const active = buses.filter((b) => b.status === "active").length;
  const driversOnline = useMemo(() => {
    const driverIdsActive = new Set(buses.filter((b) => b.status === "active").map((b) => b.driverId).filter(Boolean));
    return driverIdsActive.size;
  }, [buses]);
  const totalStudents = users.filter((u) => u.role === "student").length;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Realtime fleet status across the campus.</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Buses" value={buses.length} icon={<Truck className="h-4 w-4" />} accent="primary" />
          <StatCard label="Active Now" value={active} icon={<Activity className="h-4 w-4" />} accent="success" hint={active === 0 ? "No active trips" : `${active} broadcasting`} />
          <StatCard label="Drivers Online" value={driversOnline} icon={<Users className="h-4 w-4" />} accent="warning" />
          <StatCard label="Students" value={totalStudents} icon={<GraduationCap className="h-4 w-4" />} accent="neutral" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Fleet Status</h2>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Wifi className="h-3 w-3" /> Live</span>
              </div>
              {loading ? (
                <div className="py-10 flex items-center justify-center"><Spinner /></div>
              ) : buses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No buses yet. Seed demo data from the login screen.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="px-2 py-2 font-medium">Bus</th>
                        <th className="px-2 py-2 font-medium">Route</th>
                        <th className="px-2 py-2 font-medium">Driver</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Speed</th>
                        <th className="px-2 py-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buses.map((b) => (
                        <tr key={b.id} className="border-t border-border">
                          <td className="px-2 py-2 font-medium">{b.busNumber}</td>
                          <td className="px-2 py-2 text-muted-foreground">{b.routeName}</td>
                          <td className="px-2 py-2">{b.driverName ?? "—"}</td>
                          <td className="px-2 py-2">
                            <Badge variant={b.status === "active" ? "success" : b.status === "idle" ? "warning" : "neutral"} className="gap-1.5">
                              {b.status === "active" && <LiveDot />}
                              {b.status}
                            </Badge>
                          </td>
                          <td className="px-2 py-2 font-mono text-xs">{b.speed.toFixed(0)} km/h</td>
                          <td className="px-2 py-2 text-xs text-muted-foreground">
                            {b.lastUpdated ? formatDistanceToNow(b.lastUpdated.toDate(), { addSuffix: true }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-0 h-[360px]">
              <MapView
                buses={buses
                  .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng))
                  .map((b) => ({ id: b.id, busNumber: b.busNumber, lat: b.lat, lng: b.lng, heading: b.heading, status: b.status }))}
                className="h-full"
              />
            </div>
          </div>

          <aside className="glass rounded-xl p-5">
            <h2 className="font-semibold mb-3">Recent Activity</h2>
            {trips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trips logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {trips.slice(0, 8).map((t) => {
                  const bus = buses.find((b) => b.id === t.busId);
                  return (
                    <li key={t.id} className="flex items-start gap-3 text-sm">
                      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${t.status === "ongoing" ? "bg-success" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">
                          <span className="font-medium">{bus?.busNumber ?? t.busId}</span>{" "}
                          <span className="text-muted-foreground">{t.status === "ongoing" ? "started a trip" : "ended a trip"}</span>
                        </p>
                        {t.startTime && (
                          <p className="text-[11px] text-muted-foreground">
                            {format(t.startTime.toDate(), "MMM d, HH:mm")}
                            {t.totalDistance > 0 && ` · ${t.totalDistance.toFixed(2)} km`}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
