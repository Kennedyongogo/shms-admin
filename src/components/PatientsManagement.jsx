import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit, Person, Search, Visibility, Description as ReportIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  patients: "/api/patients",
  hospitals: "/api/hospitals",
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

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const DetailRow = ({ label, value }) => (
  <Stack direction="row" spacing={2} alignItems="baseline" sx={{ gap: 2 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, fontWeight: 600 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
      {value}
    </Typography>
  </Stack>
);

const normalizeKenyanPhone = (input) => {
  if (input == null) return { value: null, error: null };
  const raw = String(input).trim();
  if (!raw) return { value: null, error: null };
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+254")) {
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

export default function PatientsManagement() {
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

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true); // true so first paint is loading, not empty (avoids blink)
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createPhoneError, setCreatePhoneError] = useState("");
  const [createForm, setCreateForm] = useState({
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
      const qs = new URLSearchParams({ page: "1", limit: "200" });
      const data = await fetchJson(`${API.hospitals}?${qs.toString()}`, { token });
      setHospitals(data.data || []);
    } catch {
      setHospitals([]);
    } finally {
      setHospitalsLoading(false);
    }
  };

  const loadPatients = async ({ pageOverride, limitOverride, searchOverride } = {}) => {
    if (!requireTokenGuard()) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String((pageOverride ?? page) + 1),
        limit: String(limitOverride ?? limit),
      });
      const s = searchOverride ?? search;
      if (s) qs.set("search", s);
      const data = await fetchJson(`${API.patients}?${qs.toString()}`, { token });
      setRows(data.data || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      Swal.fire({ icon: "error", title: "Failed to load patients", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to first page when search or limit changes
  useEffect(() => {
    setPage(0);
  }, [search, limit]);

  // Single load effect: one fetch when page, search, or limit changes (avoids double fetch on mount)
  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, limit]);

  const openEdit = (p) => {
    setEditForm({
      id: p.id,
      hospital_id: p.hospital_id || p.hospital?.id || "",
      full_name: p.full_name || "",
      phone: p.phone || "",
      email: p.email || "",
      date_of_birth: p.date_of_birth || "",
      gender: p.gender || "",
      blood_group: p.blood_group || "",
      insurance_provider: p.insurance_provider || "",
      emergency_contact: p.emergency_contact || "",
      temperature_c: p.temperature_c != null ? String(p.temperature_c) : "",
      weight_kg: p.weight_kg != null ? String(p.weight_kg) : "",
      status: p.status || "active",
    });
    setEditOpen(true);
  };

  const openCreate = () => {
    setCreatePhoneError("");
    setCreateForm({
      hospital_id: hospitals[0]?.id || "",
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
    setCreateOpen(true);
  };

  const saveCreate = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!createForm.hospital_id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a hospital." });
    if (!createForm.full_name.trim()) return Swal.fire({ icon: "warning", title: "Missing name", text: "Full name is required." });
    const normalizedPhone = normalizeKenyanPhone(createForm.phone);
    if (normalizedPhone.error) {
      setCreatePhoneError(normalizedPhone.error);
      return Swal.fire({ icon: "warning", title: "Invalid phone", text: normalizedPhone.error });
    }
    if (!normalizedPhone.value && !createForm.email.trim()) {
      return Swal.fire({ icon: "warning", title: "Missing contact", text: "Provide at least phone or email." });
    }
    if (!createForm.password) return Swal.fire({ icon: "warning", title: "Missing password", text: "Portal password is required." });
    if (createForm.password !== createForm.confirm_password) {
      return Swal.fire({ icon: "warning", title: "Passwords do not match", text: "Confirm password must match." });
    }
    const payload = {
      hospital_id: createForm.hospital_id,
      full_name: createForm.full_name.trim(),
      phone: normalizedPhone.value,
      email: createForm.email.trim() ? createForm.email.trim().toLowerCase() : null,
      date_of_birth: createForm.date_of_birth || null,
      gender: createForm.gender || null,
      blood_group: createForm.blood_group || null,
      insurance_provider: createForm.insurance_provider.trim() || null,
      emergency_contact: createForm.emergency_contact.trim() || null,
      patient_source: "walk_in",
      temperature_c: createForm.temperature_c === "" ? null : Number(createForm.temperature_c),
      weight_kg: createForm.weight_kg === "" ? null : Number(createForm.weight_kg),
      status: createForm.status,
      password: createForm.password,
      confirm_password: createForm.confirm_password,
    };
    setCreateSaving(true);
    try {
      await fetchJson(API.patients, { method: "POST", token, body: payload });
      setCreateOpen(false);
      await loadPatients();
      Swal.fire({
        icon: "success",
        title: "Walk-in patient created",
        text: "Patient can log in at /patient using phone/email and the password you set.",
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setCreateSaving(false);
    }
  };

  const openView = async (p) => {
    if (!requireTokenGuard()) return;
    setViewOpen(true);
    setViewLoading(true);
    setViewPatient(null);
    try {
      const data = await fetchJson(`${API.patients}/${p.id}`, { token });
      setViewPatient(data?.data || null);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed to load patient", text: e.message });
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!editForm?.id) return;
    if (!editForm.full_name.trim()) return Swal.fire({ icon: "warning", title: "Missing name", text: "Full name is required." });
    if (!editForm.hospital_id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a hospital." });

    const payload = {
      hospital_id: editForm.hospital_id,
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() ? editForm.email.trim().toLowerCase() : null,
      date_of_birth: editForm.date_of_birth || null,
      gender: editForm.gender || null,
      blood_group: editForm.blood_group || null,
      insurance_provider: editForm.insurance_provider.trim() || null,
      emergency_contact: editForm.emergency_contact.trim() || null,
      temperature_c: editForm.temperature_c === "" ? null : Number(editForm.temperature_c),
      weight_kg: editForm.weight_kg === "" ? null : Number(editForm.weight_kg),
      status: editForm.status,
    };

    setEditSaving(true);
    try {
      await fetchJson(`${API.patients}/${editForm.id}`, { method: "PUT", token, body: payload });
      setEditOpen(false);
      setEditForm(null);
      await loadPatients();
      Swal.fire({ icon: "success", title: "Saved", timer: 900, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed to save", text: e.message });
    } finally {
      setEditSaving(false);
    }
  };

  const deletePatient = async (p) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const r = await Swal.fire({
      icon: "warning",
      title: "Delete patient?",
      html: `This will permanently delete <b>${p.full_name || "this patient"}</b>.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d32f2f",
    });
    if (!r.isConfirmed) return;
    try {
      await fetchJson(`${API.patients}/${p.id}`, { method: "DELETE", token });
      await loadPatients();
      Swal.fire({ icon: "success", title: "Deleted", timer: 900, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: e.message });
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <Box sx={{ p: { xs: 2.5, md: 3 }, color: "white", background: heroGradient }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Person />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Patients
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>List, edit, and delete patient records.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {isAdmin && (
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={openCreate}
                  sx={{ color: "white", borderColor: "rgba(255,255,255,0.6)", fontWeight: 800, "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
                >
                  Add walk-in patient
                </Button>
              )}
              </Stack>
          </Stack>
        </Box>

        <CardContent>
          {!isAdmin && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You can view patients, but only admins can edit or delete.
            </Alert>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
            <TextField
              fullWidth
              placeholder="Search name, email, phone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, width: 70, maxWidth: { xs: "18vw", sm: 70 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "28vw", sm: 180, md: 260 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 180 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 120, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 140, textAlign: "right", maxWidth: { xs: "22vw", sm: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography color="text.secondary">Loading…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        No patients found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p, idx) => (
                    <TableRow
                      key={p.id}
                      hover
                      onClick={(e) => {
                        if (e.target.closest("[data-actions-cell]")) return;
                        openView(p);
                      }}
                      sx={{ cursor: { xs: "pointer", sm: "default" } }}
                    >
                      <TableCell sx={{ fontWeight: 800 }}>{page * limit + idx + 1}</TableCell>
                      <TableCell sx={{ maxWidth: { xs: "28vw", sm: 180, md: 260 }, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32, flexShrink: 0, display: { xs: "none", sm: "flex" } }}>
                            {(p.full_name || "?").slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                            <Typography noWrap sx={{ fontWeight: 800, lineHeight: 1.2 }}>{fmt(p.full_name)}</Typography>
                            <Typography noWrap variant="caption" color="text.secondary">
                              {p.hospital?.name ? `Hospital: ${p.hospital.name}` : "Hospital: —"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" }, maxWidth: { md: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>{fmt(p.phone)}</TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" }, maxWidth: { md: 180 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>{fmt(p.email)}</TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{fmt(p.patient_source)}</TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{fmt(p.status)}</TableCell>
                      <TableCell align="right" sx={{ overflow: "hidden", minWidth: { xs: 96, md: 160 } }} data-actions-cell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: "flex", flexDirection: "row", flexWrap: { xs: "wrap", md: "nowrap" }, gap: 0.5, justifyContent: "flex-end", maxWidth: "100%" }}>
                          <Tooltip title="Medical reports">
                            <IconButton size="small" onClick={() => navigate(`/patients/${p.id}/reports`)} sx={{ display: { xs: "none", sm: "inline-flex" } }} aria-label="View medical records">
                              <ReportIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => openView(p)} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                              <Visibility fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isAdmin ? "Edit" : "Admin only"}>
                            <span>
                              <IconButton size="small" onClick={() => openEdit(p)} disabled={!isAdmin}>
                                <Edit fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={isAdmin ? "Delete" : "Admin only"}>
                            <span>
                              <IconButton size="small" onClick={() => deletePatient(p)} disabled={!isAdmin}>
                                <Delete fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{
              width: "100%",
              overflow: "hidden",
              "& .MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 0.5, px: { xs: 1, sm: 2 }, minHeight: 52 },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
              "& .MuiTablePagination-select": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
            }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            fontSize: "1.25rem",
            pb: 0,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Person color="primary" sx={{ fontSize: 28 }} />
          Patient details
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {viewLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : !viewPatient ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No data.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: theme.palette.primary.main,
                    fontSize: "1.5rem",
                    fontWeight: 800,
                  }}
                >
                  {(viewPatient.full_name || "?").slice(0, 1).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.15rem" }}>
                    {fmt(viewPatient.full_name)}
                  </Typography>
                  <Chip
                    size="small"
                    label={fmt(viewPatient.status)}
                    color={viewPatient.status === "active" ? "success" : viewPatient.status === "suspended" ? "error" : "default"}
                    sx={{ mt: 0.5, fontWeight: 600 }}
                  />
                </Box>
              </Stack>

              <Divider sx={{ borderColor: "divider" }} />

              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, fontWeight: 600 }}>
                  Contact & location
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  <DetailRow label="Hospital" value={fmt(viewPatient.hospital?.name)} />
                  <DetailRow label="Phone" value={fmt(viewPatient.phone)} />
                  <DetailRow label="Email" value={fmt(viewPatient.email)} />
                  <DetailRow label="Source" value={fmt(viewPatient.patient_source)} />
                  <DetailRow label="Emergency contact" value={fmt(viewPatient.emergency_contact)} />
                </Stack>
              </Box>

              <Divider sx={{ borderColor: "divider" }} />

              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, fontWeight: 600 }}>
                  Medical
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  <DetailRow label="Date of birth" value={fmt(viewPatient.date_of_birth)} />
                  <DetailRow label="Gender" value={fmt(viewPatient.gender)} />
                  <DetailRow label="Blood group" value={fmt(viewPatient.blood_group)} />
                  <DetailRow label="Temperature (°C)" value={fmt(viewPatient.temperature_c)} />
                  <DetailRow label="Weight (kg)" value={fmt(viewPatient.weight_kg)} />
                  <DetailRow label="Insurance provider" value={fmt(viewPatient.insurance_provider)} />
                </Stack>
              </Box>

              <Divider sx={{ borderColor: "divider" }} />

              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, fontWeight: 600 }}>
                  Account
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  <DetailRow
                    label="User link"
                    value={viewPatient.user ? `${fmt(viewPatient.user.full_name)} (${fmt(viewPatient.user.email)})` : "—"}
                  />
                  <DetailRow label="Created" value={fmt(viewPatient.createdAt)} />
                  <DetailRow label="Updated" value={fmt(viewPatient.updatedAt)} />
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="contained"
            onClick={() => setViewOpen(false)}
            sx={{
              fontWeight: 700,
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Patient</DialogTitle>
        <DialogContent dividers>
          {hospitalsLoading && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading hospitals…</Typography>
            </Stack>
          )}

          {editForm && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <FormControl fullWidth>
                <InputLabel>Hospital</InputLabel>
                <Select
                  label="Hospital"
                  value={editForm.hospital_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, hospital_id: e.target.value }))}
                >
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
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                    <MenuItem value="active">active</MenuItem>
                    <MenuItem value="inactive">inactive</MenuItem>
                    <MenuItem value="suspended">suspended</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Phone" fullWidth value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
                <TextField label="Email (optional)" type="email" fullWidth value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Date of birth (optional)"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={editForm.date_of_birth || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                />
                <TextField label="Gender (optional)" fullWidth value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))} />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Blood group (optional)" fullWidth value={editForm.blood_group} onChange={(e) => setEditForm((p) => ({ ...p, blood_group: e.target.value }))} />
                <TextField
                  label="Insurance provider (optional)"
                  fullWidth
                  value={editForm.insurance_provider}
                  onChange={(e) => setEditForm((p) => ({ ...p, insurance_provider: e.target.value }))}
                />
              </Stack>

              <TextField
                label="Emergency contact (optional)"
                fullWidth
                value={editForm.emergency_contact}
                onChange={(e) => setEditForm((p) => ({ ...p, emergency_contact: e.target.value }))}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Temperature (°C) (optional)"
                  type="number"
                  fullWidth
                  inputProps={{ step: 0.1, min: 25, max: 50 }}
                  value={editForm.temperature_c}
                  onChange={(e) => setEditForm((p) => ({ ...p, temperature_c: e.target.value }))}
                />
                <TextField
                  label="Weight (kg) (optional)"
                  type="number"
                  fullWidth
                  inputProps={{ step: 0.01, min: 0, max: 1000 }}
                  value={editForm.weight_kg}
                  onChange={(e) => setEditForm((p) => ({ ...p, weight_kg: e.target.value }))}
                />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveEdit}
            disabled={!isAdmin || editSaving || !editForm}
            sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark }, fontWeight: 900 }}
          >
            {editSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create walk-in patient dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Add walk-in patient</DialogTitle>
        <DialogContent dividers>
          {createOpen && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <FormControl fullWidth required>
                <InputLabel>Hospital</InputLabel>
                <Select
                  label="Hospital"
                  value={createForm.hospital_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, hospital_id: e.target.value }))}
                >
                  {hospitals.map((h) => (
                    <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Full name" fullWidth required value={createForm.full_name} onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))} />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}>
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
                  value={createForm.phone}
                  onChange={(e) => { setCreatePhoneError(""); setCreateForm((p) => ({ ...p, phone: e.target.value })); }}
                  onBlur={() => {
                    const n = normalizeKenyanPhone(createForm.phone);
                    setCreatePhoneError(n.error || "");
                    if (!n.error && n.value) setCreateForm((p) => ({ ...p, phone: n.value }));
                    if (!n.value) setCreateForm((p) => ({ ...p, phone: "" }));
                  }}
                  error={Boolean(createPhoneError)}
                  helperText={createPhoneError || 'Kenya format. Saved as "+254XXXXXXXXX".'}
                />
                <TextField label="Email (optional)" type="email" fullWidth value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Date of birth (optional)" type="date" fullWidth InputLabelProps={{ shrink: true }} value={createForm.date_of_birth} onChange={(e) => setCreateForm((p) => ({ ...p, date_of_birth: e.target.value }))} />
                <TextField label="Gender (optional)" fullWidth value={createForm.gender} onChange={(e) => setCreateForm((p) => ({ ...p, gender: e.target.value }))} />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Blood group (optional)" fullWidth value={createForm.blood_group} onChange={(e) => setCreateForm((p) => ({ ...p, blood_group: e.target.value }))} />
                <TextField label="Insurance provider (optional)" fullWidth value={createForm.insurance_provider} onChange={(e) => setCreateForm((p) => ({ ...p, insurance_provider: e.target.value }))} />
              </Stack>
              <TextField label="Emergency contact (optional)" fullWidth value={createForm.emergency_contact} onChange={(e) => setCreateForm((p) => ({ ...p, emergency_contact: e.target.value }))} />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Temperature (°C) (optional)" type="number" fullWidth inputProps={{ step: 0.1, min: 25, max: 50 }} value={createForm.temperature_c} onChange={(e) => setCreateForm((p) => ({ ...p, temperature_c: e.target.value }))} />
                <TextField label="Weight (kg) (optional)" type="number" fullWidth inputProps={{ step: 0.01, min: 0, max: 1000 }} value={createForm.weight_kg} onChange={(e) => setCreateForm((p) => ({ ...p, weight_kg: e.target.value }))} />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Portal password" type="password" fullWidth required value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
                <TextField label="Confirm password" type="password" fullWidth required value={createForm.confirm_password} onChange={(e) => setCreateForm((p) => ({ ...p, confirm_password: e.target.value }))} />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCreate} disabled={!isAdmin || createSaving} sx={{ fontWeight: 900 }}>
            {createSaving ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

