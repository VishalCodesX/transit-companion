import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { Check, Send, Bell } from "lucide-react";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { useAllBuses } from "@/hooks/useBuses";
import { useNotifications, sendNotification, markNotificationRead } from "@/hooks/useNotifications";
import type { Role } from "@/utils/constants";

export default function AdminNotifications() {
  const { buses } = useAllBuses();
  const { items, loading } = useNotifications();
  const [target, setTarget] = useState<Role | "all">("all");
  const [busId, setBusId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) {
      toast.error("Message can't be empty");
      return;
    }
    setSending(true);
    try {
      await sendNotification({ targetRole: target, message: message.trim(), busId: busId || null });
      toast.success("Notification sent");
      setMessage("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 max-w-[1100px] mx-auto w-full">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Broadcast announcements to students or drivers.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Compose</h2>
            <div className="space-y-3">
              <Field label="Target Audience">
                <select value={target} onChange={(e) => setTarget(e.target.value as Role | "all")} className="w-full h-10 px-3 bg-input text-foreground border border-border rounded-md text-sm outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30">
                  <option value="all">Everyone</option>
                  <option value="student">Students only</option>
                  <option value="driver">Drivers only</option>
                </select>
              </Field>
              <Field label="Linked Bus (optional)">
                <select value={busId} onChange={(e) => setBusId(e.target.value)} className="w-full h-10 px-3 bg-input text-foreground border border-border rounded-md text-sm outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30">
                  <option value="">— None —</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>{b.busNumber} · {b.routeName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Message">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="e.g. Bus 03 will be delayed by 10 minutes due to traffic."
                  className="w-full h-10 min-h-[100px] px-3 py-2 bg-input text-foreground border border-border rounded-md text-sm outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30 resize-y"
                />
              </Field>
              <Button onClick={handleSend} loading={sending} className="w-full" leftIcon={<Send className="h-4 w-4" />}>
                Send Notification
              </Button>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Recent</h2>
            {loading ? (
              <div className="py-10 flex items-center justify-center"><Spinner /></div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No notifications yet.</p>
            ) : (
              <ul className="space-y-2.5 max-h-[440px] overflow-y-auto">
                {items.map((n) => {
                  const linked = n.busId ? buses.find((b) => b.id === n.busId)?.busNumber : null;
                  return (
                    <li key={n.id} className={`border-l-2 pl-3 py-1.5 ${n.isRead ? "border-border opacity-60" : "border-primary/60"}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Badge variant="info">{n.targetRole === "all" ? "Everyone" : `${n.targetRole}s`}</Badge>
                        <div className="flex items-center gap-1.5">
                          {linked && <Badge variant="neutral">{linked}</Badge>}
                          {!n.isRead && (
                            <button
                              onClick={() => markNotificationRead(n.id)}
                              className="text-primary hover:text-primary/80"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm">{n.message}</p>
                      {n.createdAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>


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
