import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME, type Role } from "@/utils/constants";
import { Spinner } from "@/components/common/Spinner";

interface Props {
  allow: Role[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allow, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children}</>;
}
