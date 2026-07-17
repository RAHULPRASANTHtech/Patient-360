import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginScreen from "@/components/LoginScreen";
import { DashboardLayout } from "@/components/DashboardLayout";
import DashboardHome from "@/pages/DashboardHome";
import PatientsPage from "@/pages/PatientsPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import ClinicalVisitsPage from "@/pages/ClinicalVisitsPage";
import MedVaultPage from "@/pages/MedVaultPage";
import BillingPage from "@/pages/BillingPage";
import ReceptionIntakePage from "@/pages/ReceptionIntakePage";
import NotFound from "@/pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboard from "./pages/AdminDashboard";
const queryClient = new QueryClient();

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) return <LoginScreen />;

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/intake" element={<ReceptionIntakePage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/visits" element={<ClinicalVisitsPage />} />
        <Route path="/medvault" element={<MedVaultPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </DashboardLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
