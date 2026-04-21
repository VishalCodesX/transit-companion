import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Check, X } from "lucide-react";
import { db } from "@/services/firebase";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Avatar } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { useAllUsers } from "@/hooks/useUsers";

export default function AdminUsers() {
  const { users, loading } = useAllUsers();
  const [savingUid, setSavingUid] = useState<string | null>(null);

  const students = useMemo(
    () => users.filter((u) => u.role === "student"),
    [users],
  );
  const pendingStudents = students.filter((u) => u.approvalStatus === "pending");
  const approvedStudents = students.filter((u) => u.approvalStatus === "approved");

  async function handleReview(uid: string, decision: "approved" | "rejected") {
    setSavingUid(uid);
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          approvalStatus: decision,
          reviewedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success(`Student request ${decision}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setSavingUid(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Manage Users</h1>
          <p className="text-sm text-muted-foreground">Review student signup requests and approve access.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="xl:col-span-1 glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Pending Requests</h2>
              <Badge variant="warning">{pendingStudents.length}</Badge>
            </div>
            {loading ? (
              <div className="py-10 flex justify-center"><Spinner /></div>
            ) : pendingStudents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending student requests.</p>
            ) : (
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {pendingStudents.map((s) => (
                  <div key={s.uid} className="rounded-md border border-border bg-surface/60 p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar name={s.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">{s.email}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Reg No: <span className="text-foreground font-mono">{s.registrationNumber ?? "—"}</span></p>
                    <p className="text-[11px] text-muted-foreground">Phone: <span className="text-foreground font-mono">{s.phoneNumber ?? "—"}</span></p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1"
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                        onClick={() => handleReview(s.uid, "approved")}
                        loading={savingUid === s.uid}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        leftIcon={<X className="h-3.5 w-3.5" />}
                        onClick={() => handleReview(s.uid, "rejected")}
                        disabled={savingUid === s.uid}
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
            <h2 className="text-sm font-semibold mb-3">Approved Students</h2>
            {loading ? (
              <div className="py-10 flex justify-center"><Spinner /></div>
            ) : approvedStudents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No approved students yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Email</th>
                      <th className="px-2 py-2 font-medium">Reg No</th>
                      <th className="px-2 py-2 font-medium">Phone</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedStudents.map((s) => (
                      <tr key={s.uid} className="border-t border-border">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.name} size="sm" />
                            <span className="font-medium">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs font-mono">{s.email}</td>
                        <td className="px-2 py-2 text-xs font-mono">{s.registrationNumber ?? "—"}</td>
                        <td className="px-2 py-2 text-xs font-mono">{s.phoneNumber ?? "—"}</td>
                        <td className="px-2 py-2"><Badge variant="success">approved</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
