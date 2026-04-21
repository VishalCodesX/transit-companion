import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Check, UserCog, X } from "lucide-react";
import { db } from "@/services/firebase";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { Spinner } from "@/components/common/Spinner";
import { useAllBuses } from "@/hooks/useBuses";
import { useAllUsers, type UserDoc } from "@/hooks/useUsers";
import { useTripHistory } from "@/hooks/useTripHistory";

export default function AdminDrivers() {
  const { users, loading } = useAllUsers();
  const { buses } = useAllBuses();
  const { trips } = useTripHistory();
  const [saving, setSaving] = useState(false);
  const [reassign, setReassign] = useState<UserDoc | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  const drivers = useMemo(() => users.filter((u) => u.role === "driver"), [users]);
  const pendingDrivers = drivers.filter((d) => d.approvalStatus === "pending");
  const approvedDrivers = drivers.filter((d) => d.approvalStatus === "approved");

  const tripCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of trips) m.set(t.driverId, (m.get(t.driverId) ?? 0) + 1);
    return m;
  }, [trips]);

  async function handleReview(uid: string, decision: "approved" | "rejected") {
    setSavingUid(uid);
    try {
      const payload: {
        approvalStatus: "approved" | "rejected";
        reviewedAt: ReturnType<typeof serverTimestamp>;
        assignedBusId?: null;
      } = {
        approvalStatus: decision,
        reviewedAt: serverTimestamp(),
      };
      if (decision === "rejected") payload.assignedBusId = null;

      await setDoc(
        doc(db, "users", uid),
        payload,
        { merge: true },
      );
      toast.success(`Driver request ${decision}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setSavingUid(null);
    }
  }

  async function handleReassign(busId: string | null) {
    if (!reassign) return;
    setSaving(true);
    try {
      // Clear old bus assignment
      if (reassign.assignedBusId && reassign.assignedBusId !== busId) {
        await setDoc(doc(db, "buses", reassign.assignedBusId), { driverId: null, driverName: null }, { merge: true });
      }
      await setDoc(doc(db, "users", reassign.uid), { assignedBusId: busId }, { merge: true });
      if (busId) {
        const locationPatch = reassign.lastLocation
          ? {
              lat: reassign.lastLocation.lat,
              lng: reassign.lastLocation.lng,
              lastUpdated: serverTimestamp(),
            }
          : {};
        await setDoc(
          doc(db, "buses", busId),
          { driverId: reassign.uid, driverName: reassign.name, ...locationPatch },
          { merge: true },
        );
      }
      toast.success("Driver reassigned");
      setReassign(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reassignment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Manage Drivers</h1>
          <p className="text-sm text-muted-foreground">Approve driver requests and manage bus assignments.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="xl:col-span-1 glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Pending Requests</h2>
              <Badge variant="warning">{pendingDrivers.length}</Badge>
            </div>
            {loading ? (
              <div className="py-10 flex items-center justify-center"><Spinner /></div>
            ) : pendingDrivers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending driver requests.</p>
            ) : (
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {pendingDrivers.map((d) => (
                  <div key={d.uid} className="rounded-md border border-border bg-surface/60 p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar name={d.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">{d.email}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Phone: <span className="text-foreground font-mono">{d.phoneNumber ?? "—"}</span></p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1"
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                        onClick={() => handleReview(d.uid, "approved")}
                        loading={savingUid === d.uid}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        leftIcon={<X className="h-3.5 w-3.5" />}
                        onClick={() => handleReview(d.uid, "rejected")}
                        disabled={savingUid === d.uid}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="xl:col-span-2 glass rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Approved Drivers</h2>
            {loading ? (
              <div className="py-10 flex items-center justify-center"><Spinner /></div>
            ) : approvedDrivers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No approved drivers yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Email</th>
                      <th className="px-2 py-2 font-medium">Assigned Bus</th>
                      <th className="px-2 py-2 font-medium">Trips</th>
                      <th className="px-2 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedDrivers.map((d) => {
                      const bus = buses.find((b) => b.id === d.assignedBusId);
                      return (
                        <tr key={d.uid} className="border-t border-border">
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={d.name} size="sm" />
                              <span className="font-medium">{d.name}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 font-mono text-xs">{d.email}</td>
                          <td className="px-2 py-2">
                            {bus ? <Badge variant="info">{bus.busNumber}</Badge> : <span className="text-muted-foreground italic text-xs">unassigned</span>}
                          </td>
                          <td className="px-2 py-2 font-mono text-xs">{tripCounts.get(d.uid) ?? 0}</td>
                          <td className="px-2 py-2 text-right">
                            <Button size="sm" variant="ghost" leftIcon={<UserCog className="h-3.5 w-3.5" />} onClick={() => setReassign(d)}>
                              Assign Bus
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <Modal isOpen={!!reassign} onClose={() => setReassign(null)} title={reassign ? `Assign bus to ${reassign.name}` : ""}>
        {reassign && (
          <div className="space-y-2">
            <button
              onClick={() => handleReassign(null)}
              className="w-full text-left rounded-md border border-border bg-surface/60 hover:border-primary/30 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground italic">Unassign</span>
            </button>
            {buses.map((b) => (
              <button
                key={b.id}
                onClick={() => handleReassign(b.id)}
                className={`w-full text-left rounded-md border px-3 py-2 ${
                  reassign.assignedBusId === b.id ? "border-primary/60 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/30"
                }`}
              >
                <p className="text-sm font-medium">{b.busNumber}</p>
                <p className="text-[11px] text-muted-foreground">{b.routeName}</p>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
