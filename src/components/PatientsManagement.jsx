import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Delete, Edit, Person, Refresh, Search, Visibility } from "@mui/icons-material";
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

export default function PatientsManagement() {
  const theme = useTheme();
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
  const [loading, setLoading] = useState(false);
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
    loadPatients({ pageOverride: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, limit]);

  useEffect(() => {
    loadHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
      status: p.status || "active",
    });
    setEditOpen(true);
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
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => loadPatients()}
                  sx={{ color: "white", border: "1px solid rgba(255,255,255,0.25)" }}
                  disabled={loading}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
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

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, width: 70 }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 120 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 140, textAlign: "right" }}>Actions</TableCell>
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
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{page * limit + idx + 1}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}>
                            {(p.full_name || "?").slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{fmt(p.full_name)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.hospital?.name ? `Hospital: ${p.hospital.name}` : "Hospital: —"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{fmt(p.phone)}</TableCell>
                      <TableCell>{fmt(p.email)}</TableCell>
                      <TableCell>{fmt(p.patient_source)}</TableCell>
                      <TableCell>{fmt(p.status)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => openView(p)}>
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
                        </Stack>
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
          />
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Patient Details</DialogTitle>
        <DialogContent dividers>
          {viewLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : !viewPatient ? (
            <Typography color="text.secondary">No data.</Typography>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  {(viewPatient.full_name || "?").slice(0, 1).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>{fmt(viewPatient.full_name)}</Typography>
                </Box>
              </Stack>

              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, width: 220 }}>Hospital</TableCell>
                      <TableCell>{fmt(viewPatient.hospital?.name)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Phone</TableCell>
                      <TableCell>{fmt(viewPatient.phone)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Email</TableCell>
                      <TableCell>{fmt(viewPatient.email)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Source</TableCell>
                      <TableCell>{fmt(viewPatient.patient_source)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Temperature (°C)</TableCell>
                      <TableCell>{fmt(viewPatient.temperature_c)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Weight (kg)</TableCell>
                      <TableCell>{fmt(viewPatient.weight_kg)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Date of birth</TableCell>
                      <TableCell>{fmt(viewPatient.date_of_birth)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Gender</TableCell>
                      <TableCell>{fmt(viewPatient.gender)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Blood group</TableCell>
                      <TableCell>{fmt(viewPatient.blood_group)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Insurance provider</TableCell>
                      <TableCell>{fmt(viewPatient.insurance_provider)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Emergency contact</TableCell>
                      <TableCell>{fmt(viewPatient.emergency_contact)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                      <TableCell>{fmt(viewPatient.status)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>User link</TableCell>
                      <TableCell>{viewPatient.user ? `${fmt(viewPatient.user.full_name)} (${fmt(viewPatient.user.email)})` : "—"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Created</TableCell>
                      <TableCell>{fmt(viewPatient.createdAt)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900 }}>Updated</TableCell>
                      <TableCell>{fmt(viewPatient.updatedAt)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setViewOpen(false)} sx={{ fontWeight: 900 }}>
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
    </Box>
  );
}

