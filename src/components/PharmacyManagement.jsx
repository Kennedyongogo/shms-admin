import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  LocalPharmacy as LocalPharmacyIcon,
  ReceiptLong as ReceiptLongIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  medications: "/api/medications",
  prescriptions: "/api/prescriptions",
  dispense: "/api/dispense",
  billing: "/api/billing",
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
    const message =
      data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
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

export default function PharmacyManagement() {
  const theme = useTheme();
  const token = getToken();
  const navigate = useNavigate();
  const isAdmin = getRoleName() === "admin";

  const [tab, setTab] = useState(0); // 0 meds, 1 prescriptions, 2 dispense
  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const showToast = (severity, message) =>
    setToast({ open: true, severity, message });

  // Medications
  const medsReqId = useRef(0);
  const [medications, setMedications] = useState([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [medsPage, setMedsPage] = useState(0);
  const [medsRowsPerPage, setMedsRowsPerPage] = useState(10);
  const [medsTotal, setMedsTotal] = useState(0);
  const [medsSearch, setMedsSearch] = useState("");
  const [medsSearchLocked, setMedsSearchLocked] = useState(true);

  const [medDialog, setMedDialog] = useState({
    open: false,
    mode: "create",
    id: null,
  });
  const [medForm, setMedForm] = useState({
    name: "",
    dosage_form: "",
    manufacturer: "",
    unit_price: "",
  });
  const [medView, setMedView] = useState({ open: false, med: null });

  // Prescriptions
  const presReqId = useRef(0);
  const [prescriptions, setPrescriptions] = useState([]);
  const [presLoading, setPresLoading] = useState(false);
  const [presPage, setPresPage] = useState(0);
  const [presRowsPerPage, setPresRowsPerPage] = useState(10);
  const [presTotal, setPresTotal] = useState(0);
  const [presSearch, setPresSearch] = useState("");
  const [presSearchLocked, setPresSearchLocked] = useState(true);
  const [presView, setPresView] = useState({
    open: false,
    prescription: null,
    loading: false,
  });
  const [presBilling, setPresBilling] = useState(null);
  const [presBillingLoading, setPresBillingLoading] = useState(false);
  const [presDispensing, setPresDispensing] = useState(false);

  // Dispense records
  const dispReqId = useRef(0);
  const [dispenses, setDispenses] = useState([]);
  const [dispLoading, setDispLoading] = useState(false);
  const [dispPage, setDispPage] = useState(0);
  const [dispRowsPerPage, setDispRowsPerPage] = useState(10);
  const [dispTotal, setDispTotal] = useState(0);
  const [dispSearch, setDispSearch] = useState("");
  const [dispSearchLocked, setDispSearchLocked] = useState(true);
  const [dispView, setDispView] = useState({ open: false, record: null });

  const requireTokenGuard = () => {
    if (!token) {
      showToast("error", "You are not logged in. Please sign in again.");
      setTimeout(() => (window.location.href = "/"), 800);
      return false;
    }
    return true;
  };

  const loadMedications = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++medsReqId.current;
    setMedsLoading(true);
    try {
      const page = medsPage + 1;
      const limit = medsRowsPerPage;
      const search = medsSearch.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const data = await fetchJson(`${API.medications}?${qs.toString()}`, {
        token,
      });
      if (reqId !== medsReqId.current) return;
      setMedications(data.data || []);
      setMedsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== medsReqId.current) return;
      showToast("error", e.message);
    } finally {
      if (reqId !== medsReqId.current) return;
      setMedsLoading(false);
    }
  };

  const loadPrescriptions = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++presReqId.current;
    setPresLoading(true);
    try {
      const page = presPage + 1;
      const limit = presRowsPerPage;
      const search = presSearch.trim();
      // backend supports patient_id/doctor_id filters; use search as a loose id filter client-side by passing none, then filtering in UI
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const data = await fetchJson(`${API.prescriptions}?${qs.toString()}`, {
        token,
      });
      if (reqId !== presReqId.current) return;
      const rows = data.data || [];
      const filtered = search
        ? rows.filter(
            (r) =>
              String(r.id).includes(search) ||
              String(r.patient_id).includes(search) ||
              String(r.doctor_id || "").includes(search),
          )
        : rows;
      setPrescriptions(filtered);
      setPresTotal(data.pagination?.total ?? rows.length);
    } catch (e) {
      if (reqId !== presReqId.current) return;
      showToast("error", e.message);
    } finally {
      if (reqId !== presReqId.current) return;
      setPresLoading(false);
    }
  };

  const loadDispenses = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++dispReqId.current;
    setDispLoading(true);
    try {
      const page = dispPage + 1;
      const limit = dispRowsPerPage;
      const search = dispSearch.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const data = await fetchJson(`${API.dispense}?${qs.toString()}`, {
        token,
      });
      if (reqId !== dispReqId.current) return;
      // backend doesn't implement search; do client-side
      const rows = data.data || [];
      const filtered = search
        ? rows.filter(
            (r) =>
              String(r.id).includes(search) ||
              String(r.prescription_id).includes(search) ||
              String(r.pharmacist_id || "").includes(search),
          )
        : rows;
      setDispenses(filtered);
      setDispTotal(data.pagination?.total ?? rows.length);
    } catch (e) {
      if (reqId !== dispReqId.current) return;
      showToast("error", e.message);
    } finally {
      if (reqId !== dispReqId.current) return;
      setDispLoading(false);
    }
  };

  // Initial loads + pagination
  useEffect(() => {
    loadMedications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medsPage, medsRowsPerPage]);
  useEffect(() => {
    loadPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presPage, presRowsPerPage]);
  useEffect(() => {
    loadDispenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispPage, dispRowsPerPage]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (medsPage !== 0) setMedsPage(0);
      else loadMedications();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medsSearch]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (presPage !== 0) setPresPage(0);
      else loadPrescriptions();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presSearch]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (dispPage !== 0) setDispPage(0);
      else loadDispenses();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispSearch]);

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  // Medication CRUD
  const openCreateMed = () => {
    setMedsSearchLocked(true);
    setPresSearchLocked(true);
    setDispSearchLocked(true);
    setMedForm({ name: "", dosage_form: "", manufacturer: "", unit_price: "" });
    setMedDialog({ open: true, mode: "create", id: null });
  };
  const openEditMed = (m) => {
    setMedsSearchLocked(true);
    setPresSearchLocked(true);
    setDispSearchLocked(true);
    setMedForm({
      name: m.name || "",
      dosage_form: m.dosage_form || "",
      manufacturer: m.manufacturer || "",
      unit_price: m.unit_price ?? "",
    });
    setMedDialog({ open: true, mode: "edit", id: m.id });
  };
  const openViewMed = (m) => setMedView({ open: true, med: m });

  const saveMed = async () => {
    if (!requireTokenGuard()) return;
    if (!medForm.name.trim())
      return showToast("error", "Medication name is required");
    const payload = {
      name: medForm.name.trim(),
      dosage_form: medForm.dosage_form.trim() || null,
      manufacturer: medForm.manufacturer.trim() || null,
      unit_price: medForm.unit_price === "" ? null : medForm.unit_price,
    };
    try {
      if (medDialog.mode === "create") {
        await fetchJson(API.medications, {
          method: "POST",
          token,
          body: payload,
        });
        showToast("success", "Medication created");
      } else {
        await fetchJson(`${API.medications}/${medDialog.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        showToast("success", "Medication updated");
      }
      setMedDialog({ open: false, mode: "create", id: null });
      await loadMedications();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const deleteMed = async (m) => {
    if (!requireTokenGuard()) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete medication?",
      html: `Delete <b>${m.name}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.medications}/${m.id}`, {
        method: "DELETE",
        token,
      });
      showToast("success", "Medication deleted");
      await loadMedications();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const openPrescription = async (p) => {
    if (!requireTokenGuard()) return;
    setPresView({ open: true, prescription: null, loading: true });
    setPresBilling(null);
    try {
      const data = await fetchJson(`${API.prescriptions}/${p.id}`, { token });
      setPresView({ open: true, prescription: data.data, loading: false });
      if (data?.data?.id) loadPrescriptionBilling(data.data.id);
    } catch (e) {
      setPresView({ open: false, prescription: null, loading: false });
      showToast("error", e.message);
    }
  };

  const loadPrescriptionBilling = async (prescriptionId) => {
    if (!requireTokenGuard()) return;
    setPresBillingLoading(true);
    try {
      const qs = new URLSearchParams({
        item_type: "prescription",
        reference_id: String(prescriptionId),
      });
      const data = await fetchJson(
        `${API.billing}/by-reference?${qs.toString()}`,
        { token },
      );
      setPresBilling(data?.data || null);
    } catch {
      setPresBilling(null);
    } finally {
      setPresBillingLoading(false);
    }
  };

  const openBillingForPrescription = (prescription) => {
    if (!prescription?.id) return;
    const patientId = prescription?.patient_id;
    const computed = (prescription?.items || []).reduce((sum, it) => sum + Number(it?.medication?.unit_price || 0), 0);
    navigate("/billing", {
      state: {
        billingPrefill: {
          item_type: "prescription",
          reference_id: prescription.id,
          patient_id: patientId || null,
          amount: computed || null,
        },
      },
    });
  };

  const dispensePrescription = async () => {
    if (!requireTokenGuard()) return;
    const prescription = presView.prescription;
    if (!prescription?.id) return;

    if (!presBilling?.paid) {
      const ask = await Swal.fire({
        icon: "warning",
        title: "Payment required",
        text: "You must record payment before dispensing.",
        showCancelButton: true,
        confirmButtonText: "Open billing",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });
      if (ask.isConfirmed) {
        openBillingForPrescription(prescription);
      }
      return;
    }

    setPresDispensing(true);
    try {
      await fetchJson(API.dispense, {
        method: "POST",
        token,
        body: { prescription_id: prescription.id },
      });
      showToast("success", "Dispensed successfully.");
      setPresView({ open: false, prescription: null, loading: false });
      await loadDispenses();
    } catch (e) {
      if (Number(e?.status) === 402 && e?.data?.code === "PAYMENT_REQUIRED") {
        const ask = await Swal.fire({
          icon: "warning",
          title: "Payment required",
          text: e.message,
          showCancelButton: true,
          confirmButtonText: "Open billing",
          cancelButtonText: "Cancel",
          reverseButtons: true,
        });
        if (ask.isConfirmed) {
          openBillingForPrescription(prescription);
        }
        return;
      }
      showToast("error", e.message);
    } finally {
      setPresDispensing(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, md: 3 },
            color: "white",
            background: heroGradient,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalPharmacyIcon />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Pharmacy
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                Medication catalogue, prescriptions, and dispense records.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => {
                    loadMedications();
                    loadPrescriptions();
                    loadDispenses();
                  }}
                  sx={{
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {isAdmin && tab === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateMed}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  New Medication
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              px: 2,
              "& .MuiTabs-indicator": {
                backgroundColor: theme.palette.primary.main,
              },
            }}
          >
            <Tab
              icon={<InventoryIcon />}
              iconPosition="start"
              label="Medicine Catalogue"
            />
            <Tab
              icon={<ReceiptLongIcon />}
              iconPosition="start"
              label="Prescriptions"
            />
            <Tab
              icon={<LocalPharmacyIcon />}
              iconPosition="start"
              label="Dispense Records"
            />
          </Tabs>
          <Divider />

          {/* MEDS */}
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              <TextField
                value={medsSearch}
                onChange={(e) => setMedsSearch(e.target.value)}
                placeholder="Search medications (name, dosage form, manufacturer)…"
                size="small"
                fullWidth
                name="meds_search"
                type="search"
                autoComplete="off"
                onFocus={() => setMedsSearchLocked(false)}
                onClick={() => setMedsSearchLocked(false)}
                InputProps={{ readOnly: medsSearchLocked }}
                inputProps={{
                  autoComplete: "off",
                  "data-lpignore": "true",
                  "data-1p-ignore": "true",
                }}
                sx={{ mb: 2 }}
              />

              <TableContainer
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>
                        No
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        Dosage form
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        Manufacturer
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Unit price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {medsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 2 }}
                          >
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Loading medications…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : medications.length ? (
                      medications.map((m, idx) => (
                        <TableRow key={m.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {medsPage * medsRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {m.name}
                          </TableCell>
                          <TableCell>{m.dosage_form || "—"}</TableCell>
                          <TableCell>{m.manufacturer || "—"}</TableCell>
                          <TableCell>{m.unit_price ?? "—"}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton
                                onClick={() => openViewMed(m)}
                                size="small"
                              >
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <>
                                <Tooltip title="Edit">
                                  <IconButton
                                    onClick={() => openEditMed(m)}
                                    size="small"
                                  >
                                    <EditIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    onClick={() => deleteMed(m)}
                                    size="small"
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No medications found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={medsTotal}
                page={medsPage}
                onPageChange={(_, p) => setMedsPage(p)}
                rowsPerPage={medsRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setMedsRowsPerPage(parseInt(e.target.value, 10));
                  setMedsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {/* PRESCRIPTIONS */}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <TextField
                value={presSearch}
                onChange={(e) => setPresSearch(e.target.value)}
                placeholder="Search prescriptions (id, patient_id, doctor_id)…"
                size="small"
                fullWidth
                name="pres_search"
                type="search"
                autoComplete="off"
                onFocus={() => setPresSearchLocked(false)}
                onClick={() => setPresSearchLocked(false)}
                InputProps={{ readOnly: presSearchLocked }}
                inputProps={{
                  autoComplete: "off",
                  "data-lpignore": "true",
                  "data-1p-ignore": "true",
                }}
                sx={{ mb: 2 }}
              />

              <TableContainer
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>
                        No
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        Consultation
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {presLoading ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 2 }}
                          >
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Loading prescriptions…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : prescriptions.length ? (
                      prescriptions.map((p, idx) => (
                        <TableRow
                          key={p.id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => openPrescription(p)}
                        >
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {presPage * presRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDateTime(p.prescription_date)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>
                            {p.patient_id}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>
                            {p.doctor_id || "—"}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>
                            {p.consultation_id || "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label="View items"
                              sx={{
                                fontWeight: 800,
                                bgcolor: "rgba(0, 137, 123, 0.10)",
                                color: theme.palette.primary.dark,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No prescriptions found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={presTotal}
                page={presPage}
                onPageChange={(_, p) => setPresPage(p)}
                rowsPerPage={presRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setPresRowsPerPage(parseInt(e.target.value, 10));
                  setPresPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {/* DISPENSE */}
          {tab === 2 && (
            <Box sx={{ p: 2 }}>
              <TextField
                value={dispSearch}
                onChange={(e) => setDispSearch(e.target.value)}
                placeholder="Search dispense records (id, prescription_id)…"
                size="small"
                fullWidth
                name="disp_search"
                type="search"
                autoComplete="off"
                onFocus={() => setDispSearchLocked(false)}
                onClick={() => setDispSearchLocked(false)}
                InputProps={{ readOnly: dispSearchLocked }}
                inputProps={{
                  autoComplete: "off",
                  "data-lpignore": "true",
                  "data-1p-ignore": "true",
                }}
                sx={{ mb: 2 }}
              />

              <TableContainer
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>
                        No
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        Dispense date
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        Prescription
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Pharmacist</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dispLoading ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 2 }}
                          >
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Loading dispense records…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : dispenses.length ? (
                      dispenses.map((r, idx) => (
                        <TableRow key={r.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {dispPage * dispRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDateTime(r.dispense_date)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>
                            {r.prescription_id}
                          </TableCell>
                          <TableCell>
                            {r.pharmacist?.full_name || "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton
                                onClick={() =>
                                  setDispView({ open: true, record: r })
                                }
                                size="small"
                              >
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No dispense records found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={dispTotal}
                page={dispPage}
                onPageChange={(_, p) => setDispPage(p)}
                rowsPerPage={dispRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setDispRowsPerPage(parseInt(e.target.value, 10));
                  setDispPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Medication view */}
      <Dialog
        open={medView.open}
        onClose={() => setMedView({ open: false, med: null })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Medication Details</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="overline" color="text.secondary">
              Name
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
              {medView.med?.name || "—"}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Dosage form
                </Typography>
                <Typography>{medView.med?.dosage_form || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Unit price
                </Typography>
                <Typography>{medView.med?.unit_price ?? "—"}</Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Manufacturer
              </Typography>
              <Typography>{medView.med?.manufacturer || "—"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMedView({ open: false, med: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Medication create/edit */}
      <Dialog
        open={medDialog.open}
        onClose={() => setMedDialog({ open: false, mode: "create", id: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {medDialog.mode === "create"
            ? "Create Medication"
            : "Edit Medication"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={medForm.name}
              onChange={(e) =>
                setMedForm((p) => ({ ...p, name: e.target.value }))
              }
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Dosage form"
                fullWidth
                value={medForm.dosage_form}
                onChange={(e) =>
                  setMedForm((p) => ({ ...p, dosage_form: e.target.value }))
                }
              />
              <TextField
                label="Unit price"
                fullWidth
                value={medForm.unit_price}
                onChange={(e) =>
                  setMedForm((p) => ({ ...p, unit_price: e.target.value }))
                }
              />
            </Stack>
            <TextField
              label="Manufacturer"
              fullWidth
              value={medForm.manufacturer}
              onChange={(e) =>
                setMedForm((p) => ({ ...p, manufacturer: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setMedDialog({ open: false, mode: "create", id: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveMed}
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prescription view with items */}
      <Dialog
        open={presView.open}
        onClose={() =>
          setPresView({ open: false, prescription: null, loading: false })
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Prescription Items</DialogTitle>
        <DialogContent>
          {presView.loading ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ py: 2 }}
            >
              <CircularProgress size={18} />
              <Typography color="text.secondary">
                Loading prescription…
              </Typography>
            </Stack>
          ) : (
            <>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Chip
                  label={`Date: ${formatDateTime(presView.prescription?.prescription_date)}`}
                />
                <Chip
                  label={`Patient: ${presView.prescription?.patient_id || "—"}`}
                  sx={{ fontFamily: "monospace" }}
                />
                <Chip
                  label={`Doctor: ${presView.prescription?.doctor_id || "—"}`}
                  sx={{ fontFamily: "monospace" }}
                />
              </Stack>

              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ md: "center" }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 900 }}>Payment</Typography>
                    {presBillingLoading ? (
                      <Chip size="small" label="Checking…" />
                    ) : (
                      <Chip
                        size="small"
                        label={
                          presBilling?.paid
                            ? "paid"
                            : presBilling?.exists
                              ? presBilling?.status || "unpaid"
                              : "unbilled"
                        }
                        color={presBilling?.paid ? "success" : "default"}
                        variant={presBilling?.paid ? "filled" : "outlined"}
                        sx={{ fontWeight: 800 }}
                      />
                    )}
                  </Stack>
                  <Button
                    variant="outlined"
                    onClick={() => openBillingForPrescription(presView.prescription)}
                    disabled={presBillingLoading || presBilling?.paid}
                    sx={{ fontWeight: 900 }}
                  >
                    Open billing
                  </Button>
                </Stack>
                {presBilling?.exists ? (
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Total: {presBilling.total_amount} • Paid:{" "}
                    {presBilling.paid_amount} • Balance: {presBilling.balance}
                  </Typography>
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    No bill found for this prescription yet.
                  </Typography>
                )}
                {!presBilling?.paid && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Dispensing is blocked until payment is recorded.
                  </Alert>
                )}
              </Box>

              <TableContainer
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>
                        No
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Medication</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Dosage</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Frequency</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {presView.prescription?.items?.length ? (
                      presView.prescription.items.map((it, idx) => (
                        <TableRow key={it.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {it.medication?.name || it.medication_id}
                          </TableCell>
                          <TableCell>{it.dosage || "—"}</TableCell>
                          <TableCell>{it.frequency || "—"}</TableCell>
                          <TableCell>{it.duration || "—"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No items found for this prescription.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setPresView({ open: false, prescription: null, loading: false })
            }
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={dispensePrescription}
            disabled={
              presView.loading || presDispensing || !presView.prescription?.id
            }
            sx={{ fontWeight: 900 }}
          >
            {presDispensing ? "Dispensing…" : "Dispense now"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispense view */}
      <Dialog
        open={dispView.open}
        onClose={() => setDispView({ open: false, record: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Dispense Record</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="overline" color="text.secondary">
              Dispense date
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
              {formatDateTime(dispView.record?.dispense_date)}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="overline" color="text.secondary">
              Prescription
            </Typography>
            <Typography sx={{ fontFamily: "monospace" }}>
              {dispView.record?.prescription_id || "—"}
            </Typography>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Pharmacist
            </Typography>
            <Typography>
              {dispView.record?.pharmacist?.full_name || "—"}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispView({ open: false, record: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lightweight toast using SweetAlert2 (reuse existing) */}
      {toast.open && (
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 2000 }}
          variant="filled"
        >
          {toast.message}
        </Alert>
      )}
    </Box>
  );
}
