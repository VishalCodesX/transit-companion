import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bus, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/services/firebase";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";

/** Handles the link Firebase emails after a password reset request.
 *  URL pattern: /reset-password?mode=resetPassword&oobCode=xxx */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = params.get("oobCode") ?? "";
  const mode = params.get("mode");

  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !oobCode || mode !== "resetPassword") {
      setVerifying(false);
      setVerifyError("Invalid or expired reset link.");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((mail) => setEmail(mail))
      .catch((e) => setVerifyError(e?.message?.replace("Firebase: ", "") ?? "Invalid reset link."))
      .finally(() => setVerifying(false));
  }, [oobCode, mode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
      toast.success("Password updated. You can sign in now.");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(msg.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-elevated rounded-2xl p-8 animate-fade-in">
        <header className="flex items-center justify-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
            <Bus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">TransitIQ</h1>
            <p className="text-[11px] text-muted-foreground">Reset your password</p>
          </div>
        </header>

        {verifying ? (
          <div className="py-10 flex justify-center"><Spinner size="lg" /></div>
        ) : verifyError ? (
          <div className="space-y-4">
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{verifyError}</p>
            </div>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="font-medium">Password updated</p>
            <p className="text-xs text-muted-foreground">Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {email && (
              <p className="text-xs text-muted-foreground text-center mb-2">
                Setting a new password for <span className="font-mono text-foreground">{email}</span>
              </p>
            )}
            <PasswordInput id="pw" value={password} onChange={setPassword} label="New password" />
            <PasswordInput id="pw2" value={confirm} onChange={setConfirm} label="Confirm password" />
            <Button type="submit" size="lg" loading={submitting} className="w-full mt-2">
              Update password
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

function PasswordInput({
  id, value, onChange, label,
}: { id: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        placeholder=" "
        className="peer w-full h-12 pl-10 pr-3 pt-4 pb-1 rounded-md bg-input border border-border text-foreground
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        required
        minLength={8}
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
