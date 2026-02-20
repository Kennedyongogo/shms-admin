import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  Delete,
  Refresh,
  Science,
  Search,
  Visibility,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  labOrders: "/api/lab-orders",
  labTests: "/api/lab-tests",
  labResults: "/api/lab-results",
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

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

export default function LaboratoryManagement() {
  const theme = useTheme();
  const token = getToken();
  const navigate = useNavigate();
  const roleName = getRoleName();
  const isAdmin = roleName === "admin";

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const requireTokenGuard = () => {
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Not logged in",
        text: "Please sign in again.",
      });
      setTimeout(() => (window.location.href = "/"), 500);
      return false;
    }
    return true;
  };

  const [tab, setTab] = useState(0); // 0 tests, 1 orders, 2 results

  // Lab Orders
  const orderReqId = useRef(0);
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(0);
  const [orderRowsPerPage, setOrderRowsPerPage] = useState(10);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSearchLocked, setOrderSearchLocked] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState("");

  const [orderView, setOrderView] = useState({ open: false, order: null });
  const [orderStatusDraft, setOrderStatusDraft] = useState("");
  const [orderStatusSaving, setOrderStatusSaving] = useState(false);
  const [orderBilling, setOrderBilling] = useState(null);
  const [orderBillingLoading, setOrderBillingLoading] = useState(false);

  // Lab Tests
  const testReqId = useRef(0);
  const [tests, setTests] = useState([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testPage, setTestPage] = useState(0);
  const [testRowsPerPage, setTestRowsPerPage] = useState(10);
  const [testTotal, setTestTotal] = useState(0);
  const [testSearch, setTestSearch] = useState("");
  const [testSearchLocked, setTestSearchLocked] = useState(true);

  const [testDialog, setTestDialog] = useState({
    open: false,
    mode: "create",
    id: null,
  });
  const [testForm, setTestForm] = useState({
    test_name: "",
    test_code: "",
    price: "",
  });

  // Lab Results
  const resultReqId = useRef(0);
  const [results, setResults] = useState([]);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultPage, setResultPage] = useState(0);
  const [resultRowsPerPage, setResultRowsPerPage] = useState(10);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultSearch, setResultSearch] = useState("");
  const [resultSearchLocked, setResultSearchLocked] = useState(true);

  const [resultDialog, setResultDialog] = useState({
    open: false,
    lab_order_item_id: null,
    lab_order: null,
  });
  const [resultSaving, setResultSaving] = useState(false);
  const [resultForm, setResultForm] = useState({
    result_value: "",
    reference_range: "",
    interpretation: "",
    result_date: "",
  });

  const loadOrders = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++orderReqId.current;
    setOrderLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(orderPage + 1),
        limit: String(orderRowsPerPage),
        ...(orderSearch.trim() ? { search: orderSearch.trim() } : {}),
        ...(orderStatusFilter ? { status: orderStatusFilter } : {}),
      });
      const data = await fetchJson(`${API.labOrders}?${qs.toString()}`, {
        token,
      });
      if (reqId !== orderReqId.current) return;
      setOrders(data.data || []);
      setOrderTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== orderReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== orderReqId.current) return;
      setOrderLoading(false);
    }
  };

  const loadTests = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++testReqId.current;
    setTestLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(testPage + 1),
        limit: String(testRowsPerPage),
        ...(testSearch.trim() ? { search: testSearch.trim() } : {}),
      });
      const data = await fetchJson(`${API.labTests}?${qs.toString()}`, {
        token,
      });
      if (reqId !== testReqId.current) return;
      setTests(data.data || []);
      setTestTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== testReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== testReqId.current) return;
      setTestLoading(false);
    }
  };

  const loadResults = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++resultReqId.current;
    setResultLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(resultPage + 1),
        limit: String(resultRowsPerPage),
        ...(resultSearch.trim() ? { search: resultSearch.trim() } : {}),
      });
      const data = await fetchJson(`${API.labResults}?${qs.toString()}`, {
        token,
      });
      if (reqId !== resultReqId.current) return;
      setResults(data.data || []);
      setResultTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== resultReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== resultReqId.current) return;
      setResultLoading(false);
    }
  };

  // debounce searches
  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 1) return;
      if (orderPage !== 0) setOrderPage(0);
      else loadOrders();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, orderSearch, orderStatusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 0) return;
      if (testPage !== 0) setTestPage(0);
      else loadTests();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, testSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 2) return;
      if (resultPage !== 0) setResultPage(0);
      else loadResults();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, resultSearch]);

  useEffect(() => {
    if (tab === 0) loadTests();
    if (tab === 1) loadOrders();
    if (tab === 2) loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    orderPage,
    orderRowsPerPage,
    testPage,
    testRowsPerPage,
    resultPage,
    resultRowsPerPage,
  ]);

  const openOrder = (o) => {
    setOrderView({ open: true, order: o });
    setOrderStatusDraft(o.status || "");
    setOrderBilling(null);
    if (o?.id) loadOrderBilling(o.id);
  };

  const deleteOrder = async (o) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const r = await Swal.fire({
      icon: "warning",
      title: "Delete lab order?",
      html: `Delete lab order for <b>${o.patient?.full_name || o.patient?.user?.full_name || "patient"}</b>?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d32f2f",
      reverseButtons: true,
    });
    if (!r.isConfirmed) return;
    try {
      await fetchJson(`${API.labOrders}/${o.id}`, { method: "DELETE", token });
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 900,
        showConfirmButton: false,
      });
      await loadOrders();
      setOrderView({ open: false, order: null });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const saveOrderStatus = async () => {
    if (!requireTokenGuard()) return;
    const o = orderView.order;
    if (!o?.id) return;
    const current = o.status;
    const paid = Boolean(orderBilling?.paid);
    const allowedNonAdmin = new Set(["in_progress", ...(paid ? ["completed"] : [])]);
    if (!isAdmin) {
      if (!allowedNonAdmin.has(orderStatusDraft)) {
        Swal.fire({
          icon: "info",
          title: "Not allowed",
          text: paid
            ? "You can only set lab order status to in_progress or completed."
            : "You can only set lab order status to in_progress until payment is recorded.",
        });
        return;
      }
      // Mirror backend transition rules for lab tech
      if (current === "pending" && orderStatusDraft !== "in_progress") {
        Swal.fire({ icon: "info", title: "Not allowed", text: "From pending you can only move to in_progress." });
        return;
      }
      if (current === "in_progress" && orderStatusDraft !== "completed") {
        Swal.fire({ icon: "info", title: "Not allowed", text: "From in_progress you can only move to completed." });
        return;
      }
    }
    if (orderStatusDraft === "completed" && !orderBilling?.paid) {
      const ask = await Swal.fire({
        icon: "warning",
        title: "Payment required",
        text: "You must record payment before marking a lab order as completed.",
        showCancelButton: true,
        confirmButtonText: "Open billing",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });
      if (ask.isConfirmed) {
        openBillingForLabOrder(o);
      }
      return;
    }
    setOrderStatusSaving(true);
    try {
      await fetchJson(`${API.labOrders}/${o.id}/status`, {
        method: "PATCH",
        token,
        body: { status: orderStatusDraft },
      });
      Swal.fire({
        icon: "success",
        title: "Updated",
        timer: 900,
        showConfirmButton: false,
      });
      setOrderView({ open: false, order: null });
      await loadOrders();
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
          openBillingForLabOrder(o);
        }
        return;
      }
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setOrderStatusSaving(false);
    }
  };

  const loadOrderBilling = async (orderId) => {
    if (!requireTokenGuard()) return;
    setOrderBillingLoading(true);
    try {
      const qs = new URLSearchParams({
        item_type: "lab_order",
        reference_id: String(orderId),
      });
      const data = await fetchJson(
        `${API.billing}/by-reference?${qs.toString()}`,
        { token },
      );
      setOrderBilling(data?.data || null);
    } catch {
      setOrderBilling(null);
    } finally {
      setOrderBillingLoading(false);
    }
  };

  const openBillingForLabOrder = (order) => {
    if (!order?.id) return;
    const patientId = order?.patient?.id || order?.patient_id;
    const computed = (order?.items || []).reduce(
      (sum, it) => sum + Number(it?.labTest?.price || 0),
      0,
    );
    navigate("/billing", {
      state: {
        billingPrefill: {
          item_type: "lab_order",
          reference_id: order.id,
          patient_id: patientId || null,
          amount: computed || null,
        },
      },
    });
  };

  const openCreateTest = () => {
    setTestForm({ test_name: "", test_code: "", price: "" });
    setTestDialog({ open: true, mode: "create", id: null });
  };
  const openEditTest = (t) => {
    setTestForm({
      test_name: t.test_name || "",
      test_code: t.test_code || "",
      price: t.price ?? "",
    });
    setTestDialog({ open: true, mode: "edit", id: t.id });
  };

  const saveTest = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!testForm.test_name.trim())
      return Swal.fire({
        icon: "warning",
        title: "Missing name",
        text: "Test name is required.",
      });
    if (!testForm.test_code.trim())
      return Swal.fire({
        icon: "warning",
        title: "Missing code",
        text: "Test code is required.",
      });
    const priceRaw = String(testForm.price ?? "").trim();
    const payload = {
      test_name: testForm.test_name.trim(),
      test_code: testForm.test_code.trim(),
      price: priceRaw ? priceRaw : null,
    };
    try {
      if (testDialog.mode === "create") {
        await fetchJson(API.labTests, { method: "POST", token, body: payload });
        Swal.fire({
          icon: "success",
          title: "Created",
          timer: 900,
          showConfirmButton: false,
        });
      } else {
        await fetchJson(`${API.labTests}/${testDialog.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        Swal.fire({
          icon: "success",
          title: "Updated",
          timer: 900,
          showConfirmButton: false,
        });
      }
      setTestDialog({ open: false, mode: "create", id: null });
      await loadTests();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const deleteTest = async (t) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const r = await Swal.fire({
      icon: "warning",
      title: "Delete lab test?",
      html: `Delete <b>${t.test_name}</b> (${t.test_code})?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d32f2f",
    });
    if (!r.isConfirmed) return;
    try {
      await fetchJson(`${API.labTests}/${t.id}`, { method: "DELETE", token });
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 900,
        showConfirmButton: false,
      });
      await loadTests();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const openEnterResult = (labOrderItemId, existingResult, labOrder) => {
    setResultDialog({
      open: true,
      lab_order_item_id: labOrderItemId,
      lab_order: labOrder || existingResult?.labOrderItem?.labOrder || null,
    });
    setResultForm({
      result_value: existingResult?.result_value || "",
      reference_range: existingResult?.reference_range || "",
      interpretation: existingResult?.interpretation || "",
      result_date: existingResult?.result_date
        ? new Date(existingResult.result_date).toISOString().slice(0, 16)
        : "",
    });
  };

  const saveResult = async () => {
    if (!requireTokenGuard()) return;
    if (!resultDialog.lab_order_item_id) return;
    setResultSaving(true);
    try {
      await fetchJson(API.labResults, {
        method: "POST",
        token,
        body: {
          lab_order_item_id: resultDialog.lab_order_item_id,
          result_value: resultForm.result_value.trim() || null,
          reference_range: resultForm.reference_range.trim() || null,
          interpretation: resultForm.interpretation.trim() || null,
          result_date: resultForm.result_date
            ? new Date(resultForm.result_date).toISOString()
            : null,
        },
      });
      Swal.fire({
        icon: "success",
        title: "Saved",
        timer: 900,
        showConfirmButton: false,
      });
      setResultDialog({
        open: false,
        lab_order_item_id: null,
        lab_order: null,
      });
      await loadOrders();
      await loadResults();
    } catch (e) {
      if (Number(e?.status) === 402 && e?.data?.code === "PAYMENT_REQUIRED") {
        const ask = await Swal.fire({
          icon: "warning",
          title: "Payment required",
          text: "Pay the lab order bill before entering results.",
          showCancelButton: true,
          confirmButtonText: "Open billing",
          cancelButtonText: "Cancel",
          reverseButtons: true,
        });
        if (ask.isConfirmed) {
          const order = resultDialog.lab_order || null;
          if (order?.id) openBillingForLabOrder(order);
          else
            Swal.fire({
              icon: "info",
              title: "Missing order",
              text: "Open the lab order and use its Billing button.",
            });
        }
        return;
      }
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setResultSaving(false);
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
                <Science />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Laboratory
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                Track lab orders, maintain lab tests, and enter results.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => {
                    if (tab === 0) loadTests();
                    if (tab === 1) loadOrders();
                    if (tab === 2) loadResults();
                  }}
                  sx={{
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              {isAdmin && tab === 0 && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={openCreateTest}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  New Lab Test
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
            <Tab label="Lab Tests" />
            <Tab label="Lab Orders" />
            <Tab label="Results" />
          </Tabs>
          <Divider />

          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              {!isAdmin && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You can view lab tests, but only admins can
                  create/edit/delete.
                </Alert>
              )}
              <TextField
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="Search lab tests…"
                size="small"
                fullWidth
                type="search"
                autoComplete="off"
                onFocus={() => setTestSearchLocked(false)}
                onClick={() => setTestSearchLocked(false)}
                InputProps={{
                  readOnly: testSearchLocked,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
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
                      <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testLoading ? (
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
                              Loading lab tests…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : tests.length ? (
                      tests.map((t, idx) => (
                        <TableRow key={t.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {testPage * testRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {t.test_name}
                          </TableCell>
                          <TableCell>{t.test_code}</TableCell>
                          <TableCell>{fmt(t.price)}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            {isAdmin && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => openEditTest(t)}
                                  sx={{ mr: 1 }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => deleteTest(t)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No lab tests found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={testTotal}
                page={testPage}
                onPageChange={(_, p) => setTestPage(p)}
                rowsPerPage={testRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setTestRowsPerPage(parseInt(e.target.value, 10));
                  setTestPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search lab orders (patient name/email/phone)…"
                  size="small"
                  fullWidth
                  type="search"
                  autoComplete="off"
                  onFocus={() => setOrderSearchLocked(false)}
                  onClick={() => setOrderSearchLocked(false)}
                  InputProps={{
                    readOnly: orderSearchLocked,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    autoComplete: "off",
                    "data-lpignore": "true",
                    "data-1p-ignore": "true",
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={orderStatusFilter}
                    label="Status"
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">pending</MenuItem>
                    <MenuItem value="in_progress">in_progress</MenuItem>
                    <MenuItem value="completed">completed</MenuItem>
                    <MenuItem value="cancelled">cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

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
                      <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Tests</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderLoading ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 2 }}
                          >
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Loading lab orders…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : orders.length ? (
                      orders.map((o, idx) => (
                        <TableRow key={o.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {orderPage * orderRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDateTime(o.createdAt)}
                          </TableCell>
                          <TableCell>
                            {o.patient?.full_name ||
                              o.patient?.user?.full_name ||
                              "—"}
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block" }}
                            >
                              {o.patient?.phone ||
                                o.patient?.email ||
                                o.patient?.user?.phone ||
                                o.patient?.user?.email ||
                                ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {o.doctor?.user?.full_name ||
                              o.doctor?.staff_type ||
                              "—"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={o.status}
                              color={
                                o.status === "completed"
                                  ? "success"
                                  : o.status === "cancelled"
                                    ? "error"
                                    : "default"
                              }
                              variant={
                                o.status === "pending" ? "outlined" : "filled"
                              }
                            />
                          </TableCell>
                          <TableCell>{o.items?.length || 0}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="View / Enter results">
                              <IconButton
                                onClick={() => openOrder(o)}
                                size="small"
                              >
                                <Visibility fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title="Delete">
                                <IconButton
                                  onClick={() => deleteOrder(o)}
                                  size="small"
                                  color="error"
                                >
                                  <Delete fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No lab orders found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={orderTotal}
                page={orderPage}
                onPageChange={(_, p) => setOrderPage(p)}
                rowsPerPage={orderRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setOrderRowsPerPage(parseInt(e.target.value, 10));
                  setOrderPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ p: 2 }}>
              <TextField
                value={resultSearch}
                onChange={(e) => setResultSearch(e.target.value)}
                placeholder="Search results (value/range)…"
                size="small"
                fullWidth
                type="search"
                autoComplete="off"
                onFocus={() => setResultSearchLocked(false)}
                onClick={() => setResultSearchLocked(false)}
                InputProps={{
                  readOnly: resultSearchLocked,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
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
                      <TableCell sx={{ fontWeight: 800 }}>Test</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Result</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Range</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Technician</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultLoading ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 2 }}
                          >
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Loading results…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : results.length ? (
                      results.map((r, idx) => (
                        <TableRow key={r.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {resultPage * resultRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDateTime(r.result_date || r.createdAt)}
                          </TableCell>
                          <TableCell>
                            {r.labOrderItem?.labOrder?.patient?.full_name ||
                              r.labOrderItem?.labOrder?.patient?.user
                                ?.full_name ||
                              "—"}
                          </TableCell>
                          <TableCell>
                            {r.labOrderItem?.labTest?.test_name || "—"}
                          </TableCell>
                          <TableCell>{fmt(r.result_value)}</TableCell>
                          <TableCell>{fmt(r.reference_range)}</TableCell>
                          <TableCell>
                            {r.labTechnician?.user?.full_name || "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                openEnterResult(
                                  r.lab_order_item_id,
                                  r,
                                  r.labOrderItem?.labOrder,
                                )
                              }
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No results found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={resultTotal}
                page={resultPage}
                onPageChange={(_, p) => setResultPage(p)}
                rowsPerPage={resultRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setResultRowsPerPage(parseInt(e.target.value, 10));
                  setResultPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Order view */}
      <Dialog
        open={orderView.open}
        onClose={() => setOrderView({ open: false, order: null })}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Lab Order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 900 }}>
              Patient:{" "}
              {orderView.order?.patient?.full_name ||
                orderView.order?.patient?.user?.full_name ||
                "—"}
            </Typography>
            <Typography color="text.secondary">
              Created: {formatDateTime(orderView.order?.createdAt)}
            </Typography>

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
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
                  {orderBillingLoading ? (
                    <Chip size="small" label="Checking…" />
                  ) : (
                    <Chip
                      size="small"
                      label={
                        orderBilling?.paid
                          ? "paid"
                          : orderBilling?.exists
                            ? orderBilling?.status || "unpaid"
                            : "unbilled"
                      }
                      color={orderBilling?.paid ? "success" : "default"}
                      variant={orderBilling?.paid ? "filled" : "outlined"}
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                </Stack>
                <Button
                  variant="outlined"
                  onClick={() => openBillingForLabOrder(orderView.order)}
                  disabled={orderBillingLoading || orderBilling?.paid}
                  sx={{ fontWeight: 900 }}
                >
                  Open billing
                </Button>
              </Stack>
              {orderBilling?.exists ? (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Total: {orderBilling.total_amount} • Paid:{" "}
                  {orderBilling.paid_amount} • Balance: {orderBilling.balance}
                </Typography>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  No bill found for this lab order yet.
                </Typography>
              )}
              {!orderBilling?.paid && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Lab order completion and entering results are blocked until
                  payment is recorded.
                </Alert>
              )}
            </Box>

            <FormControl size="small" sx={{ maxWidth: 240 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={orderStatusDraft}
                onChange={(e) => setOrderStatusDraft(e.target.value)}
              >
                {(() => {
                  const current = orderView.order?.status;
                  const paid = Boolean(orderBilling?.paid);
                  const base = isAdmin
                    ? ["pending", "in_progress", "completed", "cancelled"]
                    : ["in_progress", ...(paid ? ["completed"] : [])];
                  const opts = Array.from(new Set([current, ...base].filter(Boolean)));
                  return opts.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ));
                })()}
              </Select>
            </FormControl>

            <Divider />
            <Typography sx={{ fontWeight: 900 }}>Tests</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Test</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Result</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(orderView.order?.items || []).map((it) => (
                  <TableRow key={it.id} hover>
                    <TableCell>{it.labTest?.test_name || "—"}</TableCell>
                    <TableCell>{it.labTest?.test_code || "—"}</TableCell>
                    <TableCell>
                      {it.result?.result_value ? (
                        it.result.result_value
                      ) : (
                        <Chip size="small" label="pending" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!orderBilling?.paid}
                        onClick={() =>
                          openEnterResult(it.id, it.result, orderView.order)
                        }
                      >
                        {it.result ? "Update result" : "Enter result"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!(orderView.order?.items || []).length && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography color="text.secondary">
                        No tests on this order.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setOrderView({ open: false, order: null })}
          >
            Close
          </Button>
          {isAdmin && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => deleteOrder(orderView.order)}
              disabled={!orderView.order?.id}
            >
              Delete
            </Button>
          )}
          <Button
            variant="contained"
            onClick={saveOrderStatus}
            disabled={orderStatusSaving}
            sx={{ fontWeight: 900 }}
          >
            {orderStatusSaving ? "Saving…" : "Save status"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lab test create/edit */}
      <Dialog
        open={testDialog.open}
        onClose={() => setTestDialog({ open: false, mode: "create", id: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {testDialog.mode === "create" ? "Create Lab Test" : "Edit Lab Test"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Test name"
              fullWidth
              value={testForm.test_name}
              onChange={(e) =>
                setTestForm((p) => ({ ...p, test_name: e.target.value }))
              }
            />
            <TextField
              label="Test code"
              fullWidth
              value={testForm.test_code}
              onChange={(e) =>
                setTestForm((p) => ({ ...p, test_code: e.target.value }))
              }
            />
            <TextField
              label="Price (optional)"
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              fullWidth
              value={testForm.price}
              onChange={(e) =>
                setTestForm((p) => ({ ...p, price: e.target.value }))
              }
            />
            {!isAdmin && (
              <Alert severity="info">
                Only admins can create/edit lab tests.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setTestDialog({ open: false, mode: "create", id: null })
            }
          >
            Cancel
          </Button>
          {isAdmin && (
            <Button
              variant="contained"
              onClick={saveTest}
              sx={{
                bgcolor: theme.palette.primary.main,
                "&:hover": { bgcolor: theme.palette.primary.dark },
                fontWeight: 900,
              }}
            >
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Enter/Update result */}
      <Dialog
        open={resultDialog.open}
        onClose={() =>
          setResultDialog({
            open: false,
            lab_order_item_id: null,
            lab_order: null,
          })
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Lab Result</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Result value"
              fullWidth
              value={resultForm.result_value}
              onChange={(e) =>
                setResultForm((p) => ({ ...p, result_value: e.target.value }))
              }
            />
            <TextField
              label="Reference range (optional)"
              fullWidth
              value={resultForm.reference_range}
              onChange={(e) =>
                setResultForm((p) => ({
                  ...p,
                  reference_range: e.target.value,
                }))
              }
            />
            <TextField
              label="Interpretation (optional)"
              fullWidth
              multiline
              minRows={3}
              value={resultForm.interpretation}
              onChange={(e) =>
                setResultForm((p) => ({ ...p, interpretation: e.target.value }))
              }
            />
            <TextField
              label="Result date (optional)"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={resultForm.result_date}
              onChange={(e) =>
                setResultForm((p) => ({ ...p, result_date: e.target.value }))
              }
            />
            <Alert severity="info">
              Technician is saved automatically from the logged-in staff account
              (if available).
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() =>
              setResultDialog({ open: false, lab_order_item_id: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveResult}
            disabled={resultSaving}
            sx={{ fontWeight: 900 }}
          >
            {resultSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
