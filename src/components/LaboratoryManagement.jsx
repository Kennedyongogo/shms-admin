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
  Payments as PaymentsIcon,
  Refresh,
  Receipt as ReceiptIcon,
  Science,
  Search,
  Visibility,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";
import ReceiptDialog from "./ReceiptDialog";

const API = {
  labOrders: "/api/lab-orders",
  labTests: "/api/lab-tests",
  labResults: "/api/lab-results",
  billing: "/api/billing",
  payments: "/api/payments",
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

  const [tab, setTab] = useState(0); // 0 tests, 1 orders, 2 results, 3 billing, 4 payment

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
  const [orderBillItemAmount, setOrderBillItemAmount] = useState("");
  const [orderBillItemNote, setOrderBillItemNote] = useState("");
  const [orderBillItemSaving, setOrderBillItemSaving] = useState(false);
  const [orderPayAmount, setOrderPayAmount] = useState("");
  const [orderPayMethod, setOrderPayMethod] = useState("cash");
  const [orderPaySaving, setOrderPaySaving] = useState(false);

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

  // Lab billing & payment tab (bills for lab orders)
  const labBillsReqId = useRef(0);
  const [labBills, setLabBills] = useState([]);
  const [labBillsLoading, setLabBillsLoading] = useState(false);
  const [labBillsPage, setLabBillsPage] = useState(0);
  const [labBillsRowsPerPage, setLabBillsRowsPerPage] = useState(10);
  const [labBillsTotal, setLabBillsTotal] = useState(0);
  const [labBillView, setLabBillView] = useState({ open: false, bill: null, loading: false });
  const [labBillPayAmount, setLabBillPayAmount] = useState("");
  const [labBillPayMethod, setLabBillPayMethod] = useState("cash");
  const [labBillPaySaving, setLabBillPaySaving] = useState(false);

  // Lab payments tab (payments for lab order bills)
  const labPaymentsReqId = useRef(0);
  const [labPayments, setLabPayments] = useState([]);
  const [labPaymentsLoading, setLabPaymentsLoading] = useState(false);
  const [labPaymentsPage, setLabPaymentsPage] = useState(0);
  const [labPaymentsRowsPerPage, setLabPaymentsRowsPerPage] = useState(10);
  const [labPaymentsTotal, setLabPaymentsTotal] = useState(0);
  const [receiptDialogPaymentId, setReceiptDialogPaymentId] = useState(null);

  const loadLabBills = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++labBillsReqId.current;
    setLabBillsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(labBillsPage + 1),
        limit: String(labBillsRowsPerPage),
        item_type: "lab_order",
      });
      const data = await fetchJson(`${API.billing}?${qs.toString()}`, { token });
      if (reqId !== labBillsReqId.current) return;
      setLabBills(data.data || []);
      setLabBillsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== labBillsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
      setLabBills([]);
    } finally {
      if (reqId === labBillsReqId.current) setLabBillsLoading(false);
    }
  };

  const loadLabPayments = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++labPaymentsReqId.current;
    setLabPaymentsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(labPaymentsPage + 1),
        limit: String(labPaymentsRowsPerPage),
        for_lab: "1",
      });
      const data = await fetchJson(`${API.payments}?${qs.toString()}`, { token });
      if (reqId !== labPaymentsReqId.current) return;
      setLabPayments(data.data || []);
      setLabPaymentsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== labPaymentsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
      setLabPayments([]);
    } finally {
      if (reqId === labPaymentsReqId.current) setLabPaymentsLoading(false);
    }
  };

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

  // Load only the active tab's data to avoid multiple loading flashes on mount
  useEffect(() => {
    if (tab === 0) loadTests();
    else if (tab === 1) loadOrders();
    else if (tab === 2) loadResults();
    else if (tab === 3) loadLabBills();
    else if (tab === 4) loadLabPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    orderPage,
    orderRowsPerPage,
    testPage,
    testRowsPerPage,
    resultPage,
    resultRowsPerPage,
    labBillsPage,
    labBillsRowsPerPage,
    labPaymentsPage,
    labPaymentsRowsPerPage,
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
      const billing = data?.data || null;
      setOrderBilling(billing);
      if (billing?.balance != null) setOrderPayAmount(String(billing.balance));
    } catch {
      setOrderBilling(null);
    } finally {
      setOrderBillingLoading(false);
    }
  };

  const addOrderBillItem = async () => {
    const billId = orderBilling?.bill_id;
    const order = orderView.order;
    if (!requireTokenGuard() || !billId || !order?.id) return;
    const amountRaw = Number(orderBillItemAmount);
    if (!Number.isFinite(amountRaw) || amountRaw < 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a valid amount." });
      return;
    }
    setOrderBillItemSaving(true);
    try {
      await fetchJson(`${API.billing}/${billId}/items`, {
        method: "POST",
        token,
        body: {
          items: [
            {
              item_type: "lab_order",
              reference_id: String(order.id),
              amount: amountRaw,
            },
          ],
        },
      });
      Swal.fire({ icon: "success", title: "Item added", timer: 800, showConfirmButton: false });
      setOrderBillItemAmount("");
      setOrderBillItemNote("");
      await loadOrderBilling(order.id);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setOrderBillItemSaving(false);
    }
  };

  const recordOrderPayment = async () => {
    const billId = orderBilling?.bill_id;
    const order = orderView.order;
    if (!requireTokenGuard() || !billId || !order?.id) return;
    const amountRaw = Number(orderPayAmount);
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a positive amount." });
      return;
    }
    setOrderPaySaving(true);
    try {
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: billId,
          amount_paid: amountRaw,
          payment_method: orderPayMethod || "cash",
          payment_date: new Date().toISOString(),
        },
      });
      Swal.fire({ icon: "success", title: "Payment recorded", text: "You can now enter results for this lab order." });
      await loadOrderBilling(order.id);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e?.message });
    } finally {
      setOrderPaySaving(false);
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

  const openLabBillView = async (billId) => {
    if (!billId) return;
    setLabBillView({ open: true, bill: null, loading: true });
    try {
      const data = await fetchJson(`${API.billing}/${billId}`, { token });
      const b = data?.data || null;
      setLabBillView({ open: true, bill: b, loading: false });
      const total = Number(b?.total_amount || 0);
      const paid = Number(b?.paid_amount || 0);
      const balance = Math.max(0, total - paid);
      setLabBillPayAmount(String(balance > 0 ? balance : total));
      setLabBillPayMethod("cash");
    } catch (e) {
      setLabBillView({ open: false, bill: null, loading: false });
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const recordPaymentForLabBill = async () => {
    const b = labBillView.bill;
    if (!b?.id) return;
    const amountRaw = Number(labBillPayAmount);
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a positive amount." });
      return;
    }
    setLabBillPaySaving(true);
    try {
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: b.id,
          amount_paid: amountRaw,
          payment_method: labBillPayMethod || "cash",
          payment_date: new Date().toISOString(),
        },
      });
      await openLabBillView(b.id);
      await loadLabBills();
      Swal.fire({ icon: "success", title: "Paid", text: "Payment recorded." });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e.message });
    } finally {
      setLabBillPaySaving(false);
    }
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
      const orderId = resultDialog.lab_order?.id;
      setResultDialog({
        open: false,
        lab_order_item_id: null,
        lab_order: null,
      });
      await loadOrders();
      await loadResults();
      // Refresh the order in the order view dialog so "Enter result" updates to "Update result"
      if (orderView.open && orderId && orderView.order?.id === orderId) {
        try {
          const res = await fetchJson(`${API.labOrders}/${orderId}`, { token });
          const updatedOrder = res?.data || null;
          if (updatedOrder) setOrderView((prev) => ({ ...prev, order: updatedOrder }));
        } catch {
          // ignore; order list was already refreshed
        }
      }
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
                    if (tab === 3) loadLabBills();
                    if (tab === 4) loadLabPayments();
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
            <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Billing" />
            <Tab icon={<PaymentsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Payment" />
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

          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Bills for lab orders. When you initiate a lab order, a bill is created here. View and record payment below.
              </Typography>
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
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Paid</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Balance</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {labBillsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 4 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading bills…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : labBills.length ? (
                      labBills.map((b, idx) => {
                        const patientName = b?.patient?.full_name || b?.patient?.user?.full_name || "—";
                        const total = Number(b?.total_amount ?? 0);
                        const paidAmt = Number(b?.paid_amount ?? 0);
                        const balance = Math.max(0, total - paidAmt);
                        const status = b?.paid ? "paid" : (b?.status || "unpaid");
                        return (
                          <TableRow key={b.id} hover>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                              {labBillsPage * labBillsRowsPerPage + idx + 1}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{patientName}</TableCell>
                            <TableCell>{total.toFixed(2)}</TableCell>
                            <TableCell>{paidAmt.toFixed(2)}</TableCell>
                            <TableCell>{balance.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={status}
                                color={status === "paid" ? "success" : status === "partial" ? "warning" : "default"}
                              />
                            </TableCell>
                            <TableCell>{formatDateTime(b.createdAt)}</TableCell>
                            <TableCell align="right">
                              <Button size="small" variant="outlined" onClick={() => openLabBillView(b.id)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No lab order bills yet. Initiate a lab order from Consultations or Appointments to create a bill here.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={labBillsTotal}
                page={labBillsPage}
                onPageChange={(_, p) => setLabBillsPage(p)}
                rowsPerPage={labBillsRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setLabBillsRowsPerPage(parseInt(e.target.value, 10));
                  setLabBillsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {tab === 4 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Payments recorded for lab order bills.
              </Typography>
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
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Bill</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 72 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {labPaymentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 4 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading payments…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : labPayments.length ? (
                      labPayments.map((p, idx) => {
                        const patientName = p?.bill?.patient?.full_name || p?.bill?.patient?.user?.full_name || "—";
                        return (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                              {labPaymentsPage * labPaymentsRowsPerPage + idx + 1}
                            </TableCell>
                            <TableCell>{formatDateTime(p.payment_date || p.createdAt)}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{patientName}</TableCell>
                            <TableCell>{Number(p.amount_paid ?? 0).toFixed(2)}</TableCell>
                            <TableCell>{p.payment_method || "—"}</TableCell>
                            <TableCell sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                              {p.bill_id ? `#${String(p.bill_id).slice(0, 8)}` : "—"}
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="View receipt">
                                <IconButton size="small" color="primary" onClick={() => setReceiptDialogPaymentId(p.id)} aria-label="View receipt">
                                  <ReceiptIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No payments for lab orders yet. Record payment from the Billing tab.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={labPaymentsTotal}
                page={labPaymentsPage}
                onPageChange={(_, p) => setLabPaymentsPage(p)}
                rowsPerPage={labPaymentsRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setLabPaymentsRowsPerPage(parseInt(e.target.value, 10));
                  setLabPaymentsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Lab bill view & record payment */}
      <Dialog
        open={labBillView.open}
        onClose={() => setLabBillView({ open: false, bill: null, loading: false })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Lab order bill</DialogTitle>
        <DialogContent dividers>
          {labBillView.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : labBillView.bill ? (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Bill #{labBillView.bill.id?.slice(0, 8)}</Typography>
              <Typography sx={{ fontWeight: 800 }}>
                Patient: {labBillView.bill.patient?.full_name || labBillView.bill.patient?.user?.full_name || "—"}
              </Typography>
              <Typography>
                Total: {Number(labBillView.bill.total_amount ?? 0).toFixed(2)} • Paid: {Number(labBillView.bill.paid_amount ?? 0).toFixed(2)} • Balance: {Number(labBillView.bill.balance ?? 0).toFixed(2)}
              </Typography>
              <Chip
                size="small"
                label={labBillView.bill.paid ? "paid" : (labBillView.bill.status || "unpaid")}
                color={labBillView.bill.paid ? "success" : "default"}
                sx={{ mt: 0.5 }}
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLabBillView({ open: false, bill: null, loading: false })}>Close</Button>
        </DialogActions>
      </Dialog>

      <ReceiptDialog
        open={!!receiptDialogPaymentId}
        onClose={() => setReceiptDialogPaymentId(null)}
        paymentId={receiptDialogPaymentId}
        getToken={getToken}
      />

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
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 900 }}>Billing &amp; payment</Typography>
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
              {orderBilling?.exists ? (
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  Total: {orderBilling.total_amount} • Paid: {orderBilling.paid_amount} • Balance: {orderBilling.balance}
                </Typography>
              ) : (
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  No bill found for this lab order yet (bill is created when the order is initiated).
                </Typography>
              )}
              {!orderBilling?.paid && orderBilling?.exists && orderBilling?.bill_id && (
                <>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }} flexWrap="wrap">
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={orderBillItemAmount}
                      onChange={(e) => setOrderBillItemAmount(e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      placeholder="Add item amount"
                      sx={{ width: { xs: "100%", sm: 120 } }}
                    />
                    <TextField
                      size="small"
                      label="Note (optional)"
                      value={orderBillItemNote}
                      onChange={(e) => setOrderBillItemNote(e.target.value)}
                      placeholder="e.g. extra test"
                      sx={{ flex: { xs: "none", sm: "1 1 140px" }, minWidth: 0 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={addOrderBillItem}
                      disabled={orderBillItemSaving}
                      sx={{ fontWeight: 800 }}
                    >
                      {orderBillItemSaving ? "Adding…" : "Add billing item"}
                    </Button>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Record payment</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap">
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={orderPayAmount || (orderBilling?.balance ?? "")}
                      onChange={(e) => setOrderPayAmount(e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ width: { xs: "100%", sm: 120 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
                      <InputLabel>Payment method</InputLabel>
                      <Select
                        value={orderPayMethod}
                        label="Payment method"
                        onChange={(e) => setOrderPayMethod(e.target.value)}
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="card">Card</MenuItem>
                        <MenuItem value="mobile">Mobile</MenuItem>
                        <MenuItem value="insurance">Insurance</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      onClick={recordOrderPayment}
                      disabled={orderPaySaving}
                      sx={{ fontWeight: 800 }}
                    >
                      {orderPaySaving ? "Recording…" : "Record payment"}
                    </Button>
                  </Stack>
                </>
              )}
              {!orderBilling?.paid && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  Lab order completion and entering results are blocked until payment is recorded.
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
