import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Hotel as WardIcon,
  SingleBed as BedIcon,
  PersonSearch as AdmissionIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Logout as DischargeIcon,
  NoteAdd as NoteAddIcon,
  Payments as PaymentsIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as ReceiptLongIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";
import ReceiptDialog from "./ReceiptDialog";

const API = {
  wards: "/api/wards",
  beds: "/api/beds",
  admissions: "/api/admissions",
  nursingNotes: "/api/nursing-notes",
  billing: "/api/billing",
  payments: "/api/payments",
  departments: "/api/departments",
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

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function patientLabel(p) {
  if (!p) return "—";
  return p.full_name || p.user?.full_name || p.email || p.phone || p.id?.slice(0, 8) || "—";
}

export default function WardManagement() {
  const theme = useTheme();
  const token = getToken();
  const isAdmin = getRoleName() === "admin";

  const [tab, setTab] = useState(0);

  // Wards
  const wardsReqId = useRef(0);
  const [wards, setWards] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardsPage, setWardsPage] = useState(0);
  const [wardsRowsPerPage, setWardsRowsPerPage] = useState(10);
  const [wardsTotal, setWardsTotal] = useState(0);
  const [wardsSearch, setWardsSearch] = useState("");
  const [wardDialog, setWardDialog] = useState({ open: false, mode: "create", id: null });
  const [wardForm, setWardForm] = useState({ department_id: "", name: "", type: "", daily_rate: "" });
  const [wardSaving, setWardSaving] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // Beds
  const bedsReqId = useRef(0);
  const [beds, setBeds] = useState([]);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [bedsPage, setBedsPage] = useState(0);
  const [bedsRowsPerPage, setBedsRowsPerPage] = useState(10);
  const [bedsTotal, setBedsTotal] = useState(0);
  const [bedsSearch, setBedsSearch] = useState("");
  const [bedDialog, setBedDialog] = useState({ open: false, mode: "create", id: null });
  const [bedForm, setBedForm] = useState({ ward_id: "", bed_number: "", status: "available" });
  const [bedSaving, setBedSaving] = useState(false);
  const [wardOptions, setWardOptions] = useState([]);

  // Admissions
  const admReqId = useRef(0);
  const [admissions, setAdmissions] = useState([]);
  const [admissionsLoading, setAdmissionsLoading] = useState(false);
  const [admissionsPage, setAdmissionsPage] = useState(0);
  const [admissionsRowsPerPage, setAdmissionsRowsPerPage] = useState(10);
  const [admissionsTotal, setAdmissionsTotal] = useState(0);
  const [admissionsStatusFilter, setAdmissionsStatusFilter] = useState("");
  const [admissionView, setAdmissionView] = useState({ open: false, loading: false, admission: null, billing: null });
  const [receiptDialogPaymentId, setReceiptDialogPaymentId] = useState(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    temperature: "",
    blood_pressure: "",
    pulse: "",
    respiratory_rate: "",
    pain_scale: "",
    notes: "",
    date_time: "",
  });
  const [noteSaving, setNoteSaving] = useState(false);
  const [admissionPayAmount, setAdmissionPayAmount] = useState("");
  const [admissionPayMethod, setAdmissionPayMethod] = useState("cash");
  const [admissionPaySaving, setAdmissionPaySaving] = useState(false);

  // Admission billing tab (bills for admissions only)
  const admissionBillsReqId = useRef(0);
  const [admissionBills, setAdmissionBills] = useState([]);
  const [admissionBillsLoading, setAdmissionBillsLoading] = useState(false);
  const [admissionBillsPage, setAdmissionBillsPage] = useState(0);
  const [admissionBillsRowsPerPage, setAdmissionBillsRowsPerPage] = useState(10);
  const [admissionBillsTotal, setAdmissionBillsTotal] = useState(0);
  const [admissionBillView, setAdmissionBillView] = useState({ open: false, bill: null, loading: false });

  // Admission payments tab (payments for admission bills only)
  const admissionPaymentsReqId = useRef(0);
  const [admissionPayments, setAdmissionPayments] = useState([]);
  const [admissionPaymentsLoading, setAdmissionPaymentsLoading] = useState(false);
  const [admissionPaymentsPage, setAdmissionPaymentsPage] = useState(0);
  const [admissionPaymentsRowsPerPage, setAdmissionPaymentsRowsPerPage] = useState(10);
  const [admissionPaymentsTotal, setAdmissionPaymentsTotal] = useState(0);

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const loadDepartments = async () => {
    try {
      const data = await fetchJson(`${API.departments}?limit=500`, { token });
      setDepartmentOptions(data?.data || []);
    } catch {
      setDepartmentOptions([]);
    }
  };

  const loadWards = async () => {
    const reqId = ++wardsReqId.current;
    setWardsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(wardsPage + 1),
        limit: String(wardsRowsPerPage),
        ...(wardsSearch.trim() ? { search: wardsSearch.trim() } : {}),
      });
      const data = await fetchJson(`${API.wards}?${qs.toString()}`, { token });
      if (reqId !== wardsReqId.current) return;
      setWards(data?.data || []);
      setWardsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== wardsReqId.current) return;
      setWards([]);
      setWardsTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load wards" });
    } finally {
      if (reqId === wardsReqId.current) setWardsLoading(false);
    }
  };

  const loadWardOptions = async () => {
    try {
      const data = await fetchJson(`${API.wards}?limit=500`, { token });
      setWardOptions(data?.data || []);
    } catch {
      setWardOptions([]);
    }
  };

  const loadBeds = async () => {
    const reqId = ++bedsReqId.current;
    setBedsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(bedsPage + 1),
        limit: String(bedsRowsPerPage),
        ...(bedsSearch.trim() ? { search: bedsSearch.trim() } : {}),
      });
      const data = await fetchJson(`${API.beds}?${qs.toString()}`, { token });
      if (reqId !== bedsReqId.current) return;
      setBeds(data?.data || []);
      setBedsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== bedsReqId.current) return;
      setBeds([]);
      setBedsTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load beds" });
    } finally {
      if (reqId === bedsReqId.current) setBedsLoading(false);
    }
  };

  const loadAdmissions = async () => {
    const reqId = ++admReqId.current;
    setAdmissionsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(admissionsPage + 1),
        limit: String(admissionsRowsPerPage),
        ...(admissionsStatusFilter ? { status: admissionsStatusFilter } : {}),
      });
      const data = await fetchJson(`${API.admissions}?${qs.toString()}`, { token });
      if (reqId !== admReqId.current) return;
      setAdmissions(data?.data || []);
      setAdmissionsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== admReqId.current) return;
      setAdmissions([]);
      setAdmissionsTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load admissions" });
    } finally {
      if (reqId === admReqId.current) setAdmissionsLoading(false);
    }
  };

  const loadAdmissionBills = async () => {
    const reqId = ++admissionBillsReqId.current;
    setAdmissionBillsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(admissionBillsPage + 1),
        limit: String(admissionBillsRowsPerPage),
        item_type: "admission",
      });
      const data = await fetchJson(`${API.billing}?${qs.toString()}`, { token });
      if (reqId !== admissionBillsReqId.current) return;
      setAdmissionBills(data?.data || []);
      setAdmissionBillsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== admissionBillsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
      setAdmissionBills([]);
    } finally {
      if (reqId === admissionBillsReqId.current) setAdmissionBillsLoading(false);
    }
  };

  const loadAdmissionPayments = async () => {
    const reqId = ++admissionPaymentsReqId.current;
    setAdmissionPaymentsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(admissionPaymentsPage + 1),
        limit: String(admissionPaymentsRowsPerPage),
        for_admission: "1",
      });
      const data = await fetchJson(`${API.payments}?${qs.toString()}`, { token });
      if (reqId !== admissionPaymentsReqId.current) return;
      setAdmissionPayments(data?.data || []);
      setAdmissionPaymentsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== admissionPaymentsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
      setAdmissionPayments([]);
    } finally {
      if (reqId === admissionPaymentsReqId.current) setAdmissionPaymentsLoading(false);
    }
  };

  const openAdmissionBillView = async (billId) => {
    setAdmissionBillView({ open: true, bill: null, loading: true });
    try {
      const data = await fetchJson(`${API.billing}/${billId}`, { token });
      setAdmissionBillView({ open: true, bill: data?.data || null, loading: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
      setAdmissionBillView({ open: false, bill: null, loading: false });
    }
  };

  // Skip first run of debounced search so tab-gated effect does the initial load only (avoids double blink)
  const wardsSearchDebounceSkipped = useRef(true);
  const bedsSearchDebounceSkipped = useRef(true);

  useEffect(() => {
    if (tab === 0) {
      loadDepartments();
      loadWards();
    }
  }, [tab, wardsPage, wardsRowsPerPage, wardsSearch]);

  useEffect(() => {
    if (tab === 1) {
      loadWardOptions();
      loadBeds();
    }
  }, [tab, bedsPage, bedsRowsPerPage, bedsSearch]);

  useEffect(() => {
    if (tab === 2) {
      loadAdmissions();
    }
  }, [tab, admissionsPage, admissionsRowsPerPage, admissionsStatusFilter]);

  useEffect(() => {
    if (tab === 3) loadAdmissionBills();
  }, [tab, admissionBillsPage, admissionBillsRowsPerPage]);

  useEffect(() => {
    if (tab === 4) loadAdmissionPayments();
  }, [tab, admissionPaymentsPage, admissionPaymentsRowsPerPage]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 0) return;
      if (wardsSearchDebounceSkipped.current) {
        wardsSearchDebounceSkipped.current = false;
        return;
      }
      if (wardsSearch.trim() !== undefined) loadWards();
    }, 400);
    return () => clearTimeout(t);
  }, [wardsSearch, tab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 1) return;
      if (bedsSearchDebounceSkipped.current) {
        bedsSearchDebounceSkipped.current = false;
        return;
      }
      loadBeds();
    }, 400);
    return () => clearTimeout(t);
  }, [bedsSearch, tab]);

  const openWardCreate = () => {
    setWardForm({ department_id: "", name: "", type: "", daily_rate: "" });
    setWardDialog({ open: true, mode: "create", id: null });
  };

  const openWardEdit = (ward) => {
    setWardForm({
      department_id: ward.department_id || "",
      name: ward.name || "",
      type: ward.type || "",
      daily_rate: ward.daily_rate != null && ward.daily_rate !== "" ? String(ward.daily_rate) : "",
    });
    setWardDialog({ open: true, mode: "edit", id: ward.id });
  };

  const saveWard = async () => {
    if (!wardForm.name?.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Ward name is required." });
      return;
    }
    if (!wardForm.department_id) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please select a department." });
      return;
    }
    setWardSaving(true);
    try {
      const dailyRate = wardForm.daily_rate !== "" && wardForm.daily_rate != null ? parseFloat(wardForm.daily_rate) : null;
      const payload = {
        department_id: wardForm.department_id,
        name: wardForm.name.trim(),
        type: wardForm.type?.trim() || null,
        daily_rate: Number.isFinite(dailyRate) ? dailyRate : null,
      };
      if (wardDialog.mode === "create") {
        await fetchJson(API.wards, { method: "POST", token, body: payload });
        Swal.fire({ icon: "success", title: "Created", timer: 1200, showConfirmButton: false });
      } else {
        await fetchJson(`${API.wards}/${wardDialog.id}`, { method: "PUT", token, body: payload });
        Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
      }
      setWardDialog({ open: false, mode: "create", id: null });
      loadWards();
      loadWardOptions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setWardSaving(false);
    }
  };

  const deleteWard = async (id) => {
    const confirm = await Swal.fire({ icon: "warning", title: "Delete ward?", text: "This cannot be undone.", showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Cancel" });
    if (!confirm.isConfirmed) return;
    try {
      await fetchJson(`${API.wards}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadWards();
      loadWardOptions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const openBedCreate = () => {
    setBedForm({ ward_id: "", bed_number: "", status: "available" });
    setBedDialog({ open: true, mode: "create", id: null });
  };

  const openBedEdit = (bed) => {
    setBedForm({
      ward_id: bed.ward_id || "",
      bed_number: bed.bed_number || "",
      status: bed.status || "available",
    });
    setBedDialog({ open: true, mode: "edit", id: bed.id });
  };

  const saveBed = async () => {
    if (!bedForm.bed_number?.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Bed number is required." });
      return;
    }
    if (!bedForm.ward_id) {
      Swal.fire({ icon: "warning", title: "Required", text: "Please select a ward." });
      return;
    }
    setBedSaving(true);
    try {
      if (bedDialog.mode === "create") {
        await fetchJson(API.beds, { method: "POST", token, body: { ward_id: bedForm.ward_id, bed_number: bedForm.bed_number.trim(), status: bedForm.status || "available" } });
        Swal.fire({ icon: "success", title: "Created", timer: 1200, showConfirmButton: false });
      } else {
        await fetchJson(`${API.beds}/${bedDialog.id}`, { method: "PUT", token, body: { ward_id: bedForm.ward_id, bed_number: bedForm.bed_number.trim(), status: bedForm.status } });
        Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
      }
      setBedDialog({ open: false, mode: "create", id: null });
      loadBeds();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setBedSaving(false);
    }
  };

  const updateBedStatus = async (bedId, status) => {
    try {
      await fetchJson(`${API.beds}/${bedId}/status`, { method: "PATCH", token, body: { status } });
      Swal.fire({ icon: "success", title: "Status updated", timer: 1000, showConfirmButton: false });
      loadBeds();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const deleteBed = async (id) => {
    const confirm = await Swal.fire({ icon: "warning", title: "Delete bed?", text: "This cannot be undone.", showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Cancel" });
    if (!confirm.isConfirmed) return;
    try {
      await fetchJson(`${API.beds}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadBeds();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const openAdmissionView = async (admissionId) => {
    setAdmissionView({ open: true, loading: true, admission: null, billing: null });
    setAdmissionPayAmount("");
    setAdmissionPayMethod("cash");
    setNoteDialogOpen(false);
    setNoteForm({
      temperature: "",
      blood_pressure: "",
      pulse: "",
      respiratory_rate: "",
      pain_scale: "",
      notes: "",
      date_time: "",
    });
    try {
      const [admissionRes, billingRes] = await Promise.all([
        fetchJson(`${API.admissions}/${admissionId}`, { token }),
        fetchJson(`${API.billing}/by-reference?item_type=admission&reference_id=${admissionId}`, { token }).catch(() => ({ data: null })),
      ]);
      setAdmissionView({
        open: true,
        loading: false,
        admission: admissionRes?.data || null,
        billing: billingRes?.data || null,
      });
    } catch (e) {
      setAdmissionView({ open: false, loading: false, admission: null, billing: null });
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const generateAdmissionBilling = async (admissionId) => {
    try {
      const data = await fetchJson(`${API.admissions}/${admissionId}/generate-billing`, { method: "POST", token });
      Swal.fire({
        icon: "success",
        title: "Billing generated",
        text: data?.message || `Total: ${data?.data?.total_amount ?? "—"}. Patient must pay before discharge.`,
      });
      if (admissionView.admission?.id === admissionId) {
        const [admissionRes, billingRes] = await Promise.all([
          fetchJson(`${API.admissions}/${admissionId}`, { token }),
          fetchJson(`${API.billing}/by-reference?item_type=admission&reference_id=${admissionId}`, { token }).catch(() => ({ data: null })),
        ]);
        setAdmissionView((p) => ({
          ...p,
          admission: admissionRes?.data || p.admission,
          billing: billingRes?.data || null,
        }));
      }
      loadAdmissions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const dischargeAdmission = async (admissionId) => {
    const confirm = await Swal.fire({ icon: "question", title: "Discharge patient?", text: "Bed will be marked available.", showCancelButton: true, confirmButtonText: "Discharge", cancelButtonText: "Cancel" });
    if (!confirm.isConfirmed) return;
    try {
      await fetchJson(`${API.admissions}/${admissionId}/discharge`, { method: "PATCH", token });
      Swal.fire({ icon: "success", title: "Discharged", timer: 1200, showConfirmButton: false });
      if (admissionView.admission?.id === admissionId) setAdmissionView((p) => ({ ...p, open: false }));
      loadAdmissions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const viewAdmissionReceipt = async () => {
    const billId = admissionView.billing?.bill_id;
    if (!billId) {
      Swal.fire({ icon: "info", title: "No bill", text: "Cannot find bill for this admission." });
      return;
    }
    try {
      const res = await fetchJson(`${API.billing}/${billId}`, { token });
      const payments = res?.data?.payments || [];
      const lastPayment = payments.length ? payments[payments.length - 1] : null;
      if (lastPayment?.id) setReceiptDialogPaymentId(lastPayment.id);
      else Swal.fire({ icon: "info", title: "No payment", text: "No payment record found for this bill." });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const recordAdmissionPayment = async () => {
    const billId = admissionView.billing?.bill_id;
    const admissionId = admissionView.admission?.id;
    if (!billId || !admissionId) return;
    const defaultAmount = Number(admissionView.billing?.balance ?? admissionView.billing?.total_amount ?? 0);
    const amountRaw = admissionPayAmount !== "" ? Number(admissionPayAmount) : defaultAmount;
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a positive amount." });
      return;
    }
    setAdmissionPaySaving(true);
    try {
      const res = await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: billId,
          amount_paid: amountRaw,
          payment_method: admissionPayMethod || "cash",
          payment_date: new Date().toISOString(),
        },
      });
      Swal.fire({ icon: "success", title: "Payment recorded", text: "You can discharge the patient when ready." });
      const billingRes = await fetchJson(`${API.billing}/by-reference?item_type=admission&reference_id=${admissionId}`, { token }).catch(() => ({ data: null }));
      setAdmissionView((p) => ({ ...p, billing: billingRes?.data ?? p.billing }));
      setAdmissionPayAmount("");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e?.message });
    } finally {
      setAdmissionPaySaving(false);
    }
  };

  const openAddNoteDialog = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setNoteForm({
      temperature: "",
      blood_pressure: "",
      pulse: "",
      respiratory_rate: "",
      pain_scale: "",
      notes: "",
      date_time: local,
    });
    setNoteDialogOpen(true);
  };

  const submitNursingNote = async () => {
    const adm = admissionView.admission;
    if (!adm?.id) return;
    setNoteSaving(true);
    try {
      const body = {
        admission_id: adm.id,
        patient_id: adm.patient_id || adm.patient?.id,
        notes: noteForm.notes?.trim() || null,
        date_time: noteForm.date_time ? new Date(noteForm.date_time).toISOString() : new Date().toISOString(),
        temperature: noteForm.temperature !== "" && noteForm.temperature != null ? Number(noteForm.temperature) : null,
        blood_pressure: noteForm.blood_pressure?.trim() || null,
        pulse: noteForm.pulse !== "" && noteForm.pulse != null ? parseInt(noteForm.pulse, 10) : null,
        respiratory_rate: noteForm.respiratory_rate !== "" && noteForm.respiratory_rate != null ? parseInt(noteForm.respiratory_rate, 10) : null,
        pain_scale: noteForm.pain_scale !== "" && noteForm.pain_scale != null ? parseInt(noteForm.pain_scale, 10) : null,
      };
      await fetchJson(`${API.nursingNotes}/record`, { method: "POST", token, body });
      setNoteDialogOpen(false);
      const data = await fetchJson(`${API.admissions}/${adm.id}`, { token });
      setAdmissionView((p) => ({ ...p, admission: data?.data || null }));
      Swal.fire({ icon: "success", title: "Note added", timer: 1000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      <Box sx={{ p: 2.5, background: heroGradient, color: "white" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
            Ward & Admissions
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              if (tab === 0) loadWards();
              if (tab === 1) loadBeds();
              if (tab === 2) loadAdmissions();
              if (tab === 3) loadAdmissionBills();
              if (tab === 4) loadAdmissionPayments();
            }}
            sx={{ borderColor: "rgba(255,255,255,0.55)", color: "white", fontWeight: 800, "&:hover": { borderColor: "rgba(255,255,255,0.85)", bgcolor: "rgba(255,255,255,0.08)" } }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <CardContent sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main } }}>
          <Tab icon={<WardIcon />} iconPosition="start" label="Wards" />
          <Tab icon={<BedIcon />} iconPosition="start" label="Beds" />
          <Tab icon={<AdmissionIcon />} iconPosition="start" label="Admissions" />
          <Tab icon={<ReceiptLongIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Billing" />
          <Tab icon={<PaymentsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Payment" />
        </Tabs>
        <Divider />

        {/* Wards tab */}
        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField size="small" fullWidth label="Search (name, type)" value={wardsSearch} onChange={(e) => { setWardsSearch(e.target.value); setWardsPage(0); }} />
              {isAdmin && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openWardCreate} sx={{ fontWeight: 900, minWidth: { xs: "100%", md: 140 } }}>
                  Add Ward
                </Button>
              )}
            </Stack>
            {!isAdmin && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>View only. Only admins can create, edit, or delete wards.</Typography>
            )}
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Daily rate</TableCell>
                    {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wardsLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : wards.length ? (
                    wards.map((w, idx) => (
                      <TableRow key={w.id} hover>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{wardsPage * wardsRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{w.name}</TableCell>
                        <TableCell>{w.type || "—"}</TableCell>
                        <TableCell>{departmentOptions.find((d) => d.id === w.department_id)?.name ?? w.department?.name ?? "—"}</TableCell>
                        <TableCell>{w.daily_rate != null ? Number(w.daily_rate).toLocaleString() : "—"}</TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openWardEdit(w)} sx={{ fontWeight: 800 }}>Edit</Button>
                              <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => deleteWard(w.id)} sx={{ fontWeight: 800 }}>Delete</Button>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No wards found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={wardsTotal} page={wardsPage} onPageChange={(_, p) => setWardsPage(p)} rowsPerPage={wardsRowsPerPage} onRowsPerPageChange={(e) => { setWardsRowsPerPage(parseInt(e.target.value, 10)); setWardsPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}

        {/* Beds tab */}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2, width: "100%" }}>
              <TextField size="small" label="Search (bed number, status)" value={bedsSearch} onChange={(e) => { setBedsSearch(e.target.value); setBedsPage(0); }} sx={{ flex: 1, minWidth: 0 }} />
              {isAdmin && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openBedCreate} sx={{ fontWeight: 900, flexShrink: 0, minWidth: { xs: "100%", md: 120 } }}>
                  Add Bed
                </Button>
              )}
            </Stack>
            {!isAdmin && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>View only. Only admins can create, edit, delete beds, or change status.</Typography>
            )}
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Bed number</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Ward</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                    {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bedsLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : beds.length ? (
                    beds.map((b, idx) => (
                      <TableRow key={b.id} hover>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{bedsPage * bedsRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{b.bed_number}</TableCell>
                        <TableCell>{wardOptions.find((w) => w.id === b.ward_id)?.name ?? b.ward?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Chip size="small" label={b.status} color={b.status === "available" ? "success" : b.status === "maintenance" ? "warning" : "default"} variant="outlined" />
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openBedEdit(b)} sx={{ fontWeight: 800 }}>Edit</Button>
                              {b.status !== "maintenance" && (
                                <Button size="small" variant="outlined" onClick={() => updateBedStatus(b.id, b.status === "available" ? "maintenance" : "available")} sx={{ fontWeight: 800 }}>
                                  {b.status === "available" ? "Set maintenance" : "Set available"}
                                </Button>
                              )}
                              <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => deleteBed(b.id)} sx={{ fontWeight: 800 }}>Delete</Button>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No beds found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={bedsTotal} page={bedsPage} onPageChange={(_, p) => setBedsPage(p)} rowsPerPage={bedsRowsPerPage} onRowsPerPageChange={(e) => { setBedsRowsPerPage(parseInt(e.target.value, 10)); setBedsPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}

        {/* Admissions tab */}
        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 180 } }}>
                <InputLabel>Status</InputLabel>
                <Select value={admissionsStatusFilter} label="Status" onChange={(e) => { setAdmissionsStatusFilter(e.target.value); setAdmissionsPage(0); }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="admitted">Admitted</MenuItem>
                  <MenuItem value="discharged">Discharged</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Patient</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Bed</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Ward</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Admission date</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Discharge date</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {admissionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : admissions.length ? (
                    admissions.map((a, idx) => (
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{admissionsPage * admissionsRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{patientLabel(a.patient)}</TableCell>
                        <TableCell>{a.bed?.bed_number ?? "—"}</TableCell>
                        <TableCell>{a.bed?.ward?.name ?? "—"}</TableCell>
                        <TableCell>{formatDateTime(a.admission_date)}</TableCell>
                        <TableCell>{formatDateTime(a.discharge_date)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={a.status} color={a.status === "admitted" ? "primary" : "default"} variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View admission, generate billing, add notes, and discharge">
                            <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => openAdmissionView(a.id)} sx={{ fontWeight: 800 }}>View</Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No admissions found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={admissionsTotal} page={admissionsPage} onPageChange={(_, p) => setAdmissionsPage(p)} rowsPerPage={admissionsRowsPerPage} onRowsPerPageChange={(e) => { setAdmissionsRowsPerPage(parseInt(e.target.value, 10)); setAdmissionsPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}

        {/* Billing tab (bills for admissions only) */}
        {tab === 3 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Bills for ward admissions. When you admit a patient and generate billing, the bill appears here. View and record payment in Admissions or here.
            </Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
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
                  {admissionBillsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading bills…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : admissionBills.length ? (
                    admissionBills.map((b, idx) => {
                      const patientName = b?.patient?.full_name || b?.patient?.user?.full_name || "—";
                      const total = Number(b?.total_amount ?? 0);
                      const paidAmt = Number(b?.paid_amount ?? 0);
                      const balance = Math.max(0, total - paidAmt);
                      const status = b?.paid ? "paid" : (b?.status || "unpaid");
                      return (
                        <TableRow key={b.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{admissionBillsPage * admissionBillsRowsPerPage + idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{patientName}</TableCell>
                          <TableCell>{total.toFixed(2)}</TableCell>
                          <TableCell>{paidAmt.toFixed(2)}</TableCell>
                          <TableCell>{balance.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={status} color={status === "paid" ? "success" : status === "partial" ? "warning" : "default"} />
                          </TableCell>
                          <TableCell>{formatDateTime(b.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => openAdmissionBillView(b.id)}>View</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Typography sx={{ py: 2 }} color="text.secondary">No admission bills yet. Admit a patient and generate billing from Admissions to create a bill here.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={admissionBillsTotal} page={admissionBillsPage} onPageChange={(_, p) => setAdmissionBillsPage(p)} rowsPerPage={admissionBillsRowsPerPage} onRowsPerPageChange={(e) => { setAdmissionBillsRowsPerPage(parseInt(e.target.value, 10)); setAdmissionBillsPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}

        {/* Payment tab (payments for admission bills only) */}
        {tab === 4 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Payments recorded for admission (ward) bills.
            </Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
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
                  {admissionPaymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading payments…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : admissionPayments.length ? (
                    admissionPayments.map((p, idx) => {
                      const patientName = p?.bill?.patient?.full_name || p?.bill?.patient?.user?.full_name || "—";
                      return (
                        <TableRow key={p.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{admissionPaymentsPage * admissionPaymentsRowsPerPage + idx + 1}</TableCell>
                          <TableCell>{formatDateTime(p.payment_date || p.createdAt)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{patientName}</TableCell>
                          <TableCell>{Number(p.amount_paid ?? 0).toFixed(2)}</TableCell>
                          <TableCell>{p.payment_method || "—"}</TableCell>
                          <TableCell sx={{ fontSize: "0.85rem", color: "text.secondary" }}>{p.bill_id ? `#${String(p.bill_id).slice(0, 8)}` : "—"}</TableCell>
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
                        <Typography sx={{ py: 2 }} color="text.secondary">No payments for admissions yet. Record payment from the Admissions tab (view admission → pay when billed).</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={admissionPaymentsTotal} page={admissionPaymentsPage} onPageChange={(_, p) => setAdmissionPaymentsPage(p)} rowsPerPage={admissionPaymentsRowsPerPage} onRowsPerPageChange={(e) => { setAdmissionPaymentsRowsPerPage(parseInt(e.target.value, 10)); setAdmissionPaymentsPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}
      </CardContent>

      {/* Admission bill view dialog */}
      <Dialog open={admissionBillView.open} onClose={() => setAdmissionBillView({ open: false, bill: null, loading: false })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Admission bill</DialogTitle>
        <DialogContent dividers>
          {admissionBillView.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : admissionBillView.bill ? (
            <Stack spacing={2}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Bill #{admissionBillView.bill.id?.slice(0, 8)}</Typography>
                <Typography sx={{ fontWeight: 800 }}>Patient: {admissionBillView.bill.patient?.full_name || admissionBillView.bill.patient?.user?.full_name || "—"}</Typography>
                <Typography>Total: {Number(admissionBillView.bill.total_amount ?? 0).toFixed(2)} • Paid: {Number(admissionBillView.bill.paid_amount ?? 0).toFixed(2)} • Balance: {Number(admissionBillView.bill.balance ?? 0).toFixed(2)}</Typography>
                <Chip size="small" label={admissionBillView.bill.paid ? "paid" : (admissionBillView.bill.status || "unpaid")} color={admissionBillView.bill.paid ? "success" : "default"} sx={{ mt: 0.5 }} />
              </Box>
              {Array.isArray(admissionBillView.bill.payments) && admissionBillView.bill.payments.length > 0 && (
                <Box>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Payments</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {admissionBillView.bill.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDateTime(p.payment_date)}</TableCell>
                          <TableCell>{Number(p.amount_paid ?? 0).toFixed(2)}</TableCell>
                          <TableCell>{p.payment_method || "—"}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="View receipt">
                              <IconButton size="small" color="primary" onClick={() => setReceiptDialogPaymentId(p.id)}><ReceiptIcon /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdmissionBillView({ open: false, bill: null, loading: false })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Ward create/edit dialog */}
      <Dialog open={wardDialog.open} onClose={() => setWardDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{wardDialog.mode === "create" ? "Add Ward" : "Edit Ward"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Department</InputLabel>
              <Select value={wardForm.department_id} label="Department" onChange={(e) => setWardForm((p) => ({ ...p, department_id: e.target.value }))}>
                <MenuItem value="">Select department</MenuItem>
                {departmentOptions.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="Ward name" value={wardForm.name} onChange={(e) => setWardForm((p) => ({ ...p, name: e.target.value }))} required />
            <TextField fullWidth size="small" label="Type (e.g. General, ICU)" value={wardForm.type} onChange={(e) => setWardForm((p) => ({ ...p, type: e.target.value }))} />
            <TextField
              fullWidth
              size="small"
              label="Daily rate (admission billing)"
              type="number"
              inputProps={{ step: 0.01, min: 0 }}
              value={wardForm.daily_rate}
              onChange={(e) => setWardForm((p) => ({ ...p, daily_rate: e.target.value }))}
              placeholder="e.g. 5000"
              helperText="Charge per day when a patient is admitted to a bed in this ward. Used when the patient is discharged."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWardDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveWard} disabled={wardSaving}>{wardSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Bed create/edit dialog */}
      <Dialog open={bedDialog.open} onClose={() => setBedDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{bedDialog.mode === "create" ? "Add Bed" : "Edit Bed"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Ward</InputLabel>
              <Select value={bedForm.ward_id} label="Ward" onChange={(e) => setBedForm((p) => ({ ...p, ward_id: e.target.value }))}>
                <MenuItem value="">Select ward</MenuItem>
                {wardOptions.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="Bed number" value={bedForm.bed_number} onChange={(e) => setBedForm((p) => ({ ...p, bed_number: e.target.value }))} required />
            {bedDialog.mode === "edit" && (
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={bedForm.status} label="Status" onChange={(e) => setBedForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="occupied">Occupied</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBedDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveBed} disabled={bedSaving}>{bedSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Admission view (with notes) */}
      <Dialog open={admissionView.open} onClose={() => setAdmissionView((p) => ({ ...p, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle>Admission details</DialogTitle>
        <DialogContent>
          {admissionView.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
              <Typography>Loading…</Typography>
            </Stack>
          ) : admissionView.admission ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
                <Typography fontWeight={800}>{patientLabel(admissionView.admission.patient)}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Bed / Ward</Typography>
                <Typography fontWeight={800}>{admissionView.admission.bed?.bed_number} — {admissionView.admission.bed?.ward?.name ?? "—"}</Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Admission date</Typography>
                  <Typography>{formatDateTime(admissionView.admission.admission_date)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Discharge date</Typography>
                  <Typography>{formatDateTime(admissionView.admission.discharge_date)}</Typography>
                </Box>
                <Chip size="small" label={admissionView.admission.status} color={admissionView.admission.status === "admitted" ? "primary" : "default"} />
              </Stack>
              {admissionView.admission.status === "admitted" && (
                <>
                  <Divider />
                  <Typography variant="subtitle1" fontWeight={800}>Admission billing</Typography>
                  {(() => {
                    const b = admissionView.billing;
                    const total = Number(b?.total_amount ?? 0);
                    const paid = !!b?.paid;
                    if (!b?.exists || total <= 0) {
                      return (
                        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                          <Chip size="small" label="Not generated" color="default" variant="outlined" />
                          <Button size="small" variant="contained" startIcon={<ReceiptIcon />} onClick={() => generateAdmissionBilling(admissionView.admission.id)} sx={{ fontWeight: 800 }}>
                            Generate billing
                          </Button>
                          <Typography variant="body2" color="text.secondary">
                            Generate the total bill (days × daily rate), then collect payment before discharge.
                          </Typography>
                        </Stack>
                      );
                    }
                    if (!paid) {
                      const balance = Number(b?.balance ?? b?.total_amount ?? 0);
                      return (
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                            <Chip size="small" label={`Bill: ${total} — unpaid`} color="warning" variant="outlined" />
                            <Typography variant="body2" color="text.secondary">Record payment below to enable Discharge.</Typography>
                          </Stack>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Record payment</Typography>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap">
                            <TextField
                              size="small"
                              label="Amount"
                              type="number"
                              value={admissionPayAmount !== "" ? admissionPayAmount : String(balance > 0 ? balance : total)}
                              onChange={(e) => setAdmissionPayAmount(e.target.value)}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: { xs: "100%", sm: 120 } }}
                            />
                            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
                              <InputLabel>Payment method</InputLabel>
                              <Select
                                value={admissionPayMethod}
                                label="Payment method"
                                onChange={(e) => setAdmissionPayMethod(e.target.value)}
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
                              onClick={recordAdmissionPayment}
                              disabled={admissionPaySaving}
                              sx={{ fontWeight: 800 }}
                            >
                              {admissionPaySaving ? "Recording…" : "Record payment"}
                            </Button>
                          </Stack>
                        </Stack>
                      );
                    }
                    return (
                      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                        <Chip size="small" label="Bill paid" color="success" />
                        <Button size="small" variant="outlined" startIcon={<ReceiptIcon />} onClick={viewAdmissionReceipt} sx={{ fontWeight: 700 }}>
                          View receipt
                        </Button>
                      </Stack>
                    );
                  })()}
                </>
              )}
              <Divider />
              <Typography variant="subtitle1" fontWeight={800}>Nursing notes</Typography>
              {admissionView.admission.status === "admitted" && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<NoteAddIcon />}
                  onClick={openAddNoteDialog}
                  sx={{ fontWeight: 800 }}
                >
                  Add note
                </Button>
              )}
              <Box sx={{ width: "100%", overflow: "auto" }}>
                {admissionView.admission.nursingNotes?.length ? (
                  <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, width: "100%" }}>
                    <Table size="small" sx={{ minWidth: 720 }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                          <TableCell sx={{ fontWeight: 800 }}>Date / time</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Temp</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>BP</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Pulse</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>RR</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Pain</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Notes</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Recorded by</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {admissionView.admission.nursingNotes.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell>{formatDateTime(n.date_time || n.recorded_at)}</TableCell>
                            <TableCell>{n.temperature != null ? n.temperature : "—"}</TableCell>
                            <TableCell>{n.blood_pressure || "—"}</TableCell>
                            <TableCell>{n.pulse != null ? n.pulse : "—"}</TableCell>
                            <TableCell>{n.respiratory_rate != null ? n.respiratory_rate : "—"}</TableCell>
                            <TableCell>{n.pain_scale != null ? n.pain_scale : "—"}</TableCell>
                            <TableCell sx={{ maxWidth: 200 }}>{n.notes || "—"}</TableCell>
                            <TableCell>{n.nurse?.user?.full_name ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary">No notes yet.</Typography>
                )}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          {admissionView.admission?.status === "admitted" && (
            <>
              {(!admissionView.billing?.exists || Number(admissionView.billing?.total_amount ?? 0) <= 0) && (
                <Button variant="outlined" startIcon={<ReceiptIcon />} onClick={() => generateAdmissionBilling(admissionView.admission.id)} sx={{ fontWeight: 800 }}>
                  Generate billing
                </Button>
              )}
              {admissionView.billing?.paid && (
                <Button color="secondary" startIcon={<DischargeIcon />} onClick={() => dischargeAdmission(admissionView.admission.id)}>Discharge</Button>
              )}
            </>
          )}
          <Button onClick={() => setAdmissionView((p) => ({ ...p, open: false }))}>Close</Button>
        </DialogActions>
      </Dialog>

      <ReceiptDialog
        open={!!receiptDialogPaymentId}
        onClose={() => setReceiptDialogPaymentId(null)}
        paymentId={receiptDialogPaymentId}
        getToken={getToken}
      />

      {/* Add nursing note dialog */}
      <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add nursing note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              type="datetime-local"
              label="Date & time"
              value={noteForm.date_time}
              onChange={(e) => setNoteForm((p) => ({ ...p, date_time: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              size="small"
              label="Temperature (°C)"
              type="number"
              inputProps={{ step: 0.1, min: 0 }}
              value={noteForm.temperature}
              onChange={(e) => setNoteForm((p) => ({ ...p, temperature: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Blood pressure"
              placeholder="e.g. 120/80"
              value={noteForm.blood_pressure}
              onChange={(e) => setNoteForm((p) => ({ ...p, blood_pressure: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Pulse"
              type="number"
              inputProps={{ min: 0 }}
              value={noteForm.pulse}
              onChange={(e) => setNoteForm((p) => ({ ...p, pulse: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Respiratory rate"
              type="number"
              inputProps={{ min: 0 }}
              value={noteForm.respiratory_rate}
              onChange={(e) => setNoteForm((p) => ({ ...p, respiratory_rate: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Pain scale (0-10)"
              type="number"
              inputProps={{ min: 0, max: 10 }}
              value={noteForm.pain_scale}
              onChange={(e) => setNoteForm((p) => ({ ...p, pain_scale: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Notes"
              multiline
              minRows={3}
              value={noteForm.notes}
              onChange={(e) => setNoteForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Clinical note…"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitNursingNote} disabled={noteSaving} sx={{ fontWeight: 800 }}>
            {noteSaving ? "Saving…" : "Save note"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
