import { Bus, Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/utils/constants";

interface Props {
  title: string;
  subtitle?: string;
}

/** Used for /student and /admin pages until those phases are built. */
export default function ComingSoon({ title, subtitle }: Props) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-elevated rounded-2xl p-10 max-w-lg w-full text-center animate-fade-in">
        <div className="h-14 w-14 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mx-auto mb-4">
          <Construction className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {subtitle ?? "This dashboard is part of an upcoming phase. Phase 1 ships the driver experience."}
        </p>
        {user && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Bus className="h-4 w-4 text-primary" />
            <span className="text-sm">Signed in as <span className="font-medium">{user.name}</span> · <span className="text-muted-foreground capitalize">{user.role}</span></span>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-2">
          {user && (
            <Link to={ROLE_HOME[user.role]}>
              <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to dashboard</Button>
            </Link>
          )}
          <Button variant="ghost" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
