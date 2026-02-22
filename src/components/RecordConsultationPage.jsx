import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Event as EventIcon,
  MedicalServices as MedicalServicesIcon,
  NoteAdd as NoteAddIcon,
  ContactPhone as ContactPhoneIcon,
  Cake as CakeIcon,
  Favorite as FavoriteIcon,
  LocalHospital as LocalHospitalIcon,
  Warning as WarningIcon,
  Scale as ScaleIcon,
  Thermostat as ThermostatIcon,
  Login as LoginIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  appointments: "/api/appointments",
  consultations: "/api/consultations",
};

const getToken = () => localStorage.getItem("token");

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

export default function RecordConsultationPage() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const token = getToken();
  const appointmentFromState = location?.state?.appointment;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
  });

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
    if (!appointmentFromState?.id) {
      navigate("/appointments", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchJson(`${API.appointments}/${appointmentFromState.id}`, { token });
        if (!cancelled) setAppointment(data?.data || null);
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
  }, [appointmentFromState?.id, token, navigate]);

  const handleSubmit = async () => {
    if (!appointment?.id || !token) return;
    setSaving(true);
    try {
      await fetchJson(`${API.consultations}/record`, {
        method: "POST",
        token,
        body: {
          appointment_id: appointment.id,
          symptoms: form.symptoms.trim() || null,
          diagnosis: form.diagnosis.trim() || null,
          notes: form.notes.trim() || null,
        },
      });
      Swal.fire({ icon: "success", title: "Consultation recorded", timer: 1500, showConfirmButton: false });
      navigate("/appointments", { replace: true });
    } catch (e) {
      setSaving(false);
      if (Number(e?.status) === 402 && e?.data?.code === "PAYMENT_REQUIRED") {
        Swal.fire({
          icon: "warning",
          title: "Payment required",
          text: e?.message || "Record payment first, then record the consultation.",
        });
        return;
      }
      if (Number(e?.status) === 409 && e?.data?.code === "APPOINTMENT_NOT_CONFIRMED") {
        Swal.fire({
          icon: "info",
          title: "Appointment not confirmed",
          text: "Record payment first so the appointment is confirmed, then try again.",
        });
        return;
      }
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const handleBack = () => navigate("/appointments");

  const patient = appointment?.patient;
  const doctorName = appointment?.doctor?.user?.full_name || appointment?.doctor?.staff_type || "—";
  const serviceName = appointment?.service?.name || "—";

  const formatValue = (v) => (v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—");
  const patientFields = [
    { label: "Full name", value: formatValue(patient?.full_name || patient?.user?.full_name), icon: PersonIcon },
    { label: "Phone", value: formatValue(patient?.phone || patient?.user?.phone), icon: ContactPhoneIcon },
    { label: "Email", value: formatValue(patient?.email || patient?.user?.email), icon: ContactPhoneIcon },
    { label: "Date of birth", value: patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—", icon: CakeIcon },
    { label: "Gender", value: formatValue(patient?.gender), icon: PersonIcon },
    { label: "Blood group", value: formatValue(patient?.blood_group), icon: FavoriteIcon },
    { label: "Status", value: formatValue(patient?.status), icon: LocalHospitalIcon },
    { label: "Patient source", value: formatValue(patient?.patient_source), icon: LocalHospitalIcon },
    { label: "Insurance provider", value: formatValue(patient?.insurance_provider), icon: LocalHospitalIcon },
    { label: "Emergency contact", value: formatValue(patient?.emergency_contact), icon: WarningIcon },
    { label: "Temperature (°C)", value: patient?.temperature_c != null ? String(patient.temperature_c) : "—", icon: ThermostatIcon },
    { label: "Weight (kg)", value: patient?.weight_kg != null ? String(patient.weight_kg) : "—", icon: ScaleIcon },
    { label: "Last login", value: patient?.last_login ? formatDateTime(patient.last_login) : "—", icon: LoginIcon },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: softBg,
          borderRadius: 4,
          py: 8,
        }}
      >
        <CircularProgress size={48} thickness={4} sx={{ color: "primary.main", mb: 2 }} />
        <Typography color="text.secondary" fontWeight={600}>
          Loading appointment…
        </Typography>
      </Box>
    );
  }

  if (!appointment) return null;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1440,
        mx: "auto",
        minHeight: "100%",
        background: softBg,
        borderRadius: 4,
        py: 3,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          sx={{
            fontWeight: 700,
            borderRadius: 2,
            textTransform: "none",
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": {
              borderColor: "primary.main",
              color: "primary.main",
              bgcolor: "primary.main",
              color: "white",
            },
          }}
        >
          Back to appointments
        </Button>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: heroGradient,
          color: "white",
          overflow: "hidden",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            right: 0,
            width: "40%",
            height: "100%",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 100%)",
            pointerEvents: "none",
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NoteAddIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.02 }}>
              Record consultation
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Document symptoms, diagnosis, and notes for this visit
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="stretch">
        {/* Left: Patient details */}
        <Card
          elevation={0}
          sx={{
            flex: { xs: "none", lg: "0 0 400px" },
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              py: 2,
              px: 2.5,
              background: heroGradient,
              color: "white",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <PersonIcon sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.02 }}>
                  Patient details
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Full profile for this appointment
                </Typography>
              </Box>
            </Stack>
          </Box>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ maxHeight: { lg: "50vh" }, overflowY: "auto", px: 2.5, py: 2 }}>
              {patientFields.map(({ label, value, icon }) => (
                <FieldRow key={label} label={label} value={value} icon={icon} />
              ))}
            </Box>
            <Paper
              elevation={0}
              sx={{
                m: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                This appointment
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon fontSize="small" color="action" />
                  <Typography variant="body2">{formatDateTime(appointment.appointment_date)}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MedicalServicesIcon fontSize="small" color="action" />
                  <Typography variant="body2">Dr. {doctorName}</Typography>
                </Stack>
                {serviceName && (
                  <Typography variant="body2" color="text.secondary">
                    Service: {serviceName}
                  </Typography>
                )}
                <Chip
                  size="small"
                  label={appointment.status}
                  color={appointment.status === "confirmed" || appointment.status === "completed" ? "success" : "default"}
                  sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                />
              </Stack>
            </Paper>
          </CardContent>
        </Card>

        {/* Right: Consultation form */}
        <Card
          elevation={0}
          sx={{
            flex: "1 1 440px",
            minWidth: 0,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              py: 2,
              px: 2.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.50",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.02 }}>
              Consultation notes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Enter symptoms, diagnosis, and any notes for this visit. You can add prescriptions and lab orders after saving.
            </Typography>
          </Box>
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Symptoms"
                value={form.symptoms}
                onChange={(e) => setForm((p) => ({ ...p, symptoms: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                placeholder="Describe presenting symptoms…"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  },
                }}
              />
              <TextField
                label="Diagnosis"
                value={form.diagnosis}
                onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                placeholder="Diagnosis and findings…"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  },
                }}
              />
              <TextField
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
                placeholder="Additional notes…"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  },
                }}
              />
              <Alert
                severity="info"
                icon={false}
                sx={{
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  color: "white",
                  "& .MuiAlert-message": { color: "white" },
                }}
              >
                This creates a consultation record linked to this appointment. Add prescriptions and lab orders from the consultation view after saving.
              </Alert>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  disabled={saving}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={saving}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 800,
                    px: 3,
                    py: 1.25,
                    textTransform: "none",
                    boxShadow: "0 4px 14px rgba(0, 137, 123, 0.35)",
                    "&:hover": {
                      boxShadow: "0 6px 20px rgba(0, 137, 123, 0.4)",
                    },
                  }}
                >
                  {saving ? (
                    <>
                      <CircularProgress size={20} sx={{ color: "white", mr: 1 }} />
                      Saving…
                    </>
                  ) : (
                    "Save consultation"
                  )}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
