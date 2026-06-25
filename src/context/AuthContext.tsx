import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchUserProfile, onAuthChange, signIn as svcSignIn, signOut as svcSignOut, type AppUser } from "@/services/authService";

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

const RETRY_MAX = 5;
const RETRY_MS = 600;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        retryRef.current = 0;
        tryProfile(fbUser);
      } catch {
        setLoading(false);
      }
    });
    return () => {
      unsub?.();
      clearTimeout(timerRef.current);
    };
  }, []);

  function tryProfile(fbUser: import("firebase/auth").User) {
    clearTimeout(timerRef.current);
    fetchUserProfile(fbUser).then((profile) => {
      if (profile) {
        setUser(profile);
        setLoading(false);
        return;
      }
      retryRef.current++;
      if (retryRef.current < RETRY_MAX) {
        timerRef.current = setTimeout(() => tryProfile(fbUser), RETRY_MS * retryRef.current);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
  }

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        await svcSignIn(email, password);
      },
      signOut: async () => {
        await svcSignOut();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
