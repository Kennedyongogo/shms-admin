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
  FormControl,
  IconButton,
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
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  LocalPharmacy as LocalPharmacyIcon,
  ReceiptLong as ReceiptLongIcon,
  Inventory as InventoryIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  EventNote as EventNoteIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";
import ReceiptDialog from "./ReceiptDialog";

const API = {
  medications: "/api/medications",
  prescriptions: "/api/prescriptions",
  dispense: "/api/dispense",
  billing: "/api/billing",
  payments: "/api/payments",
  inventory: "/api/inventory",
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

  const [tab, setTab] = useState(0); // 0 meds, 1 prescriptions, 2 dispense, 3 billing, 4 payment
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
    mode: "edit",
    id: null,
  });
  const [medForm, setMedForm] = useState({
    name: "",
    dosage_form: "",
    manufacturer: "",
    unit_price: "",
    inventory_item_id: "",
  });
  const [medView, setMedView] = useState({ open: false, med: null });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryItemsLoading, setInventoryItemsLoading] = useState(false);

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
  const [presBillItemAmount, setPresBillItemAmount] = useState("");
  const [presBillItemNote, setPresBillItemNote] = useState("");
  const [presBillItemSaving, setPresBillItemSaving] = useState(false);
  const [presPayAmount, setPresPayAmount] = useState("");
  const [presPayMethod, setPresPayMethod] = useState("cash");
  const [presPaySaving, setPresPaySaving] = useState(false);

  // Pharmacy Billing tab (bills with item_type=prescription only)
  const [pharmBills, setPharmBills] = useState([]);
  const [pharmBillsLoading, setPharmBillsLoading] = useState(false);
  const [pharmBillsPage, setPharmBillsPage] = useState(0);
  const [pharmBillsRowsPerPage, setPharmBillsRowsPerPage] = useState(10);
  const [pharmBillsTotal, setPharmBillsTotal] = useState(0);
  const [pharmBillView, setPharmBillView] = useState({ open: false, bill: null, loading: false });
  const [pharmBillPayAmount, setPharmBillPayAmount] = useState("");
  const [pharmBillPayMethod, setPharmBillPayMethod] = useState("cash");
  const [pharmBillPaySaving, setPharmBillPaySaving] = useState(false);

  // Pharmacy Payment tab (payments for prescription bills only)
  const [pharmPayments, setPharmPayments] = useState([]);
  const [pharmPaymentsLoading, setPharmPaymentsLoading] = useState(false);
  const [pharmPaymentsPage, setPharmPaymentsPage] = useState(0);
  const [pharmPaymentsRowsPerPage, setPharmPaymentsRowsPerPage] = useState(10);
  const [pharmPaymentsTotal, setPharmPaymentsTotal] = useState(0);
  const [receiptDialogPaymentId, setReceiptDialogPaymentId] = useState(null);

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

  // Load only the active tab's data to avoid multiple loading flashes on mount
  useEffect(() => {
    if (tab === 0) loadMedications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, medsPage, medsRowsPerPage]);
  useEffect(() => {
    if (tab === 1) loadPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, presPage, presRowsPerPage]);
  useEffect(() => {
    if (tab === 2) loadDispenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dispPage, dispRowsPerPage]);
  useEffect(() => {
    if (tab === 3) loadPharmBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pharmBillsPage, pharmBillsRowsPerPage]);
  useEffect(() => {
    if (tab === 4) loadPharmPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pharmPaymentsPage, pharmPaymentsRowsPerPage]);

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
  const loadInventoryItems = async () => {
    if (!requireTokenGuard()) return;
    setInventoryItemsLoading(true);
    try {
      const data = await fetchJson(`${API.inventory}?limit=500`, { token });
      setInventoryItems(data.data || []);
    } catch {
      setInventoryItems([]);
    } finally {
      setInventoryItemsLoading(false);
    }
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
      inventory_item_id: m.inventory_item_id || "",
    });
    setMedDialog({ open: true, mode: "edit", id: m.id });
    if (inventoryItems.length === 0) loadInventoryItems();
  };
  const openViewMed = (m) => setMedView({ open: true, med: m });

  const saveMed = async () => {
    if (!requireTokenGuard() || !medDialog.id) return;
    if (!medForm.name.trim())
      return showToast("error", "Medication name is required");
    const payload = {
      name: medForm.name.trim(),
      dosage_form: medForm.dosage_form.trim() || null,
      manufacturer: medForm.manufacturer.trim() || null,
      unit_price: medForm.unit_price === "" ? null : medForm.unit_price,
      inventory_item_id: medForm.inventory_item_id || null,
    };
    try {
      await fetchJson(`${API.medications}/${medDialog.id}`, {
        method: "PUT",
        token,
        body: payload,
      });
      showToast("success", "Medication updated");
      setMedDialog({ open: false, mode: "edit", id: null });
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
    setPresBillItemAmount("");
    setPresBillItemNote("");
    setPresPayAmount("");
    try {
      const data = await fetchJson(`${API.prescriptions}/${p.id}`, { token });
      const prescription = data.data;
      setPresView({ open: true, prescription, loading: false });
      if (prescription?.id) loadPrescriptionBilling(prescription.id);
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
      const billing = data?.data || null;
      setPresBilling(billing);
      if (billing?.balance != null) setPresPayAmount(String(billing.balance));
      if (billing?.exists) {
        setPresBillItemAmount("");
        setPresBillItemNote("");
      }
    } catch {
      setPresBilling(null);
    } finally {
      setPresBillingLoading(false);
    }
  };

  const openBillingForPrescription = (prescription) => {
    if (!prescription?.id) return;
    setTab(3);
    loadPharmBills();
  };

  const loadPharmBills = async () => {
    if (!requireTokenGuard()) return;
    setPharmBillsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(pharmBillsPage + 1),
        limit: String(pharmBillsRowsPerPage),
        item_type: "prescription",
      });
      const data = await fetchJson(`${API.billing}?${qs.toString()}`, { token });
      setPharmBills(data.data || []);
      setPharmBillsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      showToast("error", e.message);
      setPharmBills([]);
    } finally {
      setPharmBillsLoading(false);
    }
  };

  const loadPharmPayments = async () => {
    if (!requireTokenGuard()) return;
    setPharmPaymentsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(pharmPaymentsPage + 1),
        limit: String(pharmPaymentsRowsPerPage),
        for_prescription: "1",
      });
      const data = await fetchJson(`${API.payments}?${qs.toString()}`, { token });
      setPharmPayments(data.data || []);
      setPharmPaymentsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      showToast("error", e.message);
      setPharmPayments([]);
    } finally {
      setPharmPaymentsLoading(false);
    }
  };

  const openPharmBillView = async (billId) => {
    if (!billId) return;
    setPharmBillView({ open: true, bill: null, loading: true });
    try {
      const data = await fetchJson(`${API.billing}/${billId}`, { token });
      const b = data?.data || null;
      setPharmBillView({ open: true, bill: b, loading: false });
      const total = Number(b?.total_amount || 0);
      const paid = Number(b?.paid_amount || 0);
      const balance = Math.max(0, total - paid);
      setPharmBillPayAmount(String(balance > 0 ? balance : total));
      setPharmBillPayMethod("cash");
    } catch (e) {
      setPharmBillView({ open: false, bill: null, loading: false });
      showToast("error", e.message);
    }
  };

  const recordPaymentForPharmBill = async () => {
    const b = pharmBillView.bill;
    if (!b?.id) return;
    const amountRaw = Number(pharmBillPayAmount);
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a positive amount." });
      return;
    }
    setPharmBillPaySaving(true);
    try {
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: b.id,
          amount_paid: amountRaw,
          payment_method: pharmBillPayMethod || "cash",
          payment_date: new Date().toISOString(),
        },
      });
      await openPharmBillView(b.id);
      await loadPharmBills();
      showToast("success", "Payment recorded.");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e.message });
    } finally {
      setPharmBillPaySaving(false);
    }
  };

  const createBillForPrescription = async () => {
    const prescription = presView.prescription;
    if (!requireTokenGuard() || !prescription?.id || !prescription?.patient_id) return;
    const computed = (prescription?.items || []).reduce(
      (sum, it) => sum + (Number(it?.medication?.unit_price || 0) * (it?.quantity ?? 1)),
      0,
    );
    const amount = Number(presBillItemAmount) || computed || 0;
    if (amount <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a positive amount or ensure prescription has medications with prices." });
      return;
    }
    setPresBillItemSaving(true);
    try {
      const billRes = await fetchJson(`${API.billing}/generate`, {
        method: "POST",
        token,
        body: { patient_id: prescription.patient_id },
      });
      const billId = billRes?.data?.id;
      if (!billId) throw new Error("Could not create bill.");
      await fetchJson(`${API.billing}/${billId}/items`, {
        method: "POST",
        token,
        body: { items: [{ item_type: "prescription", reference_id: String(prescription.id), amount }] },
      });
      await loadPrescriptionBilling(prescription.id);
      setPresBillItemAmount("");
      showToast("success", "Bill created. You can add more items and record payment below.");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setPresBillItemSaving(false);
    }
  };

  const addPrescriptionBillItem = async () => {
    const prescription = presView.prescription;
    if (!requireTokenGuard() || !presBilling?.bill_id) return;
    const amount = Number(presBillItemAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a valid amount." });
      return;
    }
    setPresBillItemSaving(true);
    try {
      await fetchJson(`${API.billing}/${presBilling.bill_id}/items`, {
        method: "POST",
        token,
        body: {
          items: [
            { item_type: "service", reference_id: (presBillItemNote || "").trim() || null, amount },
          ],
        },
      });
      await loadPrescriptionBilling(prescription?.id);
      setPresBillItemAmount("");
      setPresBillItemNote("");
      showToast("success", "Bill item added.");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setPresBillItemSaving(false);
    }
  };

  const payForPrescription = async () => {
    if (!requireTokenGuard() || !presView.prescription?.id) return false;
    if (!presBilling?.bill_id) {
      Swal.fire({ icon: "warning", title: "No bill", text: "Create a bill first, then record payment." });
      return false;
    }
    const defaultAmount = String(presBilling?.balance ?? presBilling?.total_amount ?? "0");
    const ask = await Swal.fire({
      icon: "question",
      title: "Record payment",
      html: `
        <label for="swal-amount" style="display:block; text-align:left; margin-bottom:4px;">Amount to pay</label>
        <input id="swal-amount" class="swal2-input" type="number" min="0" step="0.01" value="${defaultAmount}" style="margin-bottom:12px" />
        <label for="swal-method" style="display:block; text-align:left; margin-bottom:4px;">Payment method</label>
        <select id="swal-method" class="swal2-input" style="width:100%; margin:0; box-sizing:border-box;">
          <option value="cash">Cash</option>
          <option value="mpesa">M-Pesa</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="other">Other</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Record payment",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      preConfirm: () => {
        const raw = document.getElementById("swal-amount")?.value;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          Swal.showValidationMessage("Enter a valid amount");
          return undefined;
        }
        const method = document.getElementById("swal-method")?.value || "cash";
        return { amount: n, payment_method: method };
      },
    });
    if (!ask.isConfirmed || !ask.value) return false;
    const { amount, payment_method } = ask.value;
    try {
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: presBilling.bill_id,
          amount_paid: amount,
          payment_method: payment_method || "cash",
          payment_date: new Date().toISOString(),
        },
      });
      await loadPrescriptionBilling(presView.prescription.id);
      Swal.fire({ icon: "success", title: "Payment recorded", text: "You can dispense once the bill is fully paid." });
      return true;
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e?.message ?? "Something went wrong." });
      return false;
    }
  };

  const recordPrescriptionPayment = async () => {
    const prescription = presView.prescription;
    if (!requireTokenGuard() || !presBilling?.bill_id || !prescription?.id) return;
    const amountRaw = Number(presPayAmount);
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a positive amount." });
      return;
    }
    setPresPaySaving(true);
    try {
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: presBilling.bill_id,
          amount_paid: amountRaw,
          payment_method: presPayMethod || "cash",
          payment_date: new Date().toISOString(),
        },
      });
      Swal.fire({ icon: "success", title: "Payment recorded", text: "You can dispense once the bill is fully paid." });
      await loadPrescriptionBilling(prescription.id);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e?.message ?? "Something went wrong." });
    } finally {
      setPresPaySaving(false);
    }
  };

  const deletePrescription = async (prescription) => {
    if (!requireTokenGuard() || !prescription?.id) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete prescription?",
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d32f2f",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.prescriptions}/${prescription.id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      setPresView({ open: false, prescription: null, loading: false });
      await loadPrescriptions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message ?? "Delete not supported or failed." });
    }
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
      const updated = await fetchJson(`${API.prescriptions}/${prescription.id}`, { token });
      setPresView((prev) => ({ ...prev, prescription: updated?.data ?? prev.prescription }));
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
      if (e?.data?.insufficient?.length) {
        const msg = e.data.insufficient.map((x) => `${x.medication}: need ${x.required}, available ${x.available}`).join("; ");
        showToast("error", `Insufficient stock: ${msg}`);
      } else if (e?.data?.notLinked?.length) {
        showToast("error", "Some medications are not linked to inventory. Link them in Medicine Catalogue first.");
      } else {
        showToast("error", e.message);
      }
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
                    if (tab === 3) loadPharmBills();
                    if (tab === 4) loadPharmPayments();
                  }}
                  sx={{
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
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
            <Tab
              icon={<ReceiptIcon />}
              iconPosition="start"
              label="Billing"
            />
            <Tab
              icon={<PaymentIcon />}
              iconPosition="start"
              label="Payment"
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
                      <TableCell sx={{ fontWeight: 800 }}>Stock link</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>In pharmacy</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {medsLoading ? (
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
                          <TableCell>
                            {m.inventory_item_id ? (
                              <Chip size="small" label="Linked" color="success" variant="outlined" />
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {m.inventory_item_id && m.inventoryItem != null
                              ? (m.inventoryItem.quantity_in_pharmacy ?? 0)
                              : "—"}
                          </TableCell>
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
                        <TableCell colSpan={8}>
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
                          <TableCell>
                            {p.patient?.full_name || p.patient?.user?.full_name || p.patient_id || "—"}
                          </TableCell>
                          <TableCell>
                            {p.doctor?.user?.full_name || p.doctor?.staff_type || p.consultation?.appointment?.doctor?.user?.full_name || p.consultation?.appointment?.doctor?.staff_type || p.doctor_id || "—"}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                            {p.consultation_id ? String(p.consultation_id).slice(0, 8) + "…" : "—"}
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
                            {r.pharmacist?.user?.full_name || r.pharmacist?.staff_type || "—"}
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

          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Bills for prescriptions (pharmacy) only.
              </Typography>
              <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
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
                    {pharmBillsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 4 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading bills…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : pharmBills.length ? (
                      pharmBills.map((b, idx) => {
                        const patientName = b?.patient?.full_name || b?.patient?.user?.full_name || "—";
                        const total = Number(b?.total_amount ?? 0);
                        const paidAmt = Number(b?.paid_amount ?? 0);
                        const balance = Math.max(0, total - paidAmt);
                        const status = b?.paid ? "paid" : (b?.status || "unpaid");
                        return (
                          <TableRow key={b.id} hover>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                              {pharmBillsPage * pharmBillsRowsPerPage + idx + 1}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{patientName}</TableCell>
                            <TableCell>{total.toFixed(2)}</TableCell>
                            <TableCell>{paidAmt.toFixed(2)}</TableCell>
                            <TableCell>{balance.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip size="small" label={status} color={status === "paid" ? "success" : status === "partial" ? "warning" : "default"} />
                            </TableCell>
                            <TableCell>{formatDateTime(b.createdAt)}</TableCell>
                            <TableCell align="right">
                              <Button size="small" variant="outlined" onClick={() => openPharmBillView(b.id)}>View</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography sx={{ py: 2 }} color="text.secondary">No prescription bills yet.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={pharmBillsTotal}
                page={pharmBillsPage}
                onPageChange={(_, p) => setPharmBillsPage(p)}
                rowsPerPage={pharmBillsRowsPerPage}
                onRowsPerPageChange={(e) => { setPharmBillsRowsPerPage(parseInt(e.target.value, 10)); setPharmBillsPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {tab === 4 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Payments recorded for prescription (pharmacy) bills.
              </Typography>
              <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
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
                    {pharmPaymentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 4 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading payments…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : pharmPayments.length ? (
                      pharmPayments.map((p, idx) => {
                        const patientName = p?.bill?.patient?.full_name || p?.bill?.patient?.user?.full_name || "—";
                        return (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                              {pharmPaymentsPage * pharmPaymentsRowsPerPage + idx + 1}
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
                          <Typography sx={{ py: 2 }} color="text.secondary">No payments for prescriptions yet. Record payment from the Billing tab or in View prescription.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={pharmPaymentsTotal}
                page={pharmPaymentsPage}
                onPageChange={(_, p) => setPharmPaymentsPage(p)}
                rowsPerPage={pharmPaymentsRowsPerPage}
                onRowsPerPageChange={(e) => { setPharmPaymentsRowsPerPage(parseInt(e.target.value, 10)); setPharmPaymentsPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Pharmacy bill view & record payment */}
      <Dialog
        open={pharmBillView.open}
        onClose={() => setPharmBillView({ open: false, bill: null, loading: false })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Prescription bill</DialogTitle>
        <DialogContent dividers>
          {pharmBillView.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : pharmBillView.bill ? (
            <Stack spacing={2}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Bill #{pharmBillView.bill.id?.slice(0, 8)}</Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  Patient: {pharmBillView.bill.patient?.full_name || pharmBillView.bill.patient?.user?.full_name || "—"}
                </Typography>
                <Typography>
                  Total: {Number(pharmBillView.bill.total_amount ?? 0).toFixed(2)} • Paid: {Number(pharmBillView.bill.paid_amount ?? 0).toFixed(2)} • Balance: {Number(pharmBillView.bill.balance ?? 0).toFixed(2)}
                </Typography>
                <Chip
                  size="small"
                  label={pharmBillView.bill.paid ? "paid" : (pharmBillView.bill.status || "unpaid")}
                  color={pharmBillView.bill.paid ? "success" : "default"}
                  sx={{ mt: 0.5 }}
                />
              </Box>
              {Number(pharmBillView.bill.balance ?? 0) > 0 && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                  <TextField
                    size="small"
                    label="Amount"
                    type="number"
                    value={pharmBillPayAmount}
                    onChange={(e) => setPharmBillPayAmount(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ width: { xs: "100%", sm: 130 } }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Method</InputLabel>
                    <Select value={pharmBillPayMethod} label="Method" onChange={(e) => setPharmBillPayMethod(e.target.value)}>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="mobile">Mobile</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="contained" onClick={recordPaymentForPharmBill} disabled={pharmBillPaySaving} sx={{ fontWeight: 800 }}>
                    {pharmBillPaySaving ? "Recording…" : "Record payment"}
                  </Button>
                </Stack>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPharmBillView({ open: false, bill: null, loading: false })}>Close</Button>
        </DialogActions>
      </Dialog>

      <ReceiptDialog
        open={!!receiptDialogPaymentId}
        onClose={() => setReceiptDialogPaymentId(null)}
        paymentId={receiptDialogPaymentId}
        getToken={getToken}
      />

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
            {medView.med?.inventory_item_id != null && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="overline" color="text.secondary">
                  Linked stock (inventory)
                </Typography>
                <Typography>
                  {medView.med?.inventoryItem
                    ? medView.med.inventoryItem.name
                    : "Linked (ID: " + String(medView.med.inventory_item_id).slice(0, 8) + "…)"}
                </Typography>
                {medView.med?.inventoryItem && (
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <Typography><strong>In pharmacy:</strong> {medView.med.inventoryItem.quantity_in_pharmacy ?? 0} {medView.med.inventoryItem.unit || "units"}</Typography>
                    <Typography color="text.secondary"><strong>Main store:</strong> {medView.med.inventoryItem.quantity_available ?? 0}</Typography>
                  </Stack>
                )}
              </>
            )}
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
        onClose={() => setMedDialog({ open: false, mode: "edit", id: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Medication</DialogTitle>
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
            <FormControl fullWidth size="small">
              <InputLabel>Link to stock (inventory)</InputLabel>
              <Select
                label="Link to stock (inventory)"
                value={medForm.inventory_item_id || ""}
                onChange={(e) =>
                  setMedForm((p) => ({ ...p, inventory_item_id: e.target.value || "" }))
                }
              >
                <MenuItem value="">None</MenuItem>
                {inventoryItemsLoading ? (
                  <MenuItem disabled>Loading…</MenuItem>
                ) : (
                  inventoryItems.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>
                      {inv.name}
                      {inv.unit ? ` (${inv.unit})` : ""}
                      {inv.pack_size ? ` · ${inv.pack_size} per pack` : ""}
                      {inv.category ? ` · ${inv.category}` : ""}
                      {" — "}
                      {inv.quantity_available ?? 0} available
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setMedDialog({ open: false, mode: "edit", id: null })
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

      {/* Prescription view – same layout as Lab Order dialog */}
      <Dialog
        open={presView.open}
        onClose={() =>
          setPresView({ open: false, prescription: null, loading: false })
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Prescription</DialogTitle>
        <DialogContent dividers>
          {presView.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading prescription…</Typography>
            </Stack>
          ) : !presView.prescription ? (
            <Typography color="text.secondary">No data.</Typography>
          ) : (
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 900 }}>
                Patient:{" "}
                {presView.prescription?.patient?.full_name ||
                  presView.prescription?.patient?.user?.full_name ||
                  "—"}
              </Typography>
              <Typography color="text.secondary">
                Created: {formatDateTime(presView.prescription?.createdAt ?? presView.prescription?.prescription_date)}
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
                {presBilling?.exists ? (
                  <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                    Total: {presBilling.total_amount} • Paid: {presBilling.paid_amount} • Balance: {presBilling.balance}
                  </Typography>
                ) : (
                  <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                    No bill for this prescription yet. Create one to add items and record payment.
                  </Typography>
                )}
                {!presBilling?.exists && (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }} flexWrap="wrap">
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={presBillItemAmount}
                      onChange={(e) => setPresBillItemAmount(e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      placeholder={
                        (presView.prescription?.items || []).length
                          ? String((presView.prescription.items || []).reduce((s, it) => s + (Number(it?.medication?.unit_price || 0) * (it?.quantity ?? 1)), 0))
                          : undefined
                      }
                      sx={{ width: { xs: "100%", sm: 120 } }}
                    />
                    <Button
                      variant="outlined"
                      onClick={createBillForPrescription}
                      disabled={presBillItemSaving}
                      sx={{ fontWeight: 800 }}
                    >
                      {presBillItemSaving ? "Creating…" : "Create bill"}
                    </Button>
                  </Stack>
                )}
                {!presBilling?.paid && presBilling?.exists && presBilling?.bill_id && (
                  <>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }} flexWrap="wrap">
                      <TextField
                        size="small"
                        label="Amount"
                        type="number"
                        value={presBillItemAmount}
                        onChange={(e) => setPresBillItemAmount(e.target.value)}
                        inputProps={{ min: 0, step: 0.01 }}
                        placeholder="Add item amount"
                        sx={{ width: { xs: "100%", sm: 120 } }}
                      />
                      <TextField
                        size="small"
                        label="Note (optional)"
                        value={presBillItemNote}
                        onChange={(e) => setPresBillItemNote(e.target.value)}
                        placeholder="e.g. extra service"
                        sx={{ flex: { xs: "none", sm: "1 1 140px" }, minWidth: 0 }}
                      />
                      <Button
                        variant="outlined"
                        onClick={addPrescriptionBillItem}
                        disabled={presBillItemSaving}
                        sx={{ fontWeight: 800 }}
                      >
                        {presBillItemSaving ? "Adding…" : "Add billing item"}
                      </Button>
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Record payment</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap">
                      <TextField
                        size="small"
                        label="Amount"
                        type="number"
                        value={presPayAmount || (presBilling?.balance ?? "")}
                        onChange={(e) => setPresPayAmount(e.target.value)}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: { xs: "100%", sm: 120 } }}
                      />
                      <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
                        <InputLabel>Payment method</InputLabel>
                        <Select
                          value={presPayMethod}
                          label="Payment method"
                          onChange={(e) => setPresPayMethod(e.target.value)}
                        >
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="card">Card</MenuItem>
                          <MenuItem value="mobile">Mobile</MenuItem>
                          <MenuItem value="mpesa">M-Pesa</MenuItem>
                          <MenuItem value="insurance">Insurance</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        onClick={recordPrescriptionPayment}
                        disabled={presPaySaving}
                        sx={{ fontWeight: 800 }}
                      >
                        {presPaySaving ? "Recording…" : "Record payment"}
                      </Button>
                    </Stack>
                  </>
                )}
                {!presBilling?.paid && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    Prescription dispensing is blocked until payment is recorded.
                  </Alert>
                )}
              </Box>

              <Divider />
              <Typography sx={{ fontWeight: 900 }}>Medications</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Medication</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Dosage</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Frequency</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(presView.prescription?.items || []).map((it, idx) => (
                    <TableRow key={it.id} hover>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{idx + 1}</TableCell>
                      <TableCell>{it.medication?.name || it.medication_id || "—"}</TableCell>
                      <TableCell>{it.quantity ?? 1}</TableCell>
                      <TableCell>{it.dosage || "—"}</TableCell>
                      <TableCell>{it.frequency || "—"}</TableCell>
                      <TableCell>{it.duration || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!(presView.prescription?.items || []).length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary">
                          No medications on this prescription.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() =>
              setPresView({ open: false, prescription: null, loading: false })
            }
          >
            Close
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => deletePrescription(presView.prescription)}
            disabled={!presView.prescription?.id}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            onClick={dispensePrescription}
            disabled={
              presView.loading ||
              presDispensing ||
              !presView.prescription?.id ||
              (presView.prescription?.dispenseRecords?.length > 0)
            }
            sx={{ fontWeight: 900 }}
          >
            {presDispensing ? "Dispensing…" : (presView.prescription?.dispenseRecords?.length > 0 ? "Dispensed" : "Dispense")}
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
            {dispView.record?.prescription ? (
              <Stack spacing={0.5}>
                <Typography sx={{ fontWeight: 700 }}>
                  Patient: {dispView.record.prescription.patient?.full_name || dispView.record.prescription.patient?.user?.full_name || "—"}
                </Typography>
                {dispView.record.prescription.prescription_date && (
                  <Typography variant="body2" color="text.secondary">
                    Prescription date: {formatDateTime(dispView.record.prescription.prescription_date)}
                  </Typography>
                )}
                {Array.isArray(dispView.record.prescription.items) && dispView.record.prescription.items.length > 0 && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Medications: {dispView.record.prescription.items.map((it) => `${it.medication?.name || "—"} × ${it.quantity ?? 1}`).join("; ")}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                {dispView.record?.prescription_id?.slice(0, 8)}…
              </Typography>
            )}
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Pharmacist
            </Typography>
            <Typography>
              {dispView.record?.pharmacist?.user?.full_name || dispView.record?.pharmacist?.staff_type || "—"}
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
