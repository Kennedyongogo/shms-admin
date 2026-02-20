import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
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
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
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
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Payments as PaymentsIcon,
  ReceiptLong as ReceiptLongIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  billing: "/api/billing",
  payments: "/api/payments",
  appointments: "/api/appointments",
  labOrders: "/api/lab-orders",
  prescriptions: "/api/prescriptions",
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
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function money(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "0");
  return n.toFixed(2);
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function shortId(id) {
  if (!id) return "—";
  const s = String(id);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function isUuidLike(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
}

export default function BillingPaymentsManagement() {
  const theme = useTheme();
  const token = getToken();
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0); // 0 billing, 1 payments

  // Bills (paginated)
  const billsReqId = useRef(0);
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsPage, setBillsPage] = useState(0);
  const [billsRowsPerPage, setBillsRowsPerPage] = useState(10);
  const [billsTotal, setBillsTotal] = useState(0);
  const [billsSearch, setBillsSearch] = useState("");
  const [billsStatus, setBillsStatus] = useState("");

  // Payments (paginated)
  const paysReqId = useRef(0);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [paymentsRowsPerPage, setPaymentsRowsPerPage] = useState(10);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsMethod, setPaymentsMethod] = useState("");

  // Bill view (payments are initiated here)
  const [billView, setBillView] = useState({ open: false, loading: false, bill: null });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [itemForm, setItemForm] = useState({ item_type: "appointment", reference_id: "", amount: "" });
  const [itemSaving, setItemSaving] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash" });
  const [paySaving, setPaySaving] = useState(false);
  const [refDetails, setRefDetails] = useState({});
  const [expandedItemIds, setExpandedItemIds] = useState({});

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const refKey = (type, id) => `${type}:${id}`;

  const labelForRef = (item, bill) => {
    const key = item?.reference_id ? refKey(item.item_type, item.reference_id) : null;
    const d = key ? refDetails[key] : null;
    if (d?.label) return d.label;
    // Fallback: at least include patient name from bill when possible.
    const patientName = bill?.patient?.full_name || bill?.patient?.user?.full_name || "";
    if (item?.item_type === "appointment") return patientName ? `Appointment • ${patientName}` : "Appointment";
    if (item?.item_type === "lab_order") return patientName ? `Lab order • ${patientName}` : "Lab order";
    if (item?.item_type === "prescription") return patientName ? `Prescription • ${patientName}` : "Prescription";
    return item?.item_type || "Item";
  };

  const toggleItemExpanded = (itemId) => {
    if (!itemId) return;
    setExpandedItemIds((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const hydrateBillItemRefs = async (bill) => {
    const items = bill?.items || [];
    const toFetch = items
      .filter((it) => it?.reference_id && ["appointment", "lab_order", "prescription"].includes(it.item_type))
      .map((it) => ({ type: it.item_type, id: it.reference_id }));
    if (!toFetch.length) return;

    const next = {};
    await Promise.all(
      toFetch.map(async ({ type, id }) => {
        const key = refKey(type, id);
        if (refDetails[key]) return;
        try {
          if (type === "appointment") {
            const data = await fetchJson(`${API.appointments}/${id}`, { token });
            const a = data?.data;
            const p = a?.patient?.full_name || a?.patient?.user?.full_name || "Patient";
            const svc = a?.service?.name ? ` • ${a.service.name}` : "";
            next[key] = { label: `Appointment • ${p} • ${formatDateTime(a?.appointment_date)}${svc}` };
          } else if (type === "lab_order") {
            const data = await fetchJson(`${API.labOrders}/${id}`, { token });
            const o = data?.data;
            const p = o?.patient?.full_name || o?.patient?.user?.full_name || "Patient";
            const testRows = (o?.items || [])
              .map((it) => it?.labTest)
              .filter(Boolean)
              .map((t) => ({
                id: t.id,
                name: t.test_name || "Test",
                code: t.test_code || "",
                price: Number(t.price || 0),
              }));
            const sum = testRows.reduce((s, t) => s + Number(t.price || 0), 0);
            next[key] = {
              label: `Lab order • ${p} • ${formatDateTime(o?.createdAt)} • ${testRows.length} test(s)`,
              tests: testRows,
              tests_total: sum,
            };
          } else if (type === "prescription") {
            const data = await fetchJson(`${API.prescriptions}/${id}`, { token });
            const r = data?.data;
            const count = (r?.items || []).length;
            const patientName = bill?.patient?.full_name || bill?.patient?.user?.full_name || "Patient";
            next[key] = { label: `Prescription • ${patientName} • ${formatDateTime(r?.prescription_date)} • ${count} item(s)` };
          }
        } catch {
          // ignore
        }
      })
    );

    if (Object.keys(next).length) {
      setRefDetails((prev) => ({ ...prev, ...next }));
    }
  };

  const loadBills = async () => {
    const reqId = ++billsReqId.current;
    setBillsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(billsPage + 1),
        limit: String(billsRowsPerPage),
      });
      if (billsSearch.trim()) qs.set("search", billsSearch.trim());
      if (billsStatus) qs.set("status", billsStatus);

      const resp = await fetchJson(`${API.billing}?${qs.toString()}`, { token });
      if (reqId !== billsReqId.current) return;
      setBills(resp?.data || []);
      setBillsTotal(resp?.pagination?.total || 0);
    } catch (e) {
      if (reqId !== billsReqId.current) return;
      setBills([]);
      setBillsTotal(0);
    } finally {
      if (reqId === billsReqId.current) setBillsLoading(false);
    }
  };

  const loadPayments = async () => {
    const reqId = ++paysReqId.current;
    setPaymentsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(paymentsPage + 1),
        limit: String(paymentsRowsPerPage),
      });
      if (paymentsSearch.trim()) qs.set("search", paymentsSearch.trim());
      if (paymentsMethod) qs.set("payment_method", paymentsMethod);

      const resp = await fetchJson(`${API.payments}?${qs.toString()}`, { token });
      if (reqId !== paysReqId.current) return;
      setPayments(resp?.data || []);
      setPaymentsTotal(resp?.pagination?.total || 0);
    } catch {
      if (reqId !== paysReqId.current) return;
      setPayments([]);
      setPaymentsTotal(0);
    } finally {
      if (reqId === paysReqId.current) setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 0) loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, billsPage, billsRowsPerPage, billsSearch, billsStatus]);

  useEffect(() => {
    if (tab === 1) loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, paymentsPage, paymentsRowsPerPage, paymentsSearch, paymentsMethod]);

  const openBillById = async (billId) => {
    if (!billId) return;
    setBillView({ open: true, loading: true, bill: null });
    try {
      const data = await fetchJson(`${API.billing}/${billId}`, { token });
      const b = data?.data || null;
      setBillView({ open: true, loading: false, bill: b });
      const total = Number(b?.total_amount || 0);
      const paid = Number(b?.paid_amount || 0);
      const balance = Math.max(0, total - paid);
      setPayForm((p) => ({ ...p, amount: String(balance > 0 ? balance : total) }));
      setShowAdvanced(false);
      await hydrateBillItemRefs(b);
    } catch (e) {
      setBillView({ open: false, loading: false, bill: null });
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const createBill = async ({ patient_id, consultation_id = null } = {}) => {
    if (!patient_id) return null;
    const created = await fetchJson(`${API.billing}/generate`, { method: "POST", token, body: { patient_id, consultation_id } });
    return created?.data || null;
  };

  useEffect(() => {
    const prefill = location?.state?.billingPrefill;
    if (!prefill || !token) return;
    setTab(0);

    (async () => {
      try {
        if (prefill.bill_id) {
          await openBillById(prefill.bill_id);
          return;
        }

        if (prefill.item_type && prefill.reference_id) {
          try {
            const qs = new URLSearchParams({ item_type: String(prefill.item_type), reference_id: String(prefill.reference_id) });
            const lookup = await fetchJson(`${API.billing}/by-reference?${qs.toString()}`, { token });
            const billId = lookup?.data?.bill_id;
            if (billId) {
              await openBillById(billId);
              return;
            }
          } catch {
            // ignore lookup errors; continue to create
          }
        }

        if (prefill.patient_id) {
          const bill = await createBill({ patient_id: String(prefill.patient_id) });
          await loadBills();
          if (bill?.id) {
            await openBillById(bill.id);
            setItemForm((p) => ({
              ...p,
              item_type: prefill.item_type || p.item_type,
              reference_id: prefill.reference_id || "",
              amount: prefill.amount != null ? String(prefill.amount) : p.amount,
            }));
            setShowAdvanced(true);
            await Swal.fire({ icon: "info", title: "Billing", text: "Bill created. Add the bill item and record payment inside the bill." });
          }
          return;
        }

        await Swal.fire({ icon: "info", title: "Billing", text: "Open a bill, add bill items, then record payment from the bill view." });
      } finally {
        navigate("/billing", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state?.billingPrefill, token]);

  const addItemToBill = async () => {
    const billId = billView.bill?.id;
    if (!billId) return;
    const item_type = String(itemForm.item_type || "").trim();
    const reference_id = String(itemForm.reference_id || "").trim();
    const amountRaw = String(itemForm.amount ?? "").trim();
    const amount = amountRaw === "" ? 0 : Number(amountRaw);
    if (!item_type) return Swal.fire({ icon: "warning", title: "Missing type", text: "Select item type." });
    if (!Number.isFinite(amount) || amount < 0) return Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a valid amount." });

    setItemSaving(true);
    try {
      await fetchJson(`${API.billing}/${billId}/items`, {
        method: "POST",
        token,
        body: { items: [{ item_type, reference_id: reference_id || null, amount }] },
      });
      setItemForm((p) => ({ ...p, reference_id: "", amount: "" }));
      await openBillById(billId);
      await loadBills();
      Swal.fire({ icon: "success", title: "Added", timer: 900, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setItemSaving(false);
    }
  };

  const takePaymentForOpenBill = async () => {
    const b = billView.bill;
    if (!b?.id) return;
    const amountRaw = String(payForm.amount ?? "").trim();
    const amount = amountRaw === "" ? 0 : Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a valid amount (> 0)." });

    setPaySaving(true);
    try {
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: { bill_id: b.id, amount_paid: amount, payment_method: payForm.method || "cash", payment_date: new Date().toISOString() },
      });
      await openBillById(b.id);
      await loadBills();
      await loadPayments();
      Swal.fire({ icon: "success", title: "Paid", text: "Payment recorded." });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e.message });
    } finally {
      setPaySaving(false);
    }
  };

  const markBillPaidById = async (billId) => {
    if (!billId) return;
    try {
      await fetchJson(`${API.billing}/${billId}/status`, {
        method: "PATCH",
        token,
        body: { status: "paid" },
      });
      Swal.fire({ icon: "success", title: "Updated", text: "Bill marked as paid." });
      await loadBills();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  return (
    <Card sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      <Box
        sx={{
          p: 2.5,
          background: heroGradient,
          color: "white",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
              Billing & Payments
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              if (tab === 0) loadBills();
              if (tab === 1) loadPayments();
            }}
            sx={{
              borderColor: "rgba(255,255,255,0.55)",
              color: "white",
              fontWeight: 800,
              "&:hover": { borderColor: "rgba(255,255,255,0.85)", bgcolor: "rgba(255,255,255,0.08)" },
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <CardContent sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main } }}
        >
          <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Billing" />
          <Tab icon={<PaymentsIcon />} iconPosition="start" label="Payments" />
        </Tabs>
        <Divider />

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Search (patient name/email/phone)"
                value={billsSearch}
                onChange={(e) => {
                  setBillsSearch(e.target.value);
                  setBillsPage(0);
                }}
              />
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 200 } }}>
                <InputLabel id="bill-status-filter">Status</InputLabel>
                <Select
                  labelId="bill-status-filter"
                  value={billsStatus}
                  label="Status"
                  onChange={(e) => {
                    setBillsStatus(e.target.value);
                    setBillsPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={async () => {
                  const ask = await Swal.fire({
                    icon: "question",
                    title: "Create bill",
                    input: "text",
                    inputLabel: "Patient ID",
                    inputPlaceholder: "patient_id (UUID)",
                    showCancelButton: true,
                    confirmButtonText: "Create",
                    cancelButtonText: "Cancel",
                    reverseButtons: true,
                    inputValidator: (v) => (!String(v || "").trim() ? "patient_id is required" : undefined),
                  });
                  if (!ask.isConfirmed) return;
                  try {
                    const bill = await createBill({ patient_id: String(ask.value).trim() });
                    await loadBills();
                    if (bill?.id) await openBillById(bill.id);
                  } catch (e) {
                    Swal.fire({ icon: "error", title: "Failed", text: e.message });
                  }
                }}
                sx={{ fontWeight: 900, minWidth: { xs: "100%", md: 160 } }}
              >
                New Bill
              </Button>
            </Stack>

            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Patient</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Paid</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 900 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading bills…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : bills.length ? (
                    bills.map((b, idx) => {
                      const patientName = b?.patient?.full_name || b?.patient?.user?.full_name || "—";
                      const status = b?.paid ? "paid" : b?.status || "unpaid";
                      return (
                        <TableRow key={b.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                            {billsPage * billsRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 800 }}>{patientName}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {b?.patient?.phone || b?.patient?.email || b?.patient?.user?.phone || b?.patient?.user?.email || ""}
                            </Typography>
                          </TableCell>
                          <TableCell>{money(b.total_amount)}</TableCell>
                          <TableCell>{money(b.paid_amount)}</TableCell>
                          <TableCell>{money(b.balance)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={status}
                              color={status === "paid" ? "success" : status === "cancelled" ? "error" : "default"}
                              variant={status === "paid" ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell>{formatDateTime(b.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="View bill">
                                <Button size="small" variant="outlined" onClick={() => openBillById(b.id)} startIcon={<VisibilityIcon />} sx={{ fontWeight: 800 }}>
                                  View
                                </Button>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No bills found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={billsTotal}
              page={billsPage}
              onPageChange={(_, p) => setBillsPage(p)}
              rowsPerPage={billsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setBillsRowsPerPage(parseInt(e.target.value, 10));
                setBillsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Search (patient or bill id)"
                value={paymentsSearch}
                onChange={(e) => {
                  setPaymentsSearch(e.target.value);
                  setPaymentsPage(0);
                }}
              />
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
                <InputLabel id="payment-method-filter">Method</InputLabel>
                <Select
                  labelId="payment-method-filter"
                  value={paymentsMethod}
                  label="Method"
                  onChange={(e) => {
                    setPaymentsMethod(e.target.value);
                    setPaymentsPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="test">Test</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="mpesa">M-Pesa</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadPayments}
                disabled={paymentsLoading}
                sx={{ fontWeight: 800, minWidth: { xs: "100%", md: 140 } }}
              >
                Refresh
              </Button>
            </Stack>

            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Patient</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Bill</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading payments…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : payments.length ? (
                    payments.map((p, idx) => {
                      const bill = p?.bill;
                      const patientName = bill?.patient?.full_name || bill?.patient?.user?.full_name || "—";
                      return (
                        <TableRow key={p.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                            {paymentsPage * paymentsRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell>{formatDateTime(p.payment_date)}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 800 }}>{patientName}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {bill?.patient?.phone || bill?.patient?.email || bill?.patient?.user?.phone || bill?.patient?.user?.email || ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 800 }}>
                              {bill?.appointment_id ? "Appointment bill" : bill?.consultation_id ? "Consultation bill" : "Bill"}{" "}
                              {bill?.total_amount != null ? `• ${money(bill.total_amount)}` : ""}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              Ref: {shortId(p.bill_id)}
                            </Typography>
                            <Button size="small" variant="text" onClick={() => openBillById(p.bill_id)} sx={{ px: 0, mt: 0.5, fontWeight: 800 }}>
                              View bill
                            </Button>
                          </TableCell>
                          <TableCell>{money(p.amount_paid)}</TableCell>
                          <TableCell>{p.payment_method}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No payments found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={paymentsTotal}
              page={paymentsPage}
              onPageChange={(_, p) => setPaymentsPage(p)}
              rowsPerPage={paymentsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setPaymentsRowsPerPage(parseInt(e.target.value, 10));
                setPaymentsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}
      </CardContent>

      {/* Bill view (payments are initiated here) */}
      <Dialog open={billView.open} onClose={() => setBillView({ open: false, loading: false, bill: null })} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Bill</DialogTitle>
        <DialogContent dividers>
          {billView.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : !billView.bill ? (
            <Typography color="text.secondary">No data.</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>
                    {billView.bill.patient?.full_name || billView.bill.patient?.user?.full_name || "Patient"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDateTime(billView.bill.createdAt)} • Status: {billView.bill.paid ? "paid" : billView.bill.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reference: {shortId(billView.bill.id)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => markBillPaidById(billView.bill.id)} disabled={billView.bill.paid} sx={{ fontWeight: 900 }}>
                    Mark paid
                  </Button>
                </Stack>
              </Stack>

              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary">
                      Total
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>{money(billView.bill.total_amount)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary">
                      Paid
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>{money(billView.bill.paid_amount)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary">
                      Balance
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>{money(billView.bill.balance)}</Typography>
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between">
                  <Typography sx={{ fontWeight: 900 }}>Advanced</Typography>
                  <FormControlLabel
                    control={<Switch checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} />}
                    label="Show manual bill item editor"
                  />
                </Stack>
                {showAdvanced ? (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography sx={{ fontWeight: 900, mb: 1 }}>Add bill item</Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                      <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Item type</InputLabel>
                        <Select label="Item type" value={itemForm.item_type} onChange={(e) => setItemForm((p) => ({ ...p, item_type: e.target.value }))}>
                          <MenuItem value="appointment">appointment</MenuItem>
                          <MenuItem value="lab_order">lab_order</MenuItem>
                          <MenuItem value="prescription">prescription</MenuItem>
                          <MenuItem value="service">service</MenuItem>
                          <MenuItem value="other">other</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        label="Reference (ID or note)"
                        fullWidth
                        value={itemForm.reference_id}
                        onChange={(e) => setItemForm((p) => ({ ...p, reference_id: e.target.value }))}
                        placeholder="optional: paste an ID OR type a short note"
                      />
                      <TextField size="small" label="Amount" value={itemForm.amount} onChange={(e) => setItemForm((p) => ({ ...p, amount: e.target.value }))} inputMode="decimal" sx={{ maxWidth: 220 }} />
                      <Button variant="contained" onClick={addItemToBill} disabled={itemSaving} sx={{ fontWeight: 900, minWidth: 140 }}>
                        {itemSaving ? "Adding…" : "Add item"}
                      </Button>
                    </Stack>
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Only use this if you need to manually add/adjust charges. Most items are auto-created by the system.
                    </Alert>
                  </>
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Hidden by default to keep billing simple.
                  </Typography>
                )}
              </Box>

              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 1 }}>Bill items</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(billView.bill.items || []).length ? (
                      (billView.bill.items || []).flatMap((it, idx) => {
                        const key = it?.reference_id ? refKey(it.item_type, it.reference_id) : null;
                        const d = key ? refDetails[key] : null;
                        const hasBreakdown = it.item_type === "lab_order" && Array.isArray(d?.tests) && d.tests.length > 0;
                        const expanded = Boolean(expandedItemIds[it.id]);
                        const testsSum = Number(d?.tests_total || 0);
                        const itemAmount = Number(it.amount || 0);
                        const showDiffNote = hasBreakdown && Math.abs(itemAmount - testsSum) > 0.009;

                        const mainRow = (
                          <TableRow key={it.id} hover>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>{it.item_type}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontWeight: 800 }}>{labelForRef(it, billView.bill)}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block" }}>
                                {!it.reference_id ? "—" : isUuidLike(it.reference_id) ? shortId(it.reference_id) : String(it.reference_id)}
                              </Typography>
                              {hasBreakdown && (
                                <Button size="small" variant="text" onClick={() => toggleItemExpanded(it.id)} sx={{ px: 0, mt: 0.5, fontWeight: 800 }}>
                                  {expanded ? "Hide tests" : "Show tests"}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>{money(it.amount)}</TableCell>
                          </TableRow>
                        );

                        if (!hasBreakdown || !expanded) return [mainRow];

                        const detailsRow = (
                          <TableRow key={`${it.id}__details`}>
                            <TableCell colSpan={4} sx={{ bgcolor: "rgba(0,0,0,0.01)" }}>
                              <Box sx={{ px: 0.5, py: 1 }}>
                                <Typography sx={{ fontWeight: 900, mb: 1 }}>Lab tests breakdown</Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 800 }}>Test</TableCell>
                                      <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                                      <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {d.tests.map((t) => (
                                      <TableRow key={t.id} hover>
                                        <TableCell sx={{ fontWeight: 800 }}>{t.name}</TableCell>
                                        <TableCell>{t.code || "—"}</TableCell>
                                        <TableCell>{money(t.price)}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow>
                                      <TableCell colSpan={2} sx={{ fontWeight: 900 }}>
                                        Total
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 900 }}>{money(testsSum)}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                                {showDiffNote && (
                                  <Alert severity="info" sx={{ mt: 1 }}>
                                    Bill item amount is {money(itemAmount)} but tests sum to {money(testsSum)}. (This can happen if an adjustment was added.)
                                  </Alert>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );

                        return [mainRow, detailsRow];
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary">No items yet.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>

              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 900 }}>Payments</Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                    <TextField size="small" label="Amount" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} inputMode="decimal" sx={{ maxWidth: 200 }} />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Method</InputLabel>
                      <Select label="Method" value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
                        <MenuItem value="cash">cash</MenuItem>
                        <MenuItem value="mpesa">mpesa</MenuItem>
                        <MenuItem value="card">card</MenuItem>
                        <MenuItem value="test">test</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="contained" onClick={takePaymentForOpenBill} disabled={paySaving || billView.bill.paid} sx={{ fontWeight: 900, minWidth: 160 }}>
                      {paySaving ? "Processing…" : "Record payment"}
                    </Button>
                  </Stack>
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Method</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(billView.bill.payments || []).length ? (
                      (billView.bill.payments || []).map((p, idx) => (
                        <TableRow key={p.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{idx + 1}</TableCell>
                          <TableCell>{formatDateTime(p.payment_date)}</TableCell>
                          <TableCell>{money(p.amount_paid)}</TableCell>
                          <TableCell>{p.payment_method}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary">No payments yet.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setBillView({ open: false, loading: false, bill: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

