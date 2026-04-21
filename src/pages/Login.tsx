import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Bus, Mail, Lock, AlertTriangle, User, Phone, IdCard } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { Modal } from "@/components/common/Modal";
import { ROLE_HOME } from "@/utils/constants";
import { isFirebaseConfigured } from "@/services/firebase";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  ensureDefaultAdminAccount,
  fetchUserProfile,
  normalizeLoginIdentifier,
  requestPasswordReset,
} from "@/services/authService";
import { auth, db } from "@/services/firebase";
import { createUserWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

type SignupRole = "student" | "driver";

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
  const { user, signIn, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [signupRole, setSignupRole] = useState<SignupRole>("student");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupRegNo, setSignupRegNo] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  const isAdminIdentifier = useMemo(() => {
    const id = identifier.trim().toLowerCase();
    return id === ADMIN_USERNAME || id === ADMIN_EMAIL;
  }, [identifier]);

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
      const normalizedIdentifier = normalizeLoginIdentifier(identifier);
      if (isAdminIdentifier) {
        if (password !== ADMIN_PASSWORD) {
          throw new Error("Invalid admin credentials.");
        }
        await ensureDefaultAdminAccount();
      }
      await signIn(normalizedIdentifier, password);
      // After signIn the auth context will populate; pull profile to redirect immediately.
      const fb = auth.currentUser;
      if (fb) {
        const profile = await fetchUserProfile(fb);
        if (!profile) {
          toast.error("No profile found for this account.");
          await signOut();
          return;
        }
        if (profile.role !== "admin" && profile.approvalStatus !== "approved") {
          const msg =
            profile.approvalStatus === "rejected"
              ? "Your account request was rejected. Contact the admin."
              : "Your account is pending admin approval.";
          toast.error(msg);
          await signOut();
          return;
        }
        navigate(ROLE_HOME[profile.role], { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error(msg.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!signupName.trim()) throw new Error("Name is required.");
      if (!signupEmail.trim()) throw new Error("Email is required.");
      if (!signupPhone.trim()) throw new Error("Phone number is required.");
      if (signupPassword.length < 6) throw new Error("Password must be at least 6 characters.");
      if (signupPassword !== signupConfirmPassword) throw new Error("Passwords do not match.");

      const normalizedEmail = signupEmail.trim().toLowerCase();
      if (signupRole === "student") {
        if (!normalizedEmail.endsWith(".edu.in")) {
          throw new Error("Student college email must end with .edu.in");
        }
        if (!signupRegNo.trim()) throw new Error("Registration number is required for students.");
      }

      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, signupPassword);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: normalizedEmail,
        name: signupName.trim(),
        role: signupRole,
        approvalStatus: "pending",
        assignedBusId: null,
        phoneNumber: signupPhone.trim(),
        registrationNumber: signupRole === "student" ? signupRegNo.trim() : null,
        collegeEmail: signupRole === "student" ? normalizedEmail : null,
        photoURL: null,
        createdAt: serverTimestamp(),
        requestedAt: serverTimestamp(),
      });

      await fbSignOut(auth);
      toast.success("Account created. Wait for admin approval before signing in.");
      setMode("signin");
      setIdentifier(normalizedEmail);
      setPassword("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      toast.error(msg.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
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

        <div className="mb-4 grid grid-cols-2 rounded-md border border-border p-1 bg-surface/40">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`h-9 rounded text-sm ${mode === "signin" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`h-9 rounded text-sm ${mode === "signup" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
          >
            Sign Up
          </button>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <FloatingInput
              id="identifier"
              type="text"
              value={identifier}
              onChange={setIdentifier}
              label="Email or Username"
              icon={Mail}
              autoComplete="username"
            />
            <FloatingInput id="password" type="password" value={password} onChange={setPassword} label="Password" icon={Lock} autoComplete="current-password" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Admin login: <span className="font-mono">{ADMIN_USERNAME}</span> / <span className="font-mono">{ADMIN_PASSWORD}</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(identifier);
                  setForgotOpen(true);
                }}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <Button type="submit" size="lg" loading={submitting} disabled={!isFirebaseConfigured} className="w-full mt-2">
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSignupRole("student")}
                className={`h-9 rounded-md border text-sm ${signupRole === "student" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setSignupRole("driver")}
                className={`h-9 rounded-md border text-sm ${signupRole === "driver" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                Driver
              </button>
            </div>

            <FloatingInput id="name" type="text" value={signupName} onChange={setSignupName} label="Full Name" icon={User} autoComplete="name" />
            <FloatingInput
              id="signup-email"
              type="email"
              value={signupEmail}
              onChange={setSignupEmail}
              label={signupRole === "student" ? "College Email (.edu.in)" : "Email"}
              icon={Mail}
              autoComplete="email"
            />
            <FloatingInput id="phone" type="tel" value={signupPhone} onChange={setSignupPhone} label="Phone Number" icon={Phone} autoComplete="tel" />
            {signupRole === "student" && (
              <FloatingInput id="regno" type="text" value={signupRegNo} onChange={setSignupRegNo} label="Registration Number" icon={IdCard} />
            )}
            <FloatingInput id="signup-password" type="password" value={signupPassword} onChange={setSignupPassword} label="Password" icon={Lock} autoComplete="new-password" />
            <FloatingInput
              id="signup-confirm-password"
              type="password"
              value={signupConfirmPassword}
              onChange={setSignupConfirmPassword}
              label="Confirm Password"
              icon={Lock}
              autoComplete="new-password"
            />

            <p className="text-[11px] text-muted-foreground">
              New accounts require admin approval before dashboard access.
            </p>
            <Button type="submit" size="lg" loading={submitting} disabled={!isFirebaseConfigured} className="w-full mt-2">
              Create Account
            </Button>
          </form>
        )}

        <div className="mt-4 text-[11px] text-muted-foreground text-center">
          {mode === "signin"
            ? "Students and drivers can sign up from this page."
            : "After signup, admin approves requests in Manage Drivers / Manage Users."}
        </div>

        {!isFirebaseConfigured && (
          <div className="mt-4 p-3 rounded-md border border-warning/30 bg-warning/10 text-[11px] text-warning">
            Add Firebase config in .env before using auth.
          </div>
        )}
      </div>

      <Modal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset your password">
        <p className="text-sm text-muted-foreground">
          We'll email you a secure link to set a new password.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!forgotEmail) return;
            setForgotSending(true);
            try {
              await requestPasswordReset(forgotEmail);
              toast.success(`Reset link sent to ${forgotEmail}`);
              setForgotOpen(false);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to send reset email";
              toast.error(msg.replace("Firebase: ", ""));
            } finally {
              setForgotSending(false);
            }
          }}
        >
          <input
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full h-10 rounded-md bg-input border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotSending}>
              Cancel
            </Button>
            <Button type="submit" loading={forgotSending} disabled={!isFirebaseConfigured}>
              Send reset link
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
