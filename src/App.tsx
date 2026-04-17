import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import Login from "./pages/Login";
import DriverDashboard from "./pages/driver/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

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
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/driver"
              element={
                <ProtectedRoute allow={["driver"]}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/history"
              element={
                <ProtectedRoute allow={["driver"]}>
                  <ComingSoon title="Trip History" subtitle="Detailed trip logs ship in a later phase." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/notifications"
              element={
                <ProtectedRoute allow={["driver"]}>
                  <ComingSoon title="Notifications" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student"
              element={
                <ProtectedRoute allow={["student"]}>
                  <ComingSoon title="Student Dashboard" subtitle="Live tracking and ETAs ship in Phase 2." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <ComingSoon title="Admin Console" subtitle="Fleet, drivers, and history ship in Phase 3." />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
