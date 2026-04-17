import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { db } from "@/services/firebase";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { Badge, LiveDot } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { Spinner } from "@/components/common/Spinner";
import { useAllBuses, type BusDoc } from "@/hooks/useBuses";
import { useAllUsers } from "@/hooks/useUsers";

interface BusForm {
  id: string;
  busNumber: string;
  routeName: string;
  licensePlate: string;
  capacity: number;
  lat: number;
  lng: number;
}

const EMPTY: BusForm = { id: "", busNumber: "", routeName: "", licensePlate: "", capacity: 40, lat: 12.97, lng: 77.59 };

export default function AdminBuses() {
  const { buses, loading } = useAllBuses();
  const { users } = useAllUsers();
  const drivers = users.filter((u) => u.role === "driver");

  const [editing, setEditing] = useState<BusForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<BusDoc | null>(null);
  const [confirmDel, setConfirmDel] = useState<BusDoc | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing({ ...EMPTY });
    setCreating(true);
  }

  function openEdit(b: BusDoc) {
    setEditing({
      id: b.id,
      busNumber: b.busNumber,
      routeName: b.routeName,
      licensePlate: b.licensePlate,
      capacity: b.capacity,
      lat: b.lat,
      lng: b.lng,
    });
    setCreating(false);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.id || !editing.busNumber) {
      toast.error("Bus ID and number are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        busNumber: editing.busNumber,
        routeName: editing.routeName,
        licensePlate: editing.licensePlate,
        capacity: Number(editing.capacity) || 0,
        lat: Number(editing.lat) || 0,
        lng: Number(editing.lng) || 0,
        ...(creating ? {
          heading: 0, speed: 0, status: "idle", driverId: null, driverName: null,
          currentTripId: null, lastUpdated: serverTimestamp(),
        } : {}),
      };
      await setDoc(doc(db, "buses", editing.id), payload, { merge: true });
      toast.success(creating ? "Bus created" : "Bus updated");
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDel) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "buses", confirmDel.id));
      toast.success(`Deleted ${confirmDel.busNumber}`);
      setConfirmDel(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(driverId: string | null) {
    if (!assigning) return;
    const driver = drivers.find((d) => d.uid === driverId) ?? null;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "buses", assigning.id),
        { driverId: driver?.uid ?? null, driverName: driver?.name ?? null },
        { merge: true },
      );
      // Update the driver's profile too
      if (driver) {
        await setDoc(doc(db, "users", driver.uid), { assignedBusId: assigning.id }, { merge: true });
      }
      toast.success(driver ? `Assigned ${driver.name}` : "Driver unassigned");
      setAssigning(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Buses</h1>
            <p className="text-sm text-muted-foreground">Manage your fleet — add, edit, and assign drivers.</p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Bus</Button>
        </header>

        <div className="glass rounded-xl p-4">
          {loading ? (
            <div className="py-10 flex items-center justify-center"><Spinner /></div>
          ) : buses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No buses yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-2 py-2 font-medium">ID</th>
                    <th className="px-2 py-2 font-medium">Number</th>
                    <th className="px-2 py-2 font-medium">Route</th>
                    <th className="px-2 py-2 font-medium">Plate</th>
                    <th className="px-2 py-2 font-medium">Cap.</th>
                    <th className="px-2 py-2 font-medium">Driver</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Updated</th>
                    <th className="px-2 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buses.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{b.id}</td>
                      <td className="px-2 py-2 font-medium">{b.busNumber}</td>
                      <td className="px-2 py-2 text-muted-foreground">{b.routeName}</td>
                      <td className="px-2 py-2 font-mono text-xs">{b.licensePlate}</td>
                      <td className="px-2 py-2 font-mono text-xs">{b.capacity}</td>
                      <td className="px-2 py-2">{b.driverName ?? <span className="text-muted-foreground italic">unassigned</span>}</td>
                      <td className="px-2 py-2">
                        <Badge variant={b.status === "active" ? "success" : b.status === "idle" ? "warning" : "neutral"} className="gap-1">
                          {b.status === "active" && <LiveDot />} {b.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-muted-foreground">
                        {b.lastUpdated ? formatDistanceToNow(b.lastUpdated.toDate(), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" leftIcon={<UserCog className="h-3.5 w-3.5" />} onClick={() => setAssigning(b)}>Assign</Button>
                          <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(b)}>Edit</Button>
                          <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3.5 w-3.5 text-destructive" />} onClick={() => setConfirmDel(b)}>
                            <span className="text-destructive">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit / Create modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={creating ? "Add a bus" : "Edit bus"}>
        {editing && (
          <div className="space-y-3">
            <Field label="Bus ID (document key)" disabled={!creating}>
              <input
                value={editing.id}
                disabled={!creating}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                placeholder="bus-04"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bus Number">
                <input value={editing.busNumber} onChange={(e) => setEditing({ ...editing, busNumber: e.target.value })} placeholder="Bus 04" className="input" />
              </Field>
              <Field label="License Plate">
                <input value={editing.licensePlate} onChange={(e) => setEditing({ ...editing, licensePlate: e.target.value })} placeholder="UNIV-004" className="input" />
              </Field>
            </div>
            <Field label="Route Name">
              <input value={editing.routeName} onChange={(e) => setEditing({ ...editing, routeName: e.target.value })} placeholder="Route D — West Campus" className="input" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Capacity">
                <input type="number" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: +e.target.value })} className="input font-mono" />
              </Field>
              <Field label="Latitude">
                <input type="number" step="0.0001" value={editing.lat} onChange={(e) => setEditing({ ...editing, lat: +e.target.value })} className="input font-mono" />
              </Field>
              <Field label="Longitude">
                <input type="number" step="0.0001" value={editing.lng} onChange={(e) => setEditing({ ...editing, lng: +e.target.value })} className="input font-mono" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>{creating ? "Create" : "Save"}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign driver modal */}
      <Modal isOpen={!!assigning} onClose={() => setAssigning(null)} title={assigning ? `Assign driver to ${assigning.busNumber}` : ""}>
        {assigning && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a driver to assign to this bus. Choose "Unassigned" to remove the current driver.</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              <button
                onClick={() => handleAssign(null)}
                className="w-full text-left rounded-md border border-border bg-surface/60 hover:border-primary/30 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground italic">Unassigned</span>
              </button>
              {drivers.map((d) => (
                <button
                  key={d.uid}
                  onClick={() => handleAssign(d.uid)}
                  className="w-full text-left rounded-md border border-border bg-surface/60 hover:border-primary/30 px-3 py-2"
                >
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{d.email}</p>
                </button>
              ))}
              {drivers.length === 0 && <p className="text-sm text-muted-foreground">No drivers exist yet. Add one from the Drivers page.</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete bus?">
        <p className="text-sm text-muted-foreground">
          This permanently deletes <span className="text-foreground font-medium">{confirmDel?.busNumber}</span>. Trip history is preserved.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDel(null)} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>Delete</Button>
        </div>
      </Modal>

      <style>{`
        .input {
          width: 100%; height: 40px; padding: 0 12px;
          background: hsl(var(--input)); color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border)); border-radius: 6px;
          font-size: 14px; outline: none; transition: border-color 150ms;
        }
        .input:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 2px hsl(var(--ring) / 0.3); }
        .input:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Field({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="block">
      <span className={`text-[11px] uppercase tracking-wider mb-1 block ${disabled ? "text-muted-foreground/50" : "text-muted-foreground"}`}>{label}</span>
      {children}
    </label>
  );
}
