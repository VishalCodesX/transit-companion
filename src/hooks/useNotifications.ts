import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, addDoc, serverTimestamp, Timestamp, type DocumentData } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/services/firebase";
import type { Role } from "@/utils/constants";

export interface NotificationDoc {
  id: string;
  targetRole: Role | "all";
  message: string;
  busId: string | null;
  createdAt: Timestamp | null;
  isRead: boolean;
}

function toNotif(id: string, d: DocumentData): NotificationDoc {
  return {
    id,
    targetRole: d.targetRole ?? "all",
    message: d.message ?? "",
    busId: d.busId ?? null,
    createdAt: d.createdAt ?? null,
    isRead: d.isRead ?? false,
  };
}

export function useNotifications(forRole?: Role) {
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      let list = snap.docs.map((d) => toNotif(d.id, d.data()));
      if (forRole) list = list.filter((n) => n.targetRole === "all" || n.targetRole === forRole);
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, [forRole]);

  return { items, loading };
}

export async function sendNotification(input: {
  targetRole: Role | "all";
  message: string;
  busId: string | null;
}) {
  await addDoc(collection(db, "notifications"), {
    ...input,
    createdAt: serverTimestamp(),
    isRead: false,
  });
}
