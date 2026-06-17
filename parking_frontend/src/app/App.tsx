import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { DashboardLayout } from "./components/dashboard-layout";
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

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Login Route */}
          <Route path="/" element={<LoginPage />} />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout><DashboardPage /></DashboardLayout>} />
          <Route path="/vehicle-entry" element={<DashboardLayout><VehicleEntryPage /></DashboardLayout>} />
          <Route path="/vehicle-exit" element={<DashboardLayout><VehicleExitPage /></DashboardLayout>} />
          <Route path="/active-vehicles" element={<DashboardLayout><ActiveVehiclesPage /></DashboardLayout>} />
          <Route path="/parking-spots" element={<DashboardLayout><ParkingSpotsPage /></DashboardLayout>} />
          <Route path="/users" element={<DashboardLayout><UsersPage /></DashboardLayout>} />
          <Route path="/tariffs" element={<DashboardLayout><TariffsPage /></DashboardLayout>} />
          <Route path="/shifts" element={<DashboardLayout><ShiftsPage /></DashboardLayout>} />
          <Route path="/reports" element={<DashboardLayout><ReportsPage /></DashboardLayout>} />
          <Route path="/settings" element={<DashboardLayout><SettingsPage /></DashboardLayout>} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}