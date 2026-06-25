import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { Spinner } from "@/components/common/Spinner";
import { OfflineBanner } from "@/components/common/OfflineBanner";

const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DriverDashboard = lazy(() => import("./pages/driver/Dashboard"));
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminFleet = lazy(() => import("./pages/admin/Fleet"));
const AdminBuses = lazy(() => import("./pages/admin/Buses"));
const AdminDrivers = lazy(() => import("./pages/admin/Drivers"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminHistory = lazy(() => import("./pages/admin/History"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(220 26% 15% / 0.92)",
            color: "hsl(213 27% 91%)",
            border: "1px solid hsl(215 14% 26%)",
            backdropFilter: "blur(12px)",
            fontSize: "13px",
          },
        }}
      />
      <BrowserRouter>
        <AuthProvider>
          <OfflineBanner />
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Driver */}
              <Route path="/driver" element={<ProtectedRoute allow={["driver"]}><DriverDashboard /></ProtectedRoute>} />
              <Route path="/driver/history" element={<ProtectedRoute allow={["driver"]}><ComingSoon title="Trip History" subtitle="Your personal trip log will live here." /></ProtectedRoute>} />
              <Route path="/driver/notifications" element={<ProtectedRoute allow={["driver"]}><ComingSoon title="Notifications" /></ProtectedRoute>} />

              {/* Student */}
              <Route path="/student" element={<ProtectedRoute allow={["student"]}><StudentDashboard /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute allow={["admin"]}><AdminOverview /></ProtectedRoute>} />
              <Route path="/admin/fleet" element={<ProtectedRoute allow={["admin"]}><AdminFleet /></ProtectedRoute>} />
              <Route path="/admin/buses" element={<ProtectedRoute allow={["admin"]}><AdminBuses /></ProtectedRoute>} />
              <Route path="/admin/drivers" element={<ProtectedRoute allow={["admin"]}><AdminDrivers /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allow={["admin"]}><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/history" element={<ProtectedRoute allow={["admin"]}><AdminHistory /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allow={["admin"]}><AdminNotifications /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
