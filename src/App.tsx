import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import DriverDashboard from "./pages/driver/Dashboard";
import StudentDashboard from "./pages/student/Dashboard";
import AdminOverview from "./pages/admin/Overview";
import AdminFleet from "./pages/admin/Fleet";
import AdminBuses from "./pages/admin/Buses";
import AdminDrivers from "./pages/admin/Drivers";
import AdminHistory from "./pages/admin/History";
import AdminNotifications from "./pages/admin/Notifications";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import { OfflineBanner } from "@/components/common/OfflineBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HotToaster
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
            <Route path="/admin/history" element={<ProtectedRoute allow={["admin"]}><AdminHistory /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute allow={["admin"]}><AdminNotifications /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
