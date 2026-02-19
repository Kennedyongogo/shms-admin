import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ArrowBack, LocalHospital, Refresh } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  hospitals: "/api/hospitals",
  patients: "/api/patients",
};

const getToken = () => localStorage.getItem("token");
const getRoleName = () => {
  try {
    const role = JSON.parse(localStorage.getItem("role") || "null");
    return role?.name || null;
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
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const normalizeKenyanPhone = (input) => {
  if (input == null) return { value: null, error: null };
  const raw = String(input).trim();
  if (!raw) return { value: null, error: null };

  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+254")) {
    // ok
  } else if (p.startsWith("254")) {
    p = `+${p}`;
  } else if (p.startsWith("0") && p.length === 10) {
    p = `+254${p.slice(1)}`;
  } else if (/^[71]\d{8}$/.test(p)) {
    p = `+254${p}`;
  } else {
    return { value: raw, error: 'Phone must be a Kenya number starting with "+254"' };
  }
  if (!/^\+254\d{9}$/.test(p)) return { value: raw, error: 'Phone must be in format "+254XXXXXXXXX"' };
  return { value: p, error: null };
};

export default function WalkInPatientCreate() {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = getToken();
  const roleName = getRoleName();
  const isAdmin = roleName === "admin";

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);

  const [form, setForm] = useState({
    hospital_id: "",
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
    insurance_provider: "",
    emergency_contact: "",
    temperature_c: "",
    weight_kg: "",
    status: "active",
    password: "123456",
    confirm_password: "123456",
  });
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const requireTokenGuard = () => {
    if (!token) {
      Swal.fire({ icon: "error", title: "Not logged in", text: "Please sign in again." });
      setTimeout(() => (window.location.href = "/"), 500);
      return false;
    }
    return true;
  };

  const loadHospitals = async () => {
    if (!requireTokenGuard()) return;
    setHospitalsLoading(true);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "100" });
      const data = await fetchJson(`${API.hospitals}?${qs.toString()}`, { token });
      const list = data.data || [];
      setHospitals(list);
      if (!form.hospital_id && list[0]?.id) {
        setForm((p) => ({ ...p, hospital_id: list[0].id }));
      }
    } catch {
      setHospitals([]);
    } finally {
      setHospitalsLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!form.hospital_id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a hospital." });
    if (!form.full_name.trim()) return Swal.fire({ icon: "warning", title: "Missing name", text: "Full name is required." });

    const normalizedPhone = normalizeKenyanPhone(form.phone);
    if (normalizedPhone.error) {
      setPhoneError(normalizedPhone.error);
      return Swal.fire({ icon: "warning", title: "Invalid phone", text: normalizedPhone.error });
    }
    if (!normalizedPhone.value && !form.email.trim()) {
      return Swal.fire({ icon: "warning", title: "Missing contact", text: "Provide at least phone or email." });
    }

    if (!form.password) return Swal.fire({ icon: "warning", title: "Missing password", text: "Portal password is required." });
    if (form.password !== form.confirm_password) {
      return Swal.fire({ icon: "warning", title: "Passwords do not match", text: "Confirm password must match." });
    }

    const payload = {
      user_id: null,
      hospital_id: form.hospital_id,
      full_name: form.full_name.trim(),
      phone: normalizedPhone.value,
      email: form.email.trim() ? form.email.trim().toLowerCase() : null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      blood_group: form.blood_group || null,
      insurance_provider: form.insurance_provider.trim() || null,
      emergency_contact: form.emergency_contact.trim() || null,
      patient_source: "walk_in",
      temperature_c: form.temperature_c === "" ? null : Number(form.temperature_c),
      weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
      status: form.status,
      password: form.password,
      confirm_password: form.confirm_password,
    };

    setSaving(true);
    try {
      const created = await fetchJson(API.patients, { method: "POST", token, body: payload });
      const patientId = created?.data?.id;
      await Swal.fire({
        icon: "success",
        title: "Walk-in patient created",
        html: `Portal password: <b><span style="font-family:monospace">${form.password}</span></b><br/><span style="color:#666">They can log in at <b>/patient</b> using phone/email + this password.</span>`,
        showCancelButton: true,
        confirmButtonText: "Book appointment now",
        cancelButtonText: "Back to appointments",
        reverseButtons: true,
      }).then((r) => {
        if (r.isConfirmed && patientId) {
          navigate("/appointments", { state: { preselectPatientId: patientId } });
        } else {
          navigate("/appointments");
        }
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <Box sx={{ p: { xs: 2.5, md: 3 }, color: "white", background: heroGradient }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalHospital />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Create Walk-in Patient
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                Capture patient details and set their portal password.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Back">
                <IconButton onClick={() => navigate("/appointments")} sx={{ color: "white", border: "1px solid rgba(255,255,255,0.25)" }}>
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh hospitals">
                <IconButton onClick={loadHospitals} sx={{ color: "white", border: "1px solid rgba(255,255,255,0.25)" }}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        <CardContent>
          {!isAdmin && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Only admins can create walk-in patients.
            </Alert>
          )}

          {hospitalsLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading hospitals…</Typography>
            </Stack>
          ) : hospitals.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Create a hospital first in the Hospital module.
            </Alert>
          ) : null}

          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Hospital</InputLabel>
              <Select label="Hospital" value={form.hospital_id} onChange={(e) => setForm((p) => ({ ...p, hospital_id: e.target.value }))}>
                {hospitals.map((h) => (
                  <MenuItem key={h.id} value={h.id}>
                    {h.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Full name"
                fullWidth
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="inactive">inactive</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Phone"
                fullWidth
                placeholder="+2547XXXXXXXX"
                value={form.phone}
                onChange={(e) => {
                  setPhoneError("");
                  setForm((p) => ({ ...p, phone: e.target.value }));
                }}
                onBlur={() => {
                  const n = normalizeKenyanPhone(form.phone);
                  setPhoneError(n.error || "");
                  if (!n.error && n.value) setForm((p) => ({ ...p, phone: n.value }));
                  if (!n.value) setForm((p) => ({ ...p, phone: "" }));
                }}
                error={Boolean(phoneError)}
                helperText={phoneError || 'Kenya format only. We will save it as "+254XXXXXXXXX".'}
              />
              <TextField label="Email (optional)" type="email" fullWidth value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Date of birth (optional)"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.date_of_birth}
                onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
              />
              <FormControl fullWidth>
                <InputLabel>Gender (optional)</InputLabel>
                <Select label="Gender (optional)" value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
                  <MenuItem value="">
                    <em>—</em>
                  </MenuItem>
                  <MenuItem value="male">male</MenuItem>
                  <MenuItem value="female">female</MenuItem>
                  <MenuItem value="other">other</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Blood group (optional)"
                fullWidth
                value={form.blood_group}
                onChange={(e) => setForm((p) => ({ ...p, blood_group: e.target.value }))}
                placeholder="e.g. O+, A-, B+"
              />
              <TextField
                label="Insurance provider (optional)"
                fullWidth
                value={form.insurance_provider}
                onChange={(e) => setForm((p) => ({ ...p, insurance_provider: e.target.value }))}
              />
            </Stack>

            <TextField
              label="Emergency contact (optional)"
              fullWidth
              value={form.emergency_contact}
              onChange={(e) => setForm((p) => ({ ...p, emergency_contact: e.target.value }))}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Temperature (°C) (optional)"
                fullWidth
                type="number"
                inputProps={{ step: "0.1", min: "25", max: "50" }}
                value={form.temperature_c}
                onChange={(e) => setForm((p) => ({ ...p, temperature_c: e.target.value }))}
              />
              <TextField
                label="Weight (kg) (optional)"
                fullWidth
                type="number"
                inputProps={{ step: "0.1", min: "0", max: "1000" }}
                value={form.weight_kg}
                onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
              />
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Portal password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button onClick={() => setShowPassword((v) => !v)} sx={{ fontWeight: 800 }}>
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm password"
                type={showConfirm ? "text" : "password"}
                fullWidth
                value={form.confirm_password}
                onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
                error={Boolean(form.confirm_password) && form.password !== form.confirm_password}
                helperText={Boolean(form.confirm_password) && form.password !== form.confirm_password ? "Passwords do not match" : ""}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button onClick={() => setShowConfirm((v) => !v)} sx={{ fontWeight: 800 }}>
                        {showConfirm ? "Hide" : "Show"}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Alert severity="info">
              After creating, the patient can log in at <b>/patient</b> using phone/email + the portal password.
            </Alert>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate("/appointments")}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={save}
                disabled={!isAdmin || saving || hospitals.length === 0}
                sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark }, fontWeight: 900 }}
              >
                {saving ? "Saving…" : "Create Patient"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

