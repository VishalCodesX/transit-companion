import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Plus, UserCog } from "lucide-react";
import { db, firebaseConfig } from "@/services/firebase";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { Spinner } from "@/components/common/Spinner";
import { useAllBuses } from "@/hooks/useBuses";
import { useAllUsers, type UserDoc } from "@/hooks/useUsers";
import { useTripHistory } from "@/hooks/useTripHistory";

interface NewDriver { name: string; email: string; password: string; assignedBusId: string | null; }
const EMPTY: NewDriver = { name: "", email: "", password: "", assignedBusId: null };

export default function AdminDrivers() {
  const { users, loading } = useAllUsers();
  const { buses } = useAllBuses();
  const { trips } = useTripHistory();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewDriver>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [reassign, setReassign] = useState<UserDoc | null>(null);

  const drivers = useMemo(() => users.filter((u) => u.role === "driver"), [users]);
  const tripCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of trips) m.set(t.driverId, (m.get(t.driverId) ?? 0) + 1);
    return m;
  }, [trips]);

  async function handleCreate() {
    if (!form.name || !form.email || form.password.length < 6) {
      toast.error("Name, email, and a 6+ character password are required.");
      return;
    }
    setSaving(true);
    const secondary = initializeApp(firebaseConfig, "transitiq-create-driver");
    try {
      const cred = await createUserWithEmailAndPassword(getAuth(secondary), form.email, form.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: form.email,
        name: form.name,
        role: "driver",
        assignedBusId: form.assignedBusId,
        photoURL: null,
        createdAt: serverTimestamp(),
      });
      if (form.assignedBusId) {
        await setDoc(doc(db, "buses", form.assignedBusId), { driverId: cred.user.uid, driverName: form.name }, { merge: true });
      }
      toast.success(`${form.name} added`);
      setCreating(false);
      setForm(EMPTY);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create driver");
    } finally {
      await deleteApp(secondary).catch(() => {});
      setSaving(false);
    }
  }

  async function handleReassign(busId: string | null) {
    if (!reassign) return;
    setSaving(true);
    try {
      // Clear from old bus
      if (reassign.assignedBusId && reassign.assignedBusId !== busId) {
        await setDoc(doc(db, "buses", reassign.assignedBusId), { driverId: null, driverName: null }, { merge: true });
      }
      await setDoc(doc(db, "users", reassign.uid), { assignedBusId: busId }, { merge: true });
      if (busId) {
        await setDoc(doc(db, "buses", busId), { driverId: reassign.uid, driverName: reassign.name }, { merge: true });
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
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
            <p className="text-sm text-muted-foreground">Add drivers and manage bus assignments.</p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Add Driver</Button>
        </header>

        <div className="glass rounded-xl p-4">
          {loading ? (
            <div className="py-10 flex items-center justify-center"><Spinner /></div>
          ) : drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No drivers yet.</p>
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
                  {drivers.map((d) => {
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
                            Reassign
                          </Button>
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

      {/* Create driver modal */}
      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Add a driver">
        <div className="space-y-3">
          <Field label="Full Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input font-mono" />
          </Field>
          <Field label="Password (min 6 chars)">
            <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input font-mono" />
          </Field>
          <Field label="Assign to Bus (optional)">
            <select
              value={form.assignedBusId ?? ""}
              onChange={(e) => setForm({ ...form, assignedBusId: e.target.value || null })}
              className="input"
            >
              <option value="">— None —</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>{b.busNumber} · {b.routeName}</option>
              ))}
            </select>
          </Field>
          <p className="text-[11px] text-muted-foreground">
            Note: this signs the new driver in temporarily on a secondary Firebase app to provision their auth account, then signs them out.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Reassign */}
      <Modal isOpen={!!reassign} onClose={() => setReassign(null)} title={reassign ? `Reassign ${reassign.name}` : ""}>
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

      <style>{`
        .input {
          width: 100%; height: 40px; padding: 0 12px;
          background: hsl(var(--input)); color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border)); border-radius: 6px;
          font-size: 14px; outline: none; transition: border-color 150ms;
        }
        .input:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 2px hsl(var(--ring) / 0.3); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
