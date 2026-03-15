import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import Navbar from "./Navbar";
import ChatbotWidget from "./ChatbotWidget";
import NotFound from "../Pages/NotFound";
import AdminUsersManagement from "./AdminUsersManagement";
import PharmacyManagement from "./PharmacyManagement";
import MedicineCataloguePage from "./MedicineCataloguePage";
import CategoryFormulationsPage from "./CategoryFormulationsPage";
import FormulationDrugsPage from "./FormulationDrugsPage";
import AddMedicationPage from "./AddMedicationPage";
import ConsultationManagement from "./ConsultationManagement";
import HospitalsManagement from "./HospitalsManagement";
import PatientsManagement from "./PatientsManagement";
import LaboratoryManagement from "./LaboratoryManagement";
import KenyaLabTestsPage from "./KenyaLabTestsPage";
import CreateLabTestPage from "./CreateLabTestPage";
import BillingPaymentsManagement from "./BillingPaymentsManagement";
import WardManagement from "./WardManagement";
import DietManagement from "./DietManagement";
import InventoryManagement from "./InventoryManagement";
import RecordConsultationPage from "./RecordConsultationPage";
import ConsultationViewPage from "./ConsultationViewPage";
import PatientReportsPage from "./PatientReportsPage";
import AuditLogsPage from "./AuditLogsPage";
import DashboardPage from "./DashboardPage";
import SettingsPage from "./SettingsPage";
import ChatPage from "./ChatPage";
import Account from "./Account";

function PageRoutes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isChatPage = location.pathname.endsWith("/chat") || location.pathname === "chat";

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  // Outer: full viewport height, no body scroll. Main: starts below header, fixed height, scrollbar only in content area.
  const headerHeight = 64; // match MUI Toolbar default
  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Navbar user={user} setUser={setUser} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`,
          minHeight: 0,
          bgcolor: "grey.50",
          overflow: "auto",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
            <CircularProgress />
          </Box>
        ) : !user ? (
          <Navigate to="/" replace />
        ) : (
          <Routes>
            <Route path="home" element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<AdminUsersManagement />} />
            <Route path="pharmacy" element={<PharmacyManagement />} />
            <Route path="pharmacy/medicine-catalogue" element={<MedicineCataloguePage />} />
            <Route path="pharmacy/medicine-catalogue/category/:categoryId" element={<CategoryFormulationsPage />} />
            <Route path="pharmacy/medicine-catalogue/category/:categoryId/formulation" element={<FormulationDrugsPage />} />
            <Route path="pharmacy/add-medication" element={<AddMedicationPage />} />
            <Route path="appointments" element={<ConsultationManagement />} />
            <Route path="appointments/record-consultation" element={<RecordConsultationPage />} />
            <Route path="appointments/consultation/:id" element={<ConsultationViewPage />} />
            <Route path="patients" element={<PatientsManagement />} />
            <Route path="patients/:patientId/reports" element={<PatientReportsPage />} />
            <Route path="laboratory" element={<LaboratoryManagement />} />
            <Route path="laboratory/create-lab-test" element={<CreateLabTestPage />} />
            <Route path="laboratory/kenya-lab-tests" element={<KenyaLabTestsPage />} />
            <Route path="hospitals" element={<HospitalsManagement />} />
            <Route path="billing" element={<BillingPaymentsManagement />} />
            <Route path="ward" element={<WardManagement />} />
            <Route path="diet" element={<DietManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </Box>
      {user && !isChatPage && (
        <ChatbotWidget
          initialMessages={[
            {
              from: "ai",
              text: "Hi! I'm here to help you navigate Carlvyne SHMS. Ask me about appointments, patients, billing, pharmacy, wards, diet, lab, and more.",
            },
          ]}
          subtitle="Ask me how to navigate the system."
          buttonLabel="Health chat"
          buttonIcon={<MedicalServicesIcon sx={{ fontSize: 26 }} />}
          placeholder="Ask about appointments, billing, patients, pharmacy..."
        />
      )}
    </Box>
  );
}

export default PageRoutes;
