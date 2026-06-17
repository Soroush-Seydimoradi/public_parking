import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { DashboardLayout } from "./components/dashboard-layout";
import { ProtectedRoute } from "./components/protected-route";
import { AuthProvider } from "./context/auth-context";
import { LoginPage } from "./pages/login-page";
import { DashboardPage } from "./pages/dashboard-page";
import { VehicleEntryPage } from "./pages/vehicle-entry-page";
import { VehicleExitPage } from "./pages/vehicle-exit-page";
import { ActiveVehiclesPage } from "./pages/active-vehicles-page";
import { ParkingSpotsPage } from "./pages/parking-spots-page";
import { UsersPage } from "./pages/users-page";
import { TariffsPage } from "./pages/tariffs-page";
import { ShiftsPage } from "./pages/shifts-page";
import { ReportsPage } from "./pages/reports-page";
import { SettingsPage } from "./pages/settings-page";

function withDashboard(page: React.ReactNode) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{page}</DashboardLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route path="/dashboard" element={withDashboard(<DashboardPage />)} />
            <Route path="/vehicle-entry" element={withDashboard(<VehicleEntryPage />)} />
            <Route path="/vehicle-exit" element={withDashboard(<VehicleExitPage />)} />
            <Route path="/active-vehicles" element={withDashboard(<ActiveVehiclesPage />)} />
            <Route path="/parking-spots" element={withDashboard(<ParkingSpotsPage />)} />
            <Route path="/users" element={withDashboard(<UsersPage />)} />
            <Route path="/tariffs" element={withDashboard(<TariffsPage />)} />
            <Route path="/shifts" element={withDashboard(<ShiftsPage />)} />
            <Route path="/reports" element={withDashboard(<ReportsPage />)} />
            <Route path="/settings" element={withDashboard(<SettingsPage />)} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  );
}
