import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import Navbar from "./Navbar";
import NotFound from "../Pages/NotFound";
import AdminUsersManagement from "./AdminUsersManagement";
import PharmacyManagement from "./PharmacyManagement";
import VisitsManagement from "./VisitsManagement";
import HospitalsManagement from "./HospitalsManagement";
import WalkInPatientCreate from "./WalkInPatientCreate";
import PatientsManagement from "./PatientsManagement";
import LaboratoryManagement from "./LaboratoryManagement";

function PageRoutes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on component mount
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  return (
    <Box sx={{ display: "flex" }}>
      <Navbar user={user} setUser={setUser} />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 9 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}
          >
            <CircularProgress />
          </Box>
        ) : !user ? (
          <Navigate to="/" replace />
        ) : (
          <Routes>
            <Route path="home" element={<Navigate to="/users" replace />} />
            <Route path="users" element={<AdminUsersManagement />} />
            <Route path="pharmacy" element={<PharmacyManagement />} />
            <Route path="appointments" element={<VisitsManagement />} />
            <Route path="appointments/walk-in-patient" element={<WalkInPatientCreate />} />
            <Route path="patients" element={<PatientsManagement />} />
            <Route path="laboratory" element={<LaboratoryManagement />} />
            <Route path="hospitals" element={<HospitalsManagement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </Box>
    </Box>
  );
}

export default PageRoutes;
