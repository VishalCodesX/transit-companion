import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Bus, Database, Mail, Lock, AlertTriangle, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { ROLE_HOME } from "@/utils/constants";
import { isFirebaseConfigured } from "@/services/firebase";
import { fetchUserProfile } from "@/services/authService";
import { auth } from "@/services/firebase";
import { seedDatabase, SEED_CREDENTIALS } from "@/utils/seedDatabase";

const isDev = import.meta.env.DEV;

function FloatingInput({
  id,
  type,
  value,
  onChange,
  label,
  icon: Icon,
  autoComplete,
}: {
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  icon: typeof Mail;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        className="peer w-full h-12 pl-10 pr-3 pt-4 pb-1 rounded-md bg-input border border-border text-foreground
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        required
      />
      <label
        htmlFor={id}
        className="absolute left-10 text-xs text-muted-foreground top-1.5 pointer-events-none transition-all
                   peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm
                   peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary"
      >
        {label}
      </label>
    </div>
  );
}

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showCreds, setShowCreds] = useState(false);

  // Already signed in? Redirect.
  useEffect(() => {
    if (!loading && user) navigate(ROLE_HOME[user.role], { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      // After signIn the auth context will populate; pull profile to redirect immediately.
      const fb = auth.currentUser;
      if (fb) {
        const profile = await fetchUserProfile(fb);
        if (profile) navigate(ROLE_HOME[profile.role], { replace: true });
        else toast.error("No profile found for this account.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error(msg.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    const t = toast.loading("Seeding demo data…");
    try {
      const res = await seedDatabase();
      toast.success(
        `Seed complete — ${res.buses} buses, ${res.accountsCreated} new account(s)` +
          (res.accountsSkipped ? `, ${res.accountsSkipped} already existed` : ""),
        { id: t },
      );
      if (res.errors.length) console.warn("Seed errors:", res.errors);
      setShowCreds(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Seed failed", { id: t });
    } finally {
      setSeeding(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied"));
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-elevated rounded-2xl p-8 animate-fade-in">
        <header className="flex items-center justify-center gap-2.5 mb-7">
          <div className="h-10 w-10 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
            <Bus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">TransitIQ</h1>
            <p className="text-[11px] text-muted-foreground">Smart Bus Tracking</p>
          </div>
        </header>

        {!isFirebaseConfigured && (
          <div className="mb-5 flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Firebase isn't configured yet. Add your <code className="font-mono">VITE_FIREBASE_*</code> env vars in
              project settings, then reload to enable sign-in and seeding.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <FloatingInput id="email" type="email" value={email} onChange={setEmail} label="Email" icon={Mail} autoComplete="email" />
          <FloatingInput id="password" type="password" value={password} onChange={setPassword} label="Password" icon={Lock} autoComplete="current-password" />
          <Button type="submit" size="lg" loading={submitting} disabled={!isFirebaseConfigured} className="w-full mt-2">
            Sign In
          </Button>
        </form>

        {isDev && (
          <div className="mt-6 pt-6 border-t border-border">
            <Button
              variant="outline"
              size="md"
              loading={seeding}
              disabled={!isFirebaseConfigured}
              onClick={handleSeed}
              leftIcon={<Database className="h-4 w-4" />}
              className="w-full"
            >
              Initialize Demo Data
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              Dev only · creates 3 buses, 1 admin, 2 drivers, 3 students
            </p>

            {showCreds && (
              <div className="mt-4 space-y-1.5 animate-fade-in">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Demo accounts</p>
                {SEED_CREDENTIALS.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => {
                      setEmail(c.email);
                      setPassword(c.password);
                      copy(`${c.email} / ${c.password}`);
                    }}
                    className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-left hover:border-primary/50 transition-colors"
                  >
                    <span className="text-xs">
                      <span className="text-muted-foreground capitalize mr-2">{c.role}</span>
                      <span className="font-mono">{c.email}</span>
                    </span>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
