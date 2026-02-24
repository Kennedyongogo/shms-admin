import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Autocomplete,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Event as EventIcon,
  MedicalServices as MedicalServicesIcon,
  Edit as EditIcon,
  Science as ScienceIcon,
  LocalPharmacy as PharmacyIcon,
  Hotel as AdmitIcon,
  Visibility as VisibilityIcon,
  Description as ReportIcon,
  PictureAsPdf as PdfIcon,
  GetApp as DownloadIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  consultations: "/api/consultations",
  labTests: "/api/lab-tests",
  labOrders: "/api/lab-orders",
  medications: "/api/medications",
  prescriptions: "/api/prescriptions",
  admissions: "/api/admissions",
  beds: "/api/beds",
  wards: "/api/wards",
  medicalReports: "/api/medical-reports",
};

const getToken = () => localStorage.getItem("token");
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

async function fetchJson(url, { method = "GET", body, token } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function fetchPdfBlob(url, token) {
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load PDF");
  return res.blob();
}

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const FieldRow = ({ label, value, icon: Icon }) => (
  <Box sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider", "&:last-of-type": { borderBottom: "none" } }}>
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      {Icon && (
        <Box sx={{ color: "text.secondary", mt: 0.25 }}>
          <Icon sx={{ fontSize: 18 }} />
        </Box>
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 500, mt: 0.25 }}>{value}</Typography>
      </Box>
    </Stack>
  </Box>
);

export default function ConsultationViewPage() {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const token = getToken();
  const currentUser = getUser();

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAdmission, setHasAdmission] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ symptoms: "", diagnosis: "", notes: "" });

  const [labOpen, setLabOpen] = useState(false);
  const [labSaving, setLabSaving] = useState(false);
  const [labTests, setLabTests] = useState([]);
  const [labTestsLoading, setLabTestsLoading] = useState(false);
  const [selectedLabTests, setSelectedLabTests] = useState([]);

  const [rxOpen, setRxOpen] = useState(false);
  const [rxSaving, setRxSaving] = useState(false);
  const [medications, setMedications] = useState([]);
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [rxItems, setRxItems] = useState([{ medication: null, dosage: "", frequency: "", duration: "", quantity: 1 }]);

  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitSaving, setAdmitSaving] = useState(false);
  const [admitBedId, setAdmitBedId] = useState("");
  const [availableBeds, setAvailableBeds] = useState([]);
  const [admitBedsLoading, setAdmitBedsLoading] = useState(false);
  const [wardOptions, setWardOptions] = useState([]);

  const [consultationLabOrders, setConsultationLabOrders] = useState([]);
  const [consultationLabOrdersLoading, setConsultationLabOrdersLoading] = useState(false);
  const [consultationPrescriptions, setConsultationPrescriptions] = useState([]);
  const [consultationPrescriptionsLoading, setConsultationPrescriptionsLoading] = useState(false);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportText, setReportText] = useState("");
  const [consultationHasReport, setConsultationHasReport] = useState(false);
  const [consultationReportId, setConsultationReportId] = useState(null);
  const [reportPdfPreviewUrl, setReportPdfPreviewUrl] = useState(null);
  const reportPdfObjectUrlRef = useRef(null);

  const isAdmin = useMemo(() => {
    try {
      const role = JSON.parse(localStorage.getItem("role") || "null");
      return role?.name === "admin";
    } catch {
      return false;
    }
  }, []);

  const isAssignedDoctor = (cons) => {
    const doctorUserId = cons?.appointment?.doctor?.user?.id;
    return Boolean(doctorUserId && currentUser?.id && String(doctorUserId) === String(currentUser.id));
  };

  const canEdit = consultation && (isAdmin || isAssignedDoctor(consultation));

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 50%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const softBg = useMemo(
    () => `radial-gradient(ellipse 80% 50% at 50% -20%, ${theme.palette.primary.main}12, transparent), linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.grey[50]} 100%)`,
    [theme.palette.primary.main, theme.palette.background.default, theme.palette.grey]
  );

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    if (!id) {
      navigate("/appointments", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchJson(`${API.consultations}/${id}`, { token });
        const cons = data?.data || null;
        if (!cancelled) setConsultation(cons);
        const apptId = cons?.appointment?.id;
        if (apptId && !cancelled) {
          try {
            const admRes = await fetchJson(`${API.admissions}?appointment_id=${apptId}&status=admitted&limit=1`, { token });
            setHasAdmission(Array.isArray(admRes?.data) && admRes.data.length > 0);
          } catch {
            setHasAdmission(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          Swal.fire({ icon: "error", title: "Failed", text: e?.message });
          navigate("/appointments", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token, navigate]);

  useEffect(() => {
    if (!consultation?.id || !token) return;
    let cancelled = false;
    setConsultationLabOrdersLoading(true);
    (async () => {
      try {
        const data = await fetchJson(
          `${API.labOrders}?consultation_id=${consultation.id}&limit=100`,
          { token }
        );
        if (!cancelled) setConsultationLabOrders(data?.data || []);
      } catch {
        if (!cancelled) setConsultationLabOrders([]);
      } finally {
        if (!cancelled) setConsultationLabOrdersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [consultation?.id, token]);

  useEffect(() => {
    if (!consultation?.id || !token) return;
    let cancelled = false;
    setConsultationPrescriptionsLoading(true);
    (async () => {
      try {
        const data = await fetchJson(
          `${API.prescriptions}?consultation_id=${consultation.id}&limit=100`,
          { token }
        );
        if (!cancelled) setConsultationPrescriptions(data?.data || []);
      } catch {
        if (!cancelled) setConsultationPrescriptions([]);
      } finally {
        if (!cancelled) setConsultationPrescriptionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [consultation?.id, token]);

  useEffect(() => {
    if (!consultation?.id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson(
          `${API.medicalReports}?consultation_id=${consultation.id}&limit=1`,
          { token }
        );
        const hasReport = Array.isArray(data?.data) && data.data.length > 0;
        if (!cancelled) {
          setConsultationHasReport(hasReport);
          setConsultationReportId(hasReport ? data.data[0].id : null);
        }
      } catch {
        if (!cancelled) {
          setConsultationHasReport(false);
          setConsultationReportId(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [consultation?.id, token]);

  useEffect(() => {
    if (!consultationReportId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const blob = await fetchPdfBlob(`${API.medicalReports}/${consultationReportId}/pdf`, token);
        if (cancelled) return;
        if (reportPdfObjectUrlRef.current) URL.revokeObjectURL(reportPdfObjectUrlRef.current);
        reportPdfObjectUrlRef.current = URL.createObjectURL(blob);
        setReportPdfPreviewUrl(reportPdfObjectUrlRef.current);
      } catch {
        if (!cancelled) setReportPdfPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (reportPdfObjectUrlRef.current) {
        URL.revokeObjectURL(reportPdfObjectUrlRef.current);
        reportPdfObjectUrlRef.current = null;
      }
      setReportPdfPreviewUrl(null);
    };
  }, [consultationReportId, token]);

  const downloadReportPdf = async () => {
    if (!consultationReportId || !token) return;
    try {
      const blob = await fetchPdfBlob(`${API.medicalReports}/${consultationReportId}/pdf`, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "medical-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Download failed", text: e?.message || "Could not download PDF." });
    }
  };

  const loadLabTests = async () => {
    if (!token) return;
    setLabTestsLoading(true);
    try {
      const data = await fetchJson(`${API.labTests}?page=1&limit=200`, { token });
      setLabTests(data.data || []);
    } catch {
      setLabTests([]);
    } finally {
      setLabTestsLoading(false);
    }
  };

  const loadMedications = async () => {
    if (!token) return;
    setMedicationsLoading(true);
    try {
      const data = await fetchJson(`${API.medications}?page=1&limit=200`, { token });
      setMedications(data.data || []);
    } catch {
      setMedications([]);
    } finally {
      setMedicationsLoading(false);
    }
  };

  const openEdit = () => {
    if (!canEdit) {
      Swal.fire({ icon: "warning", title: "Not allowed", text: "Only the assigned doctor (or admin) can update this consultation." });
      return;
    }
    setEditForm({
      symptoms: consultation.symptoms || "",
      diagnosis: consultation.diagnosis || "",
      notes: consultation.notes || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!token || !consultation?.id) return;
    setEditSaving(true);
    try {
      await fetchJson(`${API.consultations}/${consultation.id}`, {
        method: "PUT",
        token,
        body: { symptoms: editForm.symptoms || null, diagnosis: editForm.diagnosis || null, notes: editForm.notes || null },
      });
      Swal.fire({ icon: "success", title: "Saved", timer: 900, showConfirmButton: false });
      setEditOpen(false);
      const data = await fetchJson(`${API.consultations}/${consultation.id}`, { token });
      setConsultation(data?.data || null);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setEditSaving(false);
    }
  };

  const openLab = () => {
    if (!canEdit) {
      Swal.fire({ icon: "warning", title: "Not allowed", text: "Only the assigned doctor (or admin) can initiate lab tests." });
      return;
    }
    setSelectedLabTests([]);
    setLabOpen(true);
    if (labTests.length === 0) loadLabTests();
  };

  const createLabOrder = async () => {
    if (!token || !consultation?.id) return;
    const patientId = consultation?.appointment?.patient?.id;
    if (!patientId) return Swal.fire({ icon: "warning", title: "Missing patient", text: "Patient not found on this consultation." });
    if (!selectedLabTests.length) return Swal.fire({ icon: "warning", title: "Select tests", text: "Choose at least one lab test." });
    setLabSaving(true);
    try {
      await fetchJson(API.labOrders, {
        method: "POST",
        token,
        body: { patient_id: patientId, consultation_id: consultation.id, items: selectedLabTests.map((t) => ({ lab_test_id: t.id })) },
      });
      Swal.fire({ icon: "success", title: "Lab order created", timer: 1000, showConfirmButton: false });
      setLabOpen(false);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setLabSaving(false);
    }
  };

  const openRx = () => {
    if (!canEdit) {
      Swal.fire({ icon: "warning", title: "Not allowed", text: "Only the assigned doctor (or admin) can prescribe." });
      return;
    }
    setRxItems([{ medication: null, dosage: "", frequency: "", duration: "", quantity: 1 }]);
    setRxOpen(true);
    if (medications.length === 0) loadMedications();
  };

  const createPrescription = async () => {
    if (!token || !consultation?.id) return;
    const patientId = consultation?.appointment?.patient?.id;
    if (!patientId) return Swal.fire({ icon: "warning", title: "Missing patient", text: "Patient not found on this consultation." });
    const items = rxItems
      .filter((i) => i.medication?.id)
      .map((i) => ({
        medication_id: i.medication.id,
        dosage: i.dosage || null,
        frequency: i.frequency || null,
        duration: i.duration || null,
        quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
      }));
    if (!items.length) return Swal.fire({ icon: "warning", title: "Add medications", text: "Choose at least one medication." });
    setRxSaving(true);
    try {
      await fetchJson(API.prescriptions, {
        method: "POST",
        token,
        body: { patient_id: patientId, consultation_id: consultation.id, items },
      });
      Swal.fire({ icon: "success", title: "Prescription created", timer: 1000, showConfirmButton: false });
      setRxOpen(false);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setRxSaving(false);
    }
  };

  const openAdmit = async () => {
    if (!consultation?.appointment) return;
    setAdmitOpen(true);
    setAdmitBedId("");
    setAdmitBedsLoading(true);
    try {
      const [bedsRes, wardsRes] = await Promise.all([
        fetchJson(`${API.beds}?limit=500`, { token }),
        fetchJson(`${API.wards}?limit=500`, { token }),
      ]);
      const beds = bedsRes?.data || [];
      setAvailableBeds(beds.filter((b) => b.status === "available"));
      setWardOptions(wardsRes?.data || []);
    } catch (e) {
      setAvailableBeds([]);
      setWardOptions([]);
      Swal.fire({ icon: "error", title: "Failed to load beds", text: e.message });
    } finally {
      setAdmitBedsLoading(false);
    }
  };

  const bedLabel = (b) => {
    if (!b) return "—";
    const wn = b.ward?.name ?? wardOptions.find((w) => w.id === b.ward_id)?.name ?? "";
    return wn ? `${b.bed_number} (${wn})` : b.bed_number;
  };

  const createAdmission = async () => {
    if (!consultation?.appointment || !admitBedId) {
      Swal.fire({ icon: "warning", title: "Select bed", text: "Choose an available bed to admit the patient." });
      return;
    }
    const appt = consultation.appointment;
    const patientId = appt.patient?.id;
    const doctorId = appt.doctor?.id;
    if (!patientId || !doctorId) {
      Swal.fire({ icon: "warning", title: "Missing data", text: "Patient or doctor not found on this consultation." });
      return;
    }
    setAdmitSaving(true);
    try {
      await fetchJson(`${API.admissions}/admit`, {
        method: "POST",
        token,
        body: { appointment_id: appt.id, patient_id: patientId, doctor_id: doctorId, bed_id: admitBedId },
      });
      Swal.fire({ icon: "success", title: "Patient admitted", timer: 1200, showConfirmButton: false });
      setAdmitOpen(false);
      setHasAdmission(true);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Admit failed", text: e.message });
    } finally {
      setAdmitSaving(false);
    }
  };

  const buildPrefilledReportText = () => {
    const cons = consultation;
    if (!cons) return "";
    const patientName = cons.appointment?.patient?.full_name || cons.appointment?.patient?.user?.full_name || "Patient";
    const doctorName = cons.appointment?.doctor?.user?.full_name || cons.appointment?.doctor?.staff_type || "Doctor";
    const dateStr = formatDateTime(cons.appointment?.appointment_date || cons.createdAt);
    const lines = [
      `Consultation report – ${dateStr}`,
      `Patient: ${patientName}`,
      `Doctor: ${doctorName}`,
      "",
      "Symptoms:",
      cons.symptoms || "—",
      "",
      "Diagnosis:",
      cons.diagnosis || "—",
      "",
      "Notes:",
      cons.notes || "—",
    ];
    if (consultationPrescriptions.length > 0) {
      lines.push("", "Prescriptions:");
      consultationPrescriptions.forEach((rx) => {
        (rx.items || []).forEach((it) => {
          lines.push(`  • ${it.medication?.name || "—"} × ${it.quantity ?? 1}${it.dosage ? `, ${it.dosage}` : ""}${it.frequency ? `, ${it.frequency}` : ""}`);
        });
      });
    }
    if (consultationLabOrders.length > 0) {
      lines.push("", "Lab results:");
      consultationLabOrders.forEach((order) => {
        (order.items || []).forEach((item) => {
          const test = item.labTest || {};
          const result = item.result;
          const val = result?.result_value ?? "Pending";
          lines.push(`  • ${test.test_name || "—"}: ${val}`);
        });
      });
    }
    return lines.join("\n");
  };

  const openReportDialog = () => {
    setReportText(buildPrefilledReportText());
    setReportDialogOpen(true);
  };

  const generateReport = async () => {
    if (!token || !consultation?.id) return;
    const patientId = consultation?.appointment?.patient?.id;
    if (!patientId) {
      Swal.fire({ icon: "warning", title: "Missing patient", text: "Patient not found on this consultation." });
      return;
    }
    const text = (reportText || "").trim();
    if (!text) {
      Swal.fire({ icon: "warning", title: "Report text required", text: "Please enter or edit the report content." });
      return;
    }
    setReportSaving(true);
    try {
      const reportRes = await fetchJson(API.medicalReports, {
        method: "POST",
        token,
        body: {
          patient_id: patientId,
          doctor_id: consultation?.appointment?.doctor?.id || null,
          consultation_id: consultation.id,
          report_text: text,
        },
      });
      await Swal.fire({ icon: "success", title: "Report generated", text: "Medical report has been saved and appointment marked complete.", timer: 1500, showConfirmButton: false });
      setReportDialogOpen(false);
      setConsultationHasReport(true);
      setConsultationReportId(reportRes?.data?.id || null);
      const data = await fetchJson(`${API.consultations}/${consultation.id}`, { token });
      setConsultation(data?.data || null);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not save report." });
    } finally {
      setReportSaving(false);
    }
  };

  const handleBack = () => navigate("/appointments");

  const patient = consultation?.appointment?.patient;
  const formatValue = (v) => (v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—");
  const patientFields = [
    { label: "Full name", value: formatValue(patient?.full_name || patient?.user?.full_name), icon: PersonIcon },
    { label: "Phone", value: formatValue(patient?.phone || patient?.user?.phone), icon: PersonIcon },
    { label: "Email", value: formatValue(patient?.email || patient?.user?.email), icon: PersonIcon },
    { label: "Date of birth", value: patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—", icon: PersonIcon },
    { label: "Gender", value: formatValue(patient?.gender), icon: PersonIcon },
    { label: "Blood group", value: formatValue(patient?.blood_group), icon: PersonIcon },
    { label: "Status", value: formatValue(patient?.status), icon: PersonIcon },
  ];

  const doctorName = consultation?.appointment?.doctor?.user?.full_name || consultation?.appointment?.doctor?.staff_type || "—";
  const serviceName = consultation?.appointment?.service?.name || "—";

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: softBg, borderRadius: 4, py: 8 }}>
        <CircularProgress size={48} thickness={4} sx={{ color: "primary.main", mb: 2 }} />
        <Typography color="text.secondary" fontWeight={600}>Loading consultation...</Typography>
      </Box>
    );
  }

  if (!consultation) return null;

  return (
    <Box sx={{ width: "100%", maxWidth: 1440, mx: "auto", minHeight: "100%", background: softBg, borderRadius: 4, pt: 1.5, pb: 3, px: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none", borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "primary.main", bgcolor: "primary.main", color: "white" } }}
        >
          Back to appointments
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, background: heroGradient, color: "white", overflow: "hidden", position: "relative", "&::after": { content: '""', position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 100%)", pointerEvents: "none" } }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <VisibilityIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.02 }}>Consultation</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {consultation.appointment?.patient?.full_name || consultation.appointment?.patient?.user?.full_name || "Patient"} • {formatDateTime(consultation.createdAt)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="stretch">
        <Card elevation={0} sx={{ flex: { xs: "none", lg: "0 0 380px" }, borderRadius: 3, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ py: 2, px: 2.5, background: heroGradient, color: "white" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <PersonIcon sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.02 }}>Patient details</Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Profile for this consultation</Typography>
              </Box>
            </Stack>
          </Box>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ maxHeight: { lg: "45vh" }, overflowY: "auto", px: 2.5, py: 2 }}>
              {patientFields.map(({ label, value, icon }) => (
                <FieldRow key={label} label={label} value={value} icon={icon} />
              ))}
            </Box>
            <Paper elevation={0} sx={{ m: 2, p: 2, borderRadius: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>This appointment</Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon fontSize="small" color="action" />
                  <Typography variant="body2">{formatDateTime(consultation.appointment?.appointment_date)}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MedicalServicesIcon fontSize="small" color="action" />
                  <Typography variant="body2">Dr. {doctorName}</Typography>
                </Stack>
                {serviceName && <Typography variant="body2" color="text.secondary">Service: {serviceName}</Typography>}
              </Stack>
            </Paper>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ flex: "1 1 440px", minWidth: 0, borderRadius: 3, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ py: 2, px: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.02 }}>Consultation notes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Symptoms, diagnosis, and notes for this visit.</Typography>
          </Box>
          <CardContent sx={{ p: 2.5 }}>
            {!canEdit && (
              <Alert severity="info" sx={{ mb: 2 }}>You can view this consultation. Only the assigned doctor (or admin) can update it, prescribe, initiate lab tests, or admit patient.</Alert>
            )}
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Symptoms</Typography>
              <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{consultation.symptoms || "—"}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Diagnosis</Typography>
              <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{consultation.diagnosis || "—"}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Notes</Typography>
              <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{consultation.notes || "—"}</Typography>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mt: 2 }}>
              <Button startIcon={<EditIcon />} variant="outlined" onClick={openEdit} disabled={!canEdit} sx={{ borderRadius: 2, fontWeight: 700, width: "100%", minHeight: 44 }}>Update consultation</Button>
              <Button startIcon={<ScienceIcon />} variant="outlined" onClick={openLab} disabled={!canEdit} sx={{ borderRadius: 2, fontWeight: 700, width: "100%", minHeight: 44 }}>Initiate lab test</Button>
              <Button startIcon={<PharmacyIcon />} variant="outlined" onClick={openRx} disabled={!canEdit} sx={{ borderRadius: 2, fontWeight: 700, width: "100%", minHeight: 44 }}>Prescribe</Button>
              <Button startIcon={<AdmitIcon />} variant="outlined" onClick={openAdmit} disabled={!canEdit || hasAdmission} sx={{ borderRadius: 2, fontWeight: 700, width: "100%", minHeight: 44 }}>{hasAdmission ? "Already admitted" : "Admit patient"}</Button>
              <Button startIcon={<ReportIcon />} variant="outlined" onClick={openReportDialog} disabled={consultationHasReport} sx={{ borderRadius: 2, fontWeight: 700, width: "100%", minHeight: 44, gridColumn: { xs: "1", sm: "1 / -1" } }}>{consultationHasReport ? "Report generated" : "Generate report"}</Button>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Lab results</Typography>
            {consultationLabOrdersLoading ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">Loading lab results...</Typography>
              </Stack>
            ) : (() => {
              const rows = [];
              consultationLabOrders.forEach((order) => {
                (order.items || []).forEach((item) => {
                  const test = item.labTest || {};
                  const result = item.result;
                  rows.push({
                    testName: test.test_name || "—",
                    testCode: test.test_code || "—",
                    price: test.price != null ? Number(test.price) : null,
                    resultValue: result?.result_value ?? null,
                    referenceRange: result?.reference_range ?? null,
                    interpretation: result?.interpretation ?? null,
                    resultDate: result?.result_date ? new Date(result.result_date) : null,
                    labTechnicianName: result?.labTechnician?.user?.full_name || result?.labTechnician?.staff_type || null,
                    status: result ? "Entered" : "Pending",
                  });
                });
              });
              if (rows.length === 0) {
                return <Typography color="text.secondary">No lab results yet.</Typography>;
              }
              const label = (text) => <Typography component="span" variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>{text}:</Typography>;
              const value = (v, strong) => <Typography component="span" variant="body2" sx={strong ? { fontWeight: 600 } : {}}>{v}</Typography>;
              return (
                <Stack spacing={1.5}>
                  {rows.map((r, idx) => (
                    <Card key={idx} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ "&:last-child": { pb: 2 }, py: 1.5, px: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{r.testName}{r.testCode !== "—" ? ` (${r.testCode})` : ""}</Typography>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Test name")}{value(r.testName)}</Stack>
                          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Test code")}{value(r.testCode)}</Stack>
                          {r.price != null && <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Price")}{value(r.price)}</Stack>}
                          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Result")}{value(r.resultValue ?? "—", true)}</Stack>
                          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Reference range")}{value(r.referenceRange ?? "—")}</Stack>
                          {r.interpretation != null && r.interpretation !== "" && <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">{label("Interpretation")}{value(r.interpretation)}</Stack>}
                          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Result date")}{value(r.resultDate ? r.resultDate.toLocaleString() : "—")}</Stack>
                          {r.labTechnicianName && <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Lab technician")}{value(r.labTechnicianName)}</Stack>}
                          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">{label("Status")}<Typography component="span" variant="body2" color={r.status === "Entered" ? "success.main" : "text.secondary"} fontWeight={600}>{r.status}</Typography></Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              );
            })()}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Prescriptions</Typography>
            {consultationPrescriptionsLoading ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">Loading prescriptions...</Typography>
              </Stack>
            ) : consultationPrescriptions.length === 0 ? (
              <Typography color="text.secondary">No prescriptions for this consultation yet.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {consultationPrescriptions.map((rx) => (
                  <Card key={rx.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ "&:last-child": { pb: 2 }, py: 1.5, px: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Prescription • {formatDateTime(rx.prescription_date || rx.createdAt)}
                      </Typography>
                      <Stack spacing={0.5}>
                        {Array.isArray(rx.items) && rx.items.length > 0 ? (
                          rx.items.map((it, i) => (
                            <Typography key={i} variant="body2">
                              {it.medication?.name || "—"} × {it.quantity ?? 1}
                              {it.dosage ? ` • ${it.dosage}` : ""}
                              {it.frequency ? ` • ${it.frequency}` : ""}
                            </Typography>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">No medications listed.</Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {consultationHasReport && consultationReportId && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Medical report</Typography>
                <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                  <CardContent sx={{ "&:last-child": { pb: 2 }, p: 0 }}>
                    <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
                      <Button size="small" startIcon={<DownloadIcon />} variant="contained" onClick={downloadReportPdf} sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Download PDF
                      </Button>
                    </Box>
                    <Box sx={{ height: 480, bgcolor: "grey.100" }}>
                      {reportPdfPreviewUrl ? (
                        <iframe title="Report PDF preview" src={reportPdfPreviewUrl} style={{ width: "100%", height: "100%", border: "none" }} />
                      ) : (
                        <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={1}>
                          <CircularProgress size={32} />
                          <Typography variant="body2" color="text.secondary">Loading PDF preview...</Typography>
                        </Stack>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </>
            )}

          </CardContent>
        </Card>
      </Stack>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Update consultation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Symptoms" fullWidth multiline minRows={2} value={editForm.symptoms} onChange={(e) => setEditForm((p) => ({ ...p, symptoms: e.target.value }))} />
            <TextField label="Diagnosis" fullWidth multiline minRows={2} value={editForm.diagnosis} onChange={(e) => setEditForm((p) => ({ ...p, diagnosis: e.target.value }))} />
            <TextField label="Notes" fullWidth multiline minRows={2} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={editSaving} sx={{ fontWeight: 900 }}>{editSaving ? "Saving..." : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={labOpen} onClose={() => setLabOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Initiate lab test</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {labTestsLoading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography color="text.secondary">Loading lab tests...</Typography></Stack>}
            <Autocomplete
              multiple
              options={labTests}
              value={selectedLabTests}
              onChange={(_, v) => setSelectedLabTests(v)}
              getOptionLabel={(t) => `${t.test_name || "Test"}${t.test_code ? ` (${t.test_code})` : ""}`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Lab tests" placeholder="Select tests..." />}
            />
            <Alert severity="info">This creates a lab order linked to the consultation.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setLabOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createLabOrder} disabled={labSaving} sx={{ fontWeight: 900 }}>{labSaving ? "Creating..." : "Create lab order"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rxOpen} onClose={() => setRxOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Prescription</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {medicationsLoading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography color="text.secondary">Loading medications...</Typography></Stack>}
            {rxItems.map((it, idx) => (
              <Box key={idx} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Stack spacing={1.5}>
                  <Autocomplete
                    options={medications}
                    value={it.medication}
                    onChange={(_, v) => setRxItems((prev) => prev.map((p, i) => (i === idx ? { ...p, medication: v } : p)))}
                    getOptionLabel={(m) => m?.name || "—"}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    renderInput={(params) => <TextField {...params} label="Medication" placeholder="Select medication..." />}
                  />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <TextField label="Dosage (optional)" fullWidth value={it.dosage} onChange={(e) => setRxItems((prev) => prev.map((p, i) => (i === idx ? { ...p, dosage: e.target.value } : p)))} />
                    <TextField label="Frequency (optional)" fullWidth value={it.frequency} onChange={(e) => setRxItems((prev) => prev.map((p, i) => (i === idx ? { ...p, frequency: e.target.value } : p)))} />
                    <TextField label="Duration (optional)" fullWidth value={it.duration} onChange={(e) => setRxItems((prev) => prev.map((p, i) => (i === idx ? { ...p, duration: e.target.value } : p)))} />
                    <TextField label="Quantity" type="number" inputProps={{ min: 1, step: 1 }} value={it.quantity ?? 1} onChange={(e) => setRxItems((prev) => prev.map((p, i) => (i === idx ? { ...p, quantity: e.target.value } : p)))} sx={{ minWidth: 100 }} />
                  </Stack>
                  <Stack direction="row" justifyContent="flex-end">
                    <Button variant="outlined" color="error" size="small" onClick={() => setRxItems((prev) => prev.filter((_, i) => i !== idx))} disabled={rxItems.length === 1}>Remove</Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
            <Button variant="outlined" onClick={() => setRxItems((p) => [...p, { medication: null, dosage: "", frequency: "", duration: "", quantity: 1 }])}>Add medication</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setRxOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createPrescription} disabled={rxSaving} sx={{ fontWeight: 900 }}>{rxSaving ? "Creating..." : "Create prescription"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={admitOpen} onClose={() => setAdmitOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Admit patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {admitBedsLoading ? (
              <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography color="text.secondary">Loading available beds...</Typography></Stack>
            ) : (
              <>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Bed (available only)</InputLabel>
                  <Select value={admitBedId} label="Bed (available only)" onChange={(e) => setAdmitBedId(e.target.value)}>
                    <MenuItem value="">Select bed</MenuItem>
                    {availableBeds.map((b) => (
                      <MenuItem key={b.id} value={b.id}>{bedLabel(b)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {availableBeds.length === 0 && <Alert severity="info">No available beds. Add beds in Ward and Admissions.</Alert>}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setAdmitOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createAdmission} disabled={admitSaving || !admitBedId || admitBedsLoading} sx={{ fontWeight: 900 }}>{admitSaving ? "Admitting..." : "Admit"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Generate medical report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              The report is prefilled from this consultation. You can <strong>edit any part</strong> and <strong>add your own notes</strong> in the box below; whatever you leave here is saved as the medical report.
            </Alert>
            <TextField
              label="Report content (editable — add or change notes as needed)"
              fullWidth
              multiline
              minRows={12}
              maxRows={24}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Consultation summary and your notes..."
              helperText="Edit the prefilled text and add any additional notes, follow-up instructions, or clarifications. This full content will be saved as the report."
              sx={{ "& .MuiInputBase-root": { fontFamily: "monospace", fontSize: "0.9rem" } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={generateReport} disabled={reportSaving} sx={{ fontWeight: 900 }} startIcon={reportSaving ? <CircularProgress size={18} color="inherit" /> : <ReportIcon />}>
            {reportSaving ? "Saving..." : "Generate report"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
