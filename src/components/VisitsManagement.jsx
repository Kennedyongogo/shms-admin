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
  Autocomplete,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  EventNote as EventNoteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  NoteAdd as NoteAddIcon,
  Edit as EditIcon,
  Science as ScienceIcon,
  LocalPharmacy as PharmacyIcon,
  Hotel as AdmitIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";
import ReceiptDialog from "./ReceiptDialog";

const API = {
  appointments: "/api/appointments",
  consultations: "/api/consultations",
  patients: "/api/patients",
  staff: "/api/staff",
  services: "/api/services",
  labTests: "/api/lab-tests",
  labOrders: "/api/lab-orders",
  medications: "/api/medications",
  prescriptions: "/api/prescriptions",
  billing: "/api/billing",
  payments: "/api/payments",
  admissions: "/api/admissions",
  beds: "/api/beds",
  wards: "/api/wards",
};

const getToken = () => localStorage.getItem("token");
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};
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

const toLocalDateTimeInputValue = (date = new Date()) => {
  // `datetime-local` expects local time, but `toISOString()` is UTC.
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

export default function VisitsManagement() {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = getToken();
  const currentUser = getUser();
  const roleName = getRoleName();
  const isAdmin = roleName === "admin";

  const isAssignedDoctor = (apptLike) => {
    const doctorUserId =
      apptLike?.doctor?.user?.id || apptLike?.appointment?.doctor?.user?.id;
    return Boolean(
      doctorUserId &&
      currentUser?.id &&
      String(doctorUserId) === String(currentUser.id),
    );
  };

  const [tab, setTab] = useState(0); // 0 appointments, 1 consultations, 2 billing, 3 payment

  // Appointments list
  const apptReqId = useRef(0);
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptPage, setApptPage] = useState(0);
  const [apptRowsPerPage, setApptRowsPerPage] = useState(10);
  const [apptTotal, setApptTotal] = useState(0);
  const [apptSearch, setApptSearch] = useState("");
  const [apptSearchLocked, setApptSearchLocked] = useState(true);

  // Consultations list
  const consReqId = useRef(0);
  const [consultations, setConsultations] = useState([]);
  const [consLoading, setConsLoading] = useState(false);
  const [consPage, setConsPage] = useState(0);
  const [consRowsPerPage, setConsRowsPerPage] = useState(10);
  const [consTotal, setConsTotal] = useState(0);
  const [consSearch, setConsSearch] = useState("");
  const [consSearchLocked, setConsSearchLocked] = useState(true);

  // Appointment Billing tab (bills with item_type=appointment only)
  const mainBillsReqId = useRef(0);
  const [mainBills, setMainBills] = useState([]);
  const [mainBillsLoading, setMainBillsLoading] = useState(false);
  const [mainBillsPage, setMainBillsPage] = useState(0);
  const [mainBillsRowsPerPage, setMainBillsRowsPerPage] = useState(10);
  const [mainBillsTotal, setMainBillsTotal] = useState(0);
  const [mainBillView, setMainBillView] = useState({ open: false, bill: null, loading: false });

  // Appointment Payment tab (payments for appointment bills only)
  const mainPaymentsReqId = useRef(0);
  const [mainPayments, setMainPayments] = useState([]);
  const [mainPaymentsLoading, setMainPaymentsLoading] = useState(false);
  const [mainPaymentsPage, setMainPaymentsPage] = useState(0);
  const [mainPaymentsRowsPerPage, setMainPaymentsRowsPerPage] = useState(10);
  const [mainPaymentsTotal, setMainPaymentsTotal] = useState(0);
  const [receiptDialogPaymentId, setReceiptDialogPaymentId] = useState(null);

  // Create appointment dialog (walk-in supported)
  const [createApptOpen, setCreateApptOpen] = useState(false);
  const [walkIn, setWalkIn] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [billAmount, setBillAmount] = useState("0");
  const [appointmentDate, setAppointmentDate] = useState(() =>
    toLocalDateTimeInputValue(),
  );
  const [statusFilter, setStatusFilter] = useState("");

  const [patientOptions, setPatientOptions] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Appointment view/status dialog
  const [apptViewOpen, setApptViewOpen] = useState(false);
  const [apptViewLoading, setApptViewLoading] = useState(false);
  const [apptView, setApptView] = useState(null);
  const [apptStatusDraft, setApptStatusDraft] = useState("");
  const [apptStatusSaving, setApptStatusSaving] = useState(false);
  const [apptBilling, setApptBilling] = useState(null);
  const [apptBillingLoading, setApptBillingLoading] = useState(false);
  const [apptViewInnerTab, setApptViewInnerTab] = useState(0); // 0 Details, 1 Billing & payment
  const [apptBillItemAmount, setApptBillItemAmount] = useState("");
  const [apptBillItemNote, setApptBillItemNote] = useState("");
  const [apptBillItemSaving, setApptBillItemSaving] = useState(false);

  // Consultation view + actions
  const [consViewOpen, setConsViewOpen] = useState(false);
  const [consViewLoading, setConsViewLoading] = useState(false);
  const [consView, setConsView] = useState(null);

  const [consEditOpen, setConsEditOpen] = useState(false);
  const [consEditSaving, setConsEditSaving] = useState(false);
  const [consEditForm, setConsEditForm] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
  });

  const [labOpen, setLabOpen] = useState(false);
  const [labSaving, setLabSaving] = useState(false);
  const [labTests, setLabTests] = useState([]);
  const [labTestsLoading, setLabTestsLoading] = useState(false);
  const [selectedLabTests, setSelectedLabTests] = useState([]);

  const [rxOpen, setRxOpen] = useState(false);
  const [rxSaving, setRxSaving] = useState(false);
  const [medications, setMedications] = useState([]);
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [rxItems, setRxItems] = useState([
    { medication: null, dosage: "", frequency: "", duration: "", quantity: 1 },
  ]);

  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitSaving, setAdmitSaving] = useState(false);
  const [admitBedId, setAdmitBedId] = useState("");
  const [availableBeds, setAvailableBeds] = useState([]);
  const [admitBedsLoading, setAdmitBedsLoading] = useState(false);
  const [wardOptions, setWardOptions] = useState([]);
  const [consViewHasAdmission, setConsViewHasAdmission] = useState(false);

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

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const loadAppointments = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++apptReqId.current;
    setApptLoading(true);
    try {
      const page = apptPage + 1;
      const limit = apptRowsPerPage;
      const search = apptSearch.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const data = await fetchJson(`${API.appointments}?${qs.toString()}`, {
        token,
      });
      if (reqId !== apptReqId.current) return;
      setAppointments(data.data || []);
      setApptTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== apptReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== apptReqId.current) return;
      setApptLoading(false);
    }
  };

  const loadConsultations = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++consReqId.current;
    setConsLoading(true);
    try {
      const page = consPage + 1;
      const limit = consRowsPerPage;
      const search = consSearch.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const data = await fetchJson(`${API.consultations}?${qs.toString()}`, {
        token,
      });
      if (reqId !== consReqId.current) return;
      setConsultations(data.data || []);
      setConsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== consReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== consReqId.current) return;
      setConsLoading(false);
    }
  };

  const loadMainBills = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++mainBillsReqId.current;
    setMainBillsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(mainBillsPage + 1),
        limit: String(mainBillsRowsPerPage),
        item_type: "appointment",
      });
      const data = await fetchJson(`${API.billing}?${qs.toString()}`, { token });
      if (reqId !== mainBillsReqId.current) return;
      setMainBills(data.data || []);
      setMainBillsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== mainBillsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
      setMainBills([]);
    } finally {
      if (reqId === mainBillsReqId.current) setMainBillsLoading(false);
    }
  };

  const loadMainPayments = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++mainPaymentsReqId.current;
    setMainPaymentsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(mainPaymentsPage + 1),
        limit: String(mainPaymentsRowsPerPage),
        for_appointment: "1",
      });
      const data = await fetchJson(`${API.payments}?${qs.toString()}`, { token });
      if (reqId !== mainPaymentsReqId.current) return;
      setMainPayments(data.data || []);
      setMainPaymentsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== mainPaymentsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
      setMainPayments([]);
    } finally {
      if (reqId === mainPaymentsReqId.current) setMainPaymentsLoading(false);
    }
  };

  const openMainBillView = async (billId) => {
    if (!billId) return;
    setMainBillView({ open: true, bill: null, loading: true });
    try {
      const data = await fetchJson(`${API.billing}/${billId}`, { token });
      const b = data?.data || null;
      setMainBillView({ open: true, bill: b, loading: false });
    } catch (e) {
      setMainBillView({ open: false, bill: null, loading: false });
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  // Skip first run of debounced search so tab-gated effect does the initial load only (avoids double blink)
  const apptSearchDebounceSkipped = useRef(true);
  const consSearchDebounceSkipped = useRef(true);

  // Load only the active tab's list to avoid double loading flash on mount
  useEffect(() => {
    if (tab === 0) loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, apptPage, apptRowsPerPage, statusFilter]);

  useEffect(() => {
    if (tab === 1) loadConsultations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, consPage, consRowsPerPage]);

  useEffect(() => {
    if (tab === 2) loadMainBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mainBillsPage, mainBillsRowsPerPage]);

  useEffect(() => {
    if (tab === 3) loadMainPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mainPaymentsPage, mainPaymentsRowsPerPage]);

  // Debounced search — skip first run so we don't double-load on mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 0) return;
      if (apptSearchDebounceSkipped.current) {
        apptSearchDebounceSkipped.current = false;
        return;
      }
      if (apptPage !== 0) setApptPage(0);
      else loadAppointments();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptSearch, tab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 1) return;
      if (consSearchDebounceSkipped.current) {
        consSearchDebounceSkipped.current = false;
        return;
      }
      if (consPage !== 0) setConsPage(0);
      else loadConsultations();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consSearch, tab]);

  const searchPatients = async (q) => {
    if (!requireTokenGuard()) return;
    setPatientLoading(true);
    try {
      const qs = new URLSearchParams({
        page: "1",
        limit: "10",
        ...(q ? { search: q } : {}),
      });
      const data = await fetchJson(`${API.patients}?${qs.toString()}`, {
        token,
      });
      setPatientOptions(data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setPatientLoading(false);
    }
  };

  const searchDoctors = async (q, dateTimeForAvailability) => {
    if (!requireTokenGuard()) return;
    setDoctorLoading(true);
    try {
      const qs = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(q ? { search: q } : {}),
        ...(dateTimeForAvailability ? { available_at: dateTimeForAvailability } : {}),
      });
      const data = await fetchJson(`${API.staff}?${qs.toString()}`, { token });
      setDoctorOptions(data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setDoctorLoading(false);
    }
  };

  const searchServices = async (q) => {
    if (!requireTokenGuard()) return;
    setServiceLoading(true);
    try {
      const qs = new URLSearchParams({
        page: "1",
        limit: "20",
        ...(q ? { search: q } : {}),
      });
      const data = await fetchJson(`${API.services}?${qs.toString()}`, {
        token,
      });
      setServiceOptions(data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setServiceLoading(false);
    }
  };

  const openCreateAppointment = () => {
    setApptSearchLocked(true);
    setConsSearchLocked(true);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedService(null);
    setWalkIn(true);
    setBillAmount("0");
    setAppointmentDate(toLocalDateTimeInputValue());
    setCreateApptOpen(true);
    searchPatients("");
    searchDoctors("", toLocalDateTimeInputValue());
    searchServices("");
  };

  const createAppointment = async () => {
    if (!requireTokenGuard()) return;
    if (!selectedPatient?.id)
      return Swal.fire({
        icon: "warning",
        title: "Select patient",
        text: "Please select a patient.",
      });
    if (!selectedDoctor?.id)
      return Swal.fire({
        icon: "warning",
        title: "Select doctor",
        text: "Please select a doctor.",
      });

    if (walkIn) {
      const n = Number(billAmount);
      if (!Number.isFinite(n) || n < 0) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid amount",
          text: "Enter a valid bill amount (0 or more).",
        });
      }
    }

    const payload = {
      patient_id: selectedPatient.id,
      doctor_id: selectedDoctor.id,
      service_id: selectedService?.id ?? null,
      appointment_date: new Date(appointmentDate).toISOString(),
      created_by: currentUser?.id ?? null,
      is_walk_in: !!walkIn,
      bill_amount: walkIn ? Number(billAmount) : null,
    };

    try {
      const created = await fetchJson(API.appointments, {
        method: "POST",
        token,
        body: payload,
      });
      const appt = created?.data;

      if (!appt?.id) {
        Swal.fire({ icon: "error", title: "Failed", text: "Server did not return the created appointment." });
        return;
      }

      setCreateApptOpen(false);

      // For walk-in, optionally fetch full appointment for billing context; don't fail if this GET errors
      let fullAppt = appt;
      if (walkIn) {
        try {
          const fullRes = await fetchJson(`${API.appointments}/${appt.id}`, { token });
          if (fullRes?.data) fullAppt = fullRes.data;
        } catch (_) {
          // Use created appointment; table will still show it and user can open from list
        }
      }

      if (walkIn) {
        const payNow = await Swal.fire({
          icon: "info",
          title: "Payment required",
          text: "Walk-in appointments must be paid before they can be confirmed. Open Billing to add the bill item and record payment.",
          showCancelButton: true,
          confirmButtonText: "Open billing",
          cancelButtonText: "Later",
          reverseButtons: true,
        });
        if (payNow.isConfirmed) {
          openBillingForAppointment(fullAppt);
        } else {
          Swal.fire({
            icon: "success",
            title: "Created",
            text: "Appointment created as pending (unpaid).",
          });
        }
      } else {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Appointment created.",
        });
      }
      await loadAppointments();
    } catch (e) {
      const backendError = e?.data?.error;
      const text = backendError
        ? `${e?.message ?? "Failed"}. ${backendError}`
        : (e?.message ?? "Something went wrong.");
      Swal.fire({ icon: "error", title: "Failed", text });
    }
  };

  const deleteAppointment = async (appt) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete appointment?",
      html: `Delete appointment for <b>${appt?.patient?.full_name || appt?.patient?.user?.full_name || "patient"}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const data = await fetchJson(`${API.appointments}/${appt.id}`, {
        method: "DELETE",
        token,
      });
      const deleted = data?.deleted ?? {};
      const parts = [];
      if (deleted.consultation) parts.push("consultation");
      if (deleted.appointmentBills) parts.push("billing");
      if (deleted.admissionsDeleted) parts.push(`${deleted.admissionsDeleted} admission(s)`);
      const detail = parts.length ? ` (${parts.join(", ")})` : "";
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: `Appointment deleted.${detail}`,
      });
      await loadAppointments();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const openRecordConsultation = async (appt) => {
    if (!requireTokenGuard()) return;
    if (!appt?.id) return;
    if (!isAssignedDoctor(appt)) {
      Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the doctor assigned to this appointment can record a consultation.",
      });
      return;
    }

    // Consultation is only allowed after payment → appointment confirmed
    if (appt.status !== "confirmed" && appt.status !== "completed") {
      const ask = await Swal.fire({
        icon: "warning",
        title: "Appointment not confirmed",
        text: "You can only record a consultation after payment is made and the appointment is confirmed. Open Billing to add the bill item and record payment.",
        showCancelButton: true,
        confirmButtonText: "Open billing",
        cancelButtonText: "Later",
        reverseButtons: true,
      });
      if (ask.isConfirmed) {
        openBillingForAppointment(appt);
        return;
      } else {
        return;
      }
    }

    try {
      // Backend enforces one consultation per appointment.
      const existing = await fetchJson(
        `${API.consultations}/appointment/${appt.id}`,
        { token },
      );
      const c = existing?.data;
      if (c?.id) {
        await Swal.fire({
          icon: "info",
          title: "Consultation already exists",
          text: "Opening the existing consultation instead.",
        });
        navigate("/appointments/consultation/" + c.id);
        return;
      }
    } catch (e) {
      // 404 means no consultation yet; proceed. Any other error should stop.
      if (e?.status && Number(e.status) !== 404) {
        Swal.fire({ icon: "error", title: "Failed", text: e.message });
        return;
      }
    }

    navigate("/appointments/record-consultation", { state: { appointment: appt } });
  };

  const loadAppointmentBilling = async (appointmentId) => {
    if (!requireTokenGuard()) return;
    setApptBillingLoading(true);
    try {
      const qs = new URLSearchParams({
        item_type: "appointment",
        reference_id: String(appointmentId),
      });
      const data = await fetchJson(
        `${API.billing}/by-reference?${qs.toString()}`,
        { token },
      );
      setApptBilling(data?.data || null);
    } catch {
      setApptBilling(null);
    } finally {
      setApptBillingLoading(false);
    }
  };

  const openViewAppointment = async (appt) => {
    if (!requireTokenGuard()) return;
    setApptViewOpen(true);
    setApptViewInnerTab(0);
    setApptViewLoading(true);
    setApptView(null);
    setApptStatusDraft("");
    setApptBilling(null);
    setApptBillItemAmount("");
    setApptBillItemNote("");
    try {
      const data = await fetchJson(`${API.appointments}/${appt.id}`, { token });
      const full = data?.data || null;
      setApptView(full);
      setApptStatusDraft(full?.status || "");
      if (full?.id) loadAppointmentBilling(full.id);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
      setApptViewOpen(false);
    } finally {
      setApptViewLoading(false);
    }
  };

  const allowedNextStatuses = (current) => {
    if (!current) return [];
    // Confirmation is payment-driven from Billing & Payments; only allow cancelling while pending.
    if (current === "pending") return ["cancelled"];
    if (current === "confirmed") return ["completed", "cancelled"];
    return [];
  };

  const saveAppointmentStatus = async () => {
    if (!requireTokenGuard()) return;
    if (!apptView?.id) return;
    if (!isAdmin && !isAssignedDoctor(apptView)) {
      return Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the assigned doctor (or admin) can update this appointment status.",
      });
    }
    const current = apptView.status;
    const allowed = allowedNextStatuses(current);
    if (!allowed.includes(apptStatusDraft)) {
      return Swal.fire({
        icon: "warning",
        title: "Invalid status",
        text: `Allowed: ${allowed.join(", ") || "none"}`,
      });
    }

    setApptStatusSaving(true);
    try {
      await fetchJson(`${API.appointments}/${apptView.id}/status`, {
        method: "PATCH",
        token,
        body: { status: apptStatusDraft },
      });
      Swal.fire({
        icon: "success",
        title: "Updated",
        timer: 900,
        showConfirmButton: false,
      });
      setApptViewOpen(false);
      await loadAppointments();
    } catch (e) {
      if (Number(e?.status) === 402 && e?.data?.code === "PAYMENT_REQUIRED") {
        Swal.fire({
          icon: "warning",
          title: "Payment required",
          text: "Record payment from the Billing & Payments page, then the appointment will confirm automatically.",
        });
        return;
      }
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setApptStatusSaving(false);
    }
  };

  const openBillingForAppointment = (appt) => {
    if (!appt?.id) return;
    setTab(2); // Switch to Billing tab on this page (Appointments | Consultations | Billing | Payment)
    setApptView(appt);
    setApptViewOpen(true);
    setApptViewInnerTab(1); // Billing & payment inner tab
    if (appt?.id) loadAppointmentBilling(appt.id);
  };

  const payForAppointment = async (appt) => {
    if (!requireTokenGuard()) return false;
    if (!appt?.id) return false;
    const patientId = appt?.patient?.id || appt?.patient_id;
    if (!patientId) {
      Swal.fire({ icon: "error", title: "Missing patient", text: "Cannot record payment without patient." });
      return false;
    }
    const defaultAmount =
      appt?.service?.price != null && appt?.service?.price !== ""
        ? String(appt.service.price)
        : String(apptBilling?.balance ?? apptBilling?.total_amount ?? appt?.bill_amount ?? "0");
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
      const qs = new URLSearchParams({
        item_type: "appointment",
        reference_id: String(appt.id),
      });
      const billingRes = await fetchJson(
        `${API.billing}/by-reference?${qs.toString()}`,
        { token },
      );
      let billId = billingRes?.data?.bill_id ?? null;

      if (!billId) {
        const billRes = await fetchJson(`${API.billing}/generate`, {
          method: "POST",
          token,
          body: { patient_id: patientId },
        });
        billId = billRes?.data?.id;
        if (billId) {
          await fetchJson(`${API.billing}/${billId}/items`, {
            method: "POST",
            token,
            body: {
              items: [{ item_type: "appointment", reference_id: appt.id, amount: amount || 0 }],
            },
          });
        }
      }

      if (!billId) {
        Swal.fire({ icon: "error", title: "Failed", text: "Could not get or create bill." });
        return false;
      }

      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: billId,
          amount_paid: amount,
          payment_method: payment_method || "cash",
          payment_date: new Date().toISOString(),
        },
      });
      Swal.fire({ icon: "success", title: "Payment recorded", text: "Appointment will be confirmed automatically if the bill is fully paid." });
      return true;
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e?.message ?? "Something went wrong." });
      return false;
    }
  };

  const createBillForAppointment = async () => {
    if (!requireTokenGuard() || !apptView?.id) return;
    const patientId = apptView?.patient?.id || apptView?.patient_id;
    if (!patientId) {
      Swal.fire({ icon: "warning", title: "Missing patient", text: "Cannot create bill without patient." });
      return;
    }
    const amount = Number(apptView?.service?.price ?? apptView?.bill_amount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Set a valid amount (e.g. from service or enter in next step)." });
      return;
    }
    try {
      const billRes = await fetchJson(`${API.billing}/generate`, {
        method: "POST",
        token,
        body: { patient_id: patientId },
      });
      const billId = billRes?.data?.id;
      if (!billId) throw new Error("No bill id returned");
      await fetchJson(`${API.billing}/${billId}/items`, {
        method: "POST",
        token,
        body: {
          items: [{ item_type: "appointment", reference_id: String(apptView.id), amount }],
        },
      });
      await loadAppointmentBilling(apptView.id);
      setApptBillItemAmount("");
      setApptBillItemNote("");
      Swal.fire({ icon: "success", title: "Bill created", text: "You can add more items and record payment below." });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const addAppointmentBillItem = async () => {
    if (!requireTokenGuard() || !apptBilling?.bill_id || !apptView?.id) return;
    const amount = Number(apptBillItemAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a valid amount." });
      return;
    }
    setApptBillItemSaving(true);
    try {
      await fetchJson(`${API.billing}/${apptBilling.bill_id}/items`, {
        method: "POST",
        token,
        body: {
          items: [
            { item_type: "service", reference_id: (apptBillItemNote || "").trim() || null, amount },
          ],
        },
      });
      await loadAppointmentBilling(apptView.id);
      setApptBillItemAmount("");
      setApptBillItemNote("");
      Swal.fire({ icon: "success", title: "Item added", timer: 900, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setApptBillItemSaving(false);
    }
  };

  const openViewConsultation = async (c) => {
    if (!requireTokenGuard()) return;
    setConsViewOpen(true);
    setConsViewLoading(true);
    setConsView(null);
    setConsViewHasAdmission(false);
    try {
      const data = await fetchJson(`${API.consultations}/${c.id}`, { token });
      const consultation = data?.data || null;
      setConsView(consultation);
      const apptId = consultation?.appointment?.id;
      if (apptId) {
        try {
          const admRes = await fetchJson(
            `${API.admissions}?appointment_id=${apptId}&status=admitted&limit=1`,
            { token }
          );
          setConsViewHasAdmission(Array.isArray(admRes?.data) && admRes.data.length > 0);
        } catch {
          setConsViewHasAdmission(false);
        }
      }
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
      setConsViewOpen(false);
    } finally {
      setConsViewLoading(false);
    }
  };

  const openEditConsultation = () => {
    if (!consView?.id) return;
    if (!isAssignedDoctor(consView)) {
      return Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the doctor assigned to this appointment can update this consultation.",
      });
    }
    setConsEditForm({
      symptoms: consView.symptoms || "",
      diagnosis: consView.diagnosis || "",
      notes: consView.notes || "",
    });
    setConsEditOpen(true);
  };

  const saveConsultationEdits = async () => {
    if (!requireTokenGuard()) return;
    if (!consView?.id) return;
    setConsEditSaving(true);
    try {
      await fetchJson(`${API.consultations}/${consView.id}`, {
        method: "PUT",
        token,
        body: {
          symptoms: consEditForm.symptoms || null,
          diagnosis: consEditForm.diagnosis || null,
          notes: consEditForm.notes || null,
        },
      });
      Swal.fire({
        icon: "success",
        title: "Saved",
        timer: 900,
        showConfirmButton: false,
      });
      setConsEditOpen(false);
      await loadConsultations();
      // reload view
      const data = await fetchJson(`${API.consultations}/${consView.id}`, {
        token,
      });
      setConsView(data?.data || null);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setConsEditSaving(false);
    }
  };

  const loadLabTests = async () => {
    if (!requireTokenGuard()) return;
    setLabTestsLoading(true);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "200" });
      const data = await fetchJson(`${API.labTests}?${qs.toString()}`, {
        token,
      });
      setLabTests(data.data || []);
    } catch {
      setLabTests([]);
    } finally {
      setLabTestsLoading(false);
    }
  };

  const loadMedications = async () => {
    if (!requireTokenGuard()) return;
    setMedicationsLoading(true);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "200" });
      const data = await fetchJson(`${API.medications}?${qs.toString()}`, {
        token,
      });
      setMedications(data.data || []);
    } catch {
      setMedications([]);
    } finally {
      setMedicationsLoading(false);
    }
  };

  const openLabDialog = async () => {
    if (!isAssignedDoctor(consView)) {
      Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the doctor assigned to this appointment can initiate lab tests for this consultation.",
      });
      return;
    }
    setSelectedLabTests([]);
    setLabOpen(true);
    if (labTests.length === 0) await loadLabTests();
  };

  const createLabOrder = async () => {
    if (!requireTokenGuard()) return;
    if (!consView?.id) return;
    const appt = consView?.appointment;
    const patientId = appt?.patient?.id;
    if (!patientId)
      return Swal.fire({
        icon: "warning",
        title: "Missing patient",
        text: "Patient not found on this consultation.",
      });
    if (!selectedLabTests.length)
      return Swal.fire({
        icon: "warning",
        title: "Select tests",
        text: "Choose at least one lab test.",
      });

    setLabSaving(true);
    try {
      await fetchJson(API.labOrders, {
        method: "POST",
        token,
        body: {
          patient_id: patientId,
          consultation_id: consView.id,
          items: selectedLabTests.map((t) => ({ lab_test_id: t.id })),
        },
      });
      Swal.fire({
        icon: "success",
        title: "Lab order created",
        timer: 1000,
        showConfirmButton: false,
      });
      setLabOpen(false);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setLabSaving(false);
    }
  };

  const openRxDialog = async () => {
    if (!isAssignedDoctor(consView)) {
      Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the doctor assigned to this appointment can prescribe for this consultation.",
      });
      return;
    }
    setRxItems([{ medication: null, dosage: "", frequency: "", duration: "", quantity: 1 }]);
    setRxOpen(true);
    if (medications.length === 0) await loadMedications();
  };

  const createPrescription = async () => {
    if (!requireTokenGuard()) return;
    if (!consView?.id) return;
    const appt = consView?.appointment;
    const patientId = appt?.patient?.id;
    if (!patientId)
      return Swal.fire({
        icon: "warning",
        title: "Missing patient",
        text: "Patient not found on this consultation.",
      });

    const items = rxItems
      .filter((i) => i.medication?.id)
      .map((i) => ({
        medication_id: i.medication.id,
        dosage: i.dosage || null,
        frequency: i.frequency || null,
        duration: i.duration || null,
        quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
      }));
    if (!items.length)
      return Swal.fire({
        icon: "warning",
        title: "Add medications",
        text: "Choose at least one medication.",
      });

    setRxSaving(true);
    try {
      await fetchJson(API.prescriptions, {
        method: "POST",
        token,
        body: {
          patient_id: patientId,
          consultation_id: consView.id,
          items,
        },
      });
      Swal.fire({
        icon: "success",
        title: "Prescription created",
        timer: 1000,
        showConfirmButton: false,
      });
      setRxOpen(false);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setRxSaving(false);
    }
  };

  const openAdmitDialog = async () => {
    if (!consView?.appointment) return;
    setAdmitOpen(true);
    setAdmitBedId("");
    setAdmitBedsLoading(true);
    try {
      const [bedsRes, wardsRes] = await Promise.all([
        fetchJson(`${API.beds}?limit=500`, { token }),
        fetchJson(`${API.wards}?limit=500`, { token }),
      ]);
      const beds = bedsRes?.data || [];
      setAvailableBeds(beds.filter((b) => b.status === "available"));
      setWardOptions(wardsRes?.data || []);
    } catch (e) {
      setAvailableBeds([]);
      setWardOptions([]);
      Swal.fire({ icon: "error", title: "Failed to load beds", text: e.message });
    } finally {
      setAdmitBedsLoading(false);
    }
  };

  const bedLabel = (b) => {
    if (!b) return "—";
    const wn = b.ward?.name ?? wardOptions.find((w) => w.id === b.ward_id)?.name ?? "";
    return wn ? `${b.bed_number} (${wn})` : b.bed_number;
  };

  const createAdmission = async () => {
    if (!consView?.appointment || !admitBedId) {
      Swal.fire({ icon: "warning", title: "Select bed", text: "Choose an available bed to admit the patient." });
      return;
    }
    const appt = consView.appointment;
    const patientId = appt.patient?.id;
    const doctorId = appt.doctor?.id;
    if (!patientId || !doctorId) {
      Swal.fire({ icon: "warning", title: "Missing data", text: "Patient or doctor not found on this consultation." });
      return;
    }
    setAdmitSaving(true);
    try {
      await fetchJson(`${API.admissions}/admit`, {
        method: "POST",
        token,
        body: {
          appointment_id: appt.id,
          patient_id: patientId,
          doctor_id: doctorId,
          bed_id: admitBedId,
        },
      });
      Swal.fire({ icon: "success", title: "Patient admitted", timer: 1200, showConfirmButton: false });
      setAdmitOpen(false);
      setConsViewHasAdmission(true);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Admit failed", text: e.message });
    } finally {
      setAdmitSaving(false);
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
            <Box sx={{ minWidth: 0, maxWidth: { md: "58%", lg: "65%", xl: "70%" } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EventNoteIcon />
                <Typography
                  variant="h5"
                  noWrap
                  sx={{
                    fontWeight: 800,
                    fontSize: "clamp(1.05rem, 2.1vw, 1.5rem)",
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Appointments & Consultations
                </Typography>
              </Stack>
              <Typography
                noWrap
                sx={{
                  opacity: 0.9,
                  mt: 0.5,
                  fontSize: "clamp(0.75rem, 1.4vw, 0.95rem)",
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Book appointments, support walk-ins, and record consultations.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "flex-end" }, flexShrink: 0 }}>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => {
                    loadAppointments();
                    loadConsultations();
                    if (tab === 2) loadMainBills();
                    if (tab === 3) loadMainPayments();
                  }}
                  sx={{
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateAppointment}
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "clamp(0.72rem, 1.1vw, 0.9rem)",
                  whiteSpace: "nowrap",
                  border: "1px solid rgba(255,255,255,0.25)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                }}
              >
                New Appointment
              </Button>
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
              icon={<EventNoteIcon />}
              iconPosition="start"
              label="Appointments"
            />
            <Tab
              icon={<NoteAddIcon />}
              iconPosition="start"
              label="Consultations"
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

          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  value={apptSearch}
                  onChange={(e) => setApptSearch(e.target.value)}
                  placeholder="Search appointments (patient name/email/phone)…"
                  size="small"
                  fullWidth
                  name="appt_search"
                  type="search"
                  autoComplete="off"
                  onFocus={() => setApptSearchLocked(false)}
                  onClick={() => setApptSearchLocked(false)}
                  InputProps={{ readOnly: apptSearchLocked }}
                  inputProps={{
                    autoComplete: "off",
                    "data-lpignore": "true",
                    "data-1p-ignore": "true",
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">pending</MenuItem>
                    <MenuItem value="confirmed">confirmed</MenuItem>
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
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {apptLoading ? (
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
                              Loading appointments…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : appointments.length ? (
                      appointments.map((a, idx) => (
                        <TableRow key={a.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {apptPage * apptRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDateTime(a.appointment_date)}
                          </TableCell>
                          <TableCell>
                            {a.patient?.full_name ||
                              a.patient?.user?.full_name ||
                              "—"}
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block" }}
                            >
                              {a.patient?.phone ||
                                a.patient?.email ||
                                a.patient?.user?.phone ||
                                a.patient?.user?.email ||
                                ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {a.doctor?.user?.full_name ||
                              a.doctor?.staff_type ||
                              "—"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={a.status}
                              color={
                                a.status === "confirmed"
                                  ? "success"
                                  : a.status === "cancelled"
                                    ? "error"
                                    : "default"
                              }
                              variant={
                                a.status === "confirmed" ? "filled" : "outlined"
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton
                                onClick={() => openViewAppointment(a)}
                                size="small"
                              >
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip
                              title={
                                a.status !== "confirmed" && a.status !== "completed"
                                  ? "Payment required before consultation"
                                  : "Record consultation"
                              }
                            >
                              <span>
                                <IconButton
                                  onClick={() => openRecordConsultation(a)}
                                  size="small"
                                  disabled={
                                    !isAssignedDoctor(a) ||
                                    (a.status !== "confirmed" && a.status !== "completed")
                                  }
                                >
                                  <NoteAddIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title="Delete">
                                <IconButton
                                  onClick={() => deleteAppointment(a)}
                                  size="small"
                                  color="error"
                                >
                                  <DeleteIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No appointments found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={apptTotal}
                page={apptPage}
                onPageChange={(_, p) => setApptPage(p)}
                rowsPerPage={apptRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setApptRowsPerPage(parseInt(e.target.value, 10));
                  setApptPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <TextField
                value={consSearch}
                onChange={(e) => setConsSearch(e.target.value)}
                placeholder="Search consultations (patient, symptoms, diagnosis)…"
                size="small"
                fullWidth
                name="cons_search"
                type="search"
                autoComplete="off"
                onFocus={() => setConsSearchLocked(false)}
                onClick={() => setConsSearchLocked(false)}
                InputProps={{ readOnly: consSearchLocked }}
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
                      <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Diagnosis</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consLoading ? (
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
                              Loading consultations…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : consultations.length ? (
                      consultations.map((c, idx) => (
                        <TableRow key={c.id} hover>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {consPage * consRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDateTime(c.createdAt)}
                          </TableCell>
                          <TableCell>
                            {c.appointment?.patient?.full_name ||
                              c.appointment?.patient?.user?.full_name ||
                              "—"}
                          </TableCell>
                          <TableCell>
                            {c.appointment?.doctor?.user?.full_name || "—"}
                          </TableCell>
                          <TableCell>
                            {c.diagnosis
                              ? String(c.diagnosis).slice(0, 32)
                              : "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton
                                onClick={() => navigate("/appointments/consultation/" + c.id)}
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
                        <TableCell colSpan={6}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No consultations found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={consTotal}
                page={consPage}
                onPageChange={(_, p) => setConsPage(p)}
                rowsPerPage={consRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setConsRowsPerPage(parseInt(e.target.value, 10));
                  setConsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Bills for appointments only.
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
                    {mainBillsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 4 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading bills…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : mainBills.length ? (
                      mainBills.map((b, idx) => {
                        const patientName = b?.patient?.full_name || b?.patient?.user?.full_name || "—";
                        const total = Number(b?.total_amount ?? 0);
                        const paidAmt = Number(b?.paid_amount ?? 0);
                        const balance = Math.max(0, total - paidAmt);
                        const status = b?.paid ? "paid" : (b?.status || "unpaid");
                        return (
                          <TableRow key={b.id} hover>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                              {mainBillsPage * mainBillsRowsPerPage + idx + 1}
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
                              <Button size="small" variant="outlined" onClick={() => openMainBillView(b.id)}>View</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography sx={{ py: 2 }} color="text.secondary">No appointment bills yet.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={mainBillsTotal}
                page={mainBillsPage}
                onPageChange={(_, p) => setMainBillsPage(p)}
                rowsPerPage={mainBillsRowsPerPage}
                onRowsPerPageChange={(e) => { setMainBillsRowsPerPage(parseInt(e.target.value, 10)); setMainBillsPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Payments recorded for appointment bills.
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
                    {mainPaymentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 4 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading payments…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : mainPayments.length ? (
                      mainPayments.map((p, idx) => {
                        const patientName = p?.bill?.patient?.full_name || p?.bill?.patient?.user?.full_name || "—";
                        return (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                              {mainPaymentsPage * mainPaymentsRowsPerPage + idx + 1}
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
                          <Typography sx={{ py: 2 }} color="text.secondary">No payments for appointments yet. Record payment from the Billing tab.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={mainPaymentsTotal}
                page={mainPaymentsPage}
                onPageChange={(_, p) => setMainPaymentsPage(p)}
                rowsPerPage={mainPaymentsRowsPerPage}
                onRowsPerPageChange={(e) => { setMainPaymentsRowsPerPage(parseInt(e.target.value, 10)); setMainPaymentsPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Appointment bill view */}
      <Dialog
        open={mainBillView.open}
        onClose={() => setMainBillView({ open: false, bill: null, loading: false })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Appointment bill</DialogTitle>
        <DialogContent dividers>
          {mainBillView.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : mainBillView.bill ? (
            <Stack spacing={2}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Bill #{mainBillView.bill.id?.slice(0, 8)}</Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  Patient: {mainBillView.bill.patient?.full_name || mainBillView.bill.patient?.user?.full_name || "—"}
                </Typography>
                <Typography>
                  Total: {Number(mainBillView.bill.total_amount ?? 0).toFixed(2)} • Paid: {Number(mainBillView.bill.paid_amount ?? 0).toFixed(2)} • Balance: {Number(mainBillView.bill.balance ?? 0).toFixed(2)}
                </Typography>
                <Chip
                  size="small"
                  label={mainBillView.bill.paid ? "paid" : (mainBillView.bill.status || "unpaid")}
                  color={mainBillView.bill.paid ? "success" : "default"}
                  sx={{ mt: 0.5 }}
                />
              </Box>
              {Array.isArray(mainBillView.bill.items) && mainBillView.bill.items.length > 0 && (
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5 }}>Breakdown</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mainBillView.bill.items.map((it, idx) => {
                        const label = it.item_type === "appointment"
                          ? "Appointment fee"
                          : it.item_type === "service" && it.reference_id
                            ? `Extra: ${it.reference_id}`
                            : it.item_type === "service"
                              ? "Extra charge"
                              : it.item_type === "lab_order"
                                ? "Lab order"
                                : it.item_type === "prescription"
                                  ? "Prescription"
                                  : it.item_type || "Item";
                        return (
                          <TableRow key={it.id || idx}>
                            <TableCell>{label}</TableCell>
                            <TableCell align="right">{Number(it.amount ?? 0).toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMainBillView({ open: false, bill: null, loading: false })}>Close</Button>
        </DialogActions>
      </Dialog>

      <ReceiptDialog
        open={!!receiptDialogPaymentId}
        onClose={() => setReceiptDialogPaymentId(null)}
        paymentId={receiptDialogPaymentId}
        getToken={getToken}
      />

      {/* Create appointment */}
      <Dialog
        open={createApptOpen}
        onClose={() => setCreateApptOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>New Appointment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={walkIn}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setWalkIn(checked);
                    if (checked) {
                      const price = selectedService?.price;
                      setBillAmount(price != null && price !== "" ? String(price) : "0");
                    }
                  }}
                />
              }
              label="Walk-in (auto-create bill; confirmation after payment)"
            />

            <Autocomplete
              options={patientOptions}
              value={selectedPatient}
              onChange={(_, v) => setSelectedPatient(v)}
              loading={patientLoading}
              getOptionLabel={(p) =>
                `${p.full_name || p.user?.full_name || "—"} • ${p.phone || p.email || p.user?.phone || p.user?.email || ""}`
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onInputChange={(_, v) => searchPatients(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Patient"
                  placeholder="Search patient…"
                />
              )}
            />

            <Autocomplete
              options={doctorOptions}
              value={selectedDoctor}
              onChange={(_, v) => setSelectedDoctor(v)}
              loading={doctorLoading}
              getOptionLabel={(d) =>
                `${d.user?.full_name || "—"} • ${d.staff_type || "staff"}${d.specialization ? ` • ${d.specialization}` : ""}`
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onInputChange={(_, v) => searchDoctors(v, appointmentDate || undefined)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Staff"
                  placeholder={appointmentDate ? "Staff available at selected date & time" : "Select date & time first, or search…"}
                />
              )}
            />

            <Autocomplete
              options={serviceOptions}
              value={selectedService}
              onChange={(_, v) => {
                setSelectedService(v);
                if (walkIn) {
                  const price = v?.price;
                  setBillAmount(price != null && price !== "" ? String(price) : "0");
                }
              }}
              loading={serviceLoading}
              getOptionLabel={(s) =>
                `${s.name || "—"}${s.department?.name ? ` • ${s.department.name}` : ""}${s.price != null && s.price !== "" ? ` • ${s.price}` : ""}`
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onInputChange={(_, v) => searchServices(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Service (optional)"
                  placeholder="Search service…"
                />
              )}
            />

            {walkIn && (
              <TextField
                label="Amount to bill"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                inputMode="decimal"
                helperText="This amount will be used to create the unpaid bill for this walk-in appointment."
                fullWidth
              />
            )}

            <TextField
              label="Appointment date & time"
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => {
                const next = e.target.value;
                setAppointmentDate(next);
                if (next) searchDoctors("", next);
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText="Staff list shows only those with a schedule at this time."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateApptOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createAppointment}
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Appointment view + status + Billing tab */}
      <Dialog
        open={apptViewOpen}
        onClose={() => setApptViewOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Appointment</DialogTitle>
        <DialogContent dividers>
          {apptViewLoading ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ py: 2 }}
            >
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : !apptView ? (
            <Typography color="text.secondary">No data.</Typography>
          ) : (
            <>
              <Tabs
                value={apptViewInnerTab}
                onChange={(_, v) => setApptViewInnerTab(v)}
                sx={{
                  mb: 2,
                  minHeight: 40,
                  "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main },
                }}
              >
                <Tab icon={<EventNoteIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Details" />
                <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Billing & payment" />
              </Tabs>

              {apptViewInnerTab === 0 && (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {!isAdmin && !isAssignedDoctor(apptView) && (
                    <Alert severity="info">
                      You can view this appointment, but only the assigned doctor (or admin) can update its status.
                    </Alert>
                  )}
                  <Typography sx={{ fontWeight: 900 }}>
                    {apptView.patient?.full_name || apptView.patient?.user?.full_name || "Patient"} • {formatDateTime(apptView.appointment_date)}
                  </Typography>
                  <Typography color="text.secondary">
                    Doctor: {apptView.doctor?.user?.full_name || apptView.doctor?.staff_type || "—"}
                  </Typography>
                  <Typography color="text.secondary">
                    Service: {apptView.service?.name || "—"}
                    {apptView.service?.price != null && apptView.service?.price !== "" ? ` • ${apptView.service.price}` : ""}
                  </Typography>
                  <FormControl
                    fullWidth
                    size="small"
                    disabled={["completed", "cancelled"].includes(apptView.status) || (!isAdmin && !isAssignedDoctor(apptView))}
                  >
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={apptStatusDraft || apptView.status}
                      onChange={(e) => setApptStatusDraft(e.target.value)}
                    >
                      {[apptView.status, ...allowedNextStatuses(apptView.status)]
                        .filter(Boolean)
                        .filter((v, i, arr) => arr.indexOf(v) === i)
                        .map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  {["completed", "cancelled"].includes(apptView.status) && (
                    <Alert severity="info">This appointment is {apptView.status} and cannot be changed.</Alert>
                  )}
                </Stack>
              )}

              {apptViewInnerTab === 1 && (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bill and payment for this appointment. Record payment and add charges here.
                  </Typography>
                  {apptBillingLoading ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                      <CircularProgress size={18} />
                      <Typography color="text.secondary">Loading billing…</Typography>
                    </Stack>
                  ) : !apptBilling?.bill_id ? (
                    <Stack spacing={1.5}>
                      <Alert severity="info">
                        No bill for this appointment yet. Walk-in appointments get a bill when created; otherwise create one below.
                      </Alert>
                      <Button
                        variant="contained"
                        onClick={createBillForAppointment}
                        disabled={!(apptView?.patient?.id || apptView?.patient_id)}
                        startIcon={<ReceiptIcon />}
                        sx={{ fontWeight: 800 }}
                      >
                        Create bill for this appointment
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" color="text.secondary">Bill #{apptBilling.bill_id}</Typography>
                          <Typography sx={{ fontWeight: 800 }}>
                            Total: {Number(apptBilling.total_amount ?? 0).toFixed(2)} • Paid: {Number(apptBilling.paid_amount ?? 0).toFixed(2)} • Balance: {Number(apptBilling.balance ?? 0).toFixed(2)}
                          </Typography>
                          <Chip
                            size="small"
                            label={apptBilling.status || "unpaid"}
                            color={apptBilling.status === "paid" ? "success" : apptBilling.status === "partial" ? "warning" : "default"}
                            sx={{ alignSelf: "flex-start", mt: 0.5 }}
                          />
                        </Stack>
                      </Box>

                      {Array.isArray(apptBilling.items) && apptBilling.items.length > 0 && (
                        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5 }}>Breakdown</Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {apptBilling.items.map((it, idx) => {
                                const label = it.item_type === "appointment"
                                  ? "Appointment fee"
                                  : it.item_type === "service" && it.reference_id
                                    ? `Extra: ${it.reference_id}`
                                    : it.item_type === "service"
                                      ? "Extra charge"
                                      : it.item_type === "lab_order"
                                        ? "Lab order"
                                        : it.item_type === "prescription"
                                          ? "Prescription"
                                          : it.item_type || "Item";
                                return (
                                  <TableRow key={it.id || idx}>
                                    <TableCell>{label}</TableCell>
                                    <TableCell align="right">{Number(it.amount ?? 0).toFixed(2)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      )}

                      {apptBilling.status !== "paid" && Number(apptBilling.balance ?? 0) > 0 && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ flexWrap: "wrap" }}>
                          <TextField
                            size="small"
                            label="Amount"
                            type="number"
                            value={apptBillItemAmount}
                            onChange={(e) => setApptBillItemAmount(e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: { xs: "100%", sm: 130 } }}
                          />
                          <TextField
                            size="small"
                            label="Note (optional)"
                            placeholder="e.g. extra service"
                            value={apptBillItemNote}
                            onChange={(e) => setApptBillItemNote(e.target.value)}
                            sx={{ flex: { xs: "none", sm: "1 1 180px" }, minWidth: 0 }}
                          />
                          <Button
                            variant="outlined"
                            onClick={addAppointmentBillItem}
                            disabled={apptBillItemSaving}
                            sx={{ fontWeight: 800, flexShrink: 0 }}
                          >
                            {apptBillItemSaving ? "Adding…" : "Add billing item"}
                          </Button>
                        </Stack>
                      )}

                      {(apptBilling.status !== "paid" || Number(apptBilling.balance ?? 0) > 0) && (
                        <Button
                          variant="contained"
                          startIcon={<PaymentIcon />}
                          onClick={async () => {
                            const paid = await payForAppointment(apptView);
                            if (paid && apptView?.id) {
                              await loadAppointments();
                              setApptViewOpen(false);
                            }
                          }}
                          sx={{ fontWeight: 800 }}
                        >
                          Record payment
                        </Button>
                      )}
                    </>
                  )}
                </Stack>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setApptViewOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={saveAppointmentStatus}
            disabled={
              apptViewLoading ||
              !apptView ||
              apptStatusSaving ||
              ["completed", "cancelled"].includes(apptView?.status) ||
              (!isAdmin && !isAssignedDoctor(apptView))
            }
            sx={{ fontWeight: 900 }}
          >
            {apptStatusSaving ? "Saving…" : "Update status"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Consultation view */}
      <Dialog
        open={consViewOpen}
        onClose={() => setConsViewOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Consultation</DialogTitle>
        <DialogContent dividers>
          {consViewLoading ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ py: 2 }}
            >
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : !consView ? (
            <Typography color="text.secondary">No data.</Typography>
          ) : (
            <Stack spacing={2}>
              {!isAssignedDoctor(consView) && (
                <Alert severity="info">
                  You can view this consultation, but only the doctor assigned to this appointment
                  can update it, prescribe, initiate lab tests, or admit patient.
                </Alert>
              )}
              <Typography sx={{ fontWeight: 900 }}>
                {consView.appointment?.patient?.full_name ||
                  consView.appointment?.patient?.user?.full_name ||
                  "Patient"}{" "}
                • {formatDateTime(consView.createdAt)}
              </Typography>
              <Typography color="text.secondary">
                Doctor: {consView.appointment?.doctor?.user?.full_name || "—"}
              </Typography>

              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                  Symptoms
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-wrap" }}
                >
                  {consView.symptoms || "—"}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                  Diagnosis
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-wrap" }}
                >
                  {consView.diagnosis || "—"}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Notes</Typography>
                <Typography
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-wrap" }}
                >
                  {consView.notes || "—"}
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap">
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={openEditConsultation}
                  disabled={!isAssignedDoctor(consView)}
                >
                  Update consultation
                </Button>
                <Button
                  startIcon={<ScienceIcon />}
                  variant="outlined"
                  onClick={openLabDialog}
                  disabled={!isAssignedDoctor(consView)}
                >
                  Initiate lab test
                </Button>
                <Button
                  startIcon={<PharmacyIcon />}
                  variant="outlined"
                  onClick={openRxDialog}
                  disabled={!isAssignedDoctor(consView)}
                >
                  Prescribe
                </Button>
                <Button
                  startIcon={<AdmitIcon />}
                  variant="outlined"
                  onClick={openAdmitDialog}
                  disabled={!isAssignedDoctor(consView) || consViewHasAdmission}
                >
                  {consViewHasAdmission ? "Already admitted" : "Admit patient"}
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setConsViewOpen(false)}
            sx={{ fontWeight: 900 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit consultation */}
      <Dialog
        open={consEditOpen}
        onClose={() => setConsEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Update Consultation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Symptoms"
              fullWidth
              multiline
              minRows={2}
              value={consEditForm.symptoms}
              onChange={(e) =>
                setConsEditForm((p) => ({ ...p, symptoms: e.target.value }))
              }
            />
            <TextField
              label="Diagnosis"
              fullWidth
              multiline
              minRows={2}
              value={consEditForm.diagnosis}
              onChange={(e) =>
                setConsEditForm((p) => ({ ...p, diagnosis: e.target.value }))
              }
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              value={consEditForm.notes}
              onChange={(e) =>
                setConsEditForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConsEditOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveConsultationEdits}
            disabled={consEditSaving}
            sx={{ fontWeight: 900 }}
          >
            {consEditSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lab order */}
      <Dialog
        open={labOpen}
        onClose={() => setLabOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Initiate Lab Test</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {labTestsLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography color="text.secondary">
                  Loading lab tests…
                </Typography>
              </Stack>
            ) : null}
            <Autocomplete
              multiple
              options={labTests}
              value={selectedLabTests}
              onChange={(_, v) => setSelectedLabTests(v)}
              getOptionLabel={(t) =>
                `${t.test_name || "Test"}${t.test_code ? ` (${t.test_code})` : ""}`
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Lab tests"
                  placeholder="Select tests…"
                />
              )}
            />
            <Alert severity="info">
              This creates a lab order linked to the consultation.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setLabOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createLabOrder}
            disabled={labSaving}
            sx={{ fontWeight: 900 }}
          >
            {labSaving ? "Creating…" : "Create lab order"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prescription */}
      <Dialog
        open={rxOpen}
        onClose={() => setRxOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Prescription</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {medicationsLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography color="text.secondary">
                  Loading medications…
                </Typography>
              </Stack>
            ) : null}

            {rxItems.map((it, idx) => (
              <Box
                key={idx}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Stack spacing={1.5}>
                  <Autocomplete
                    options={medications}
                    value={it.medication}
                    onChange={(_, v) =>
                      setRxItems((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, medication: v } : p,
                        ),
                      )
                    }
                    getOptionLabel={(m) => m?.name || "—"}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Medication"
                        placeholder="Select medication…"
                      />
                    )}
                  />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <TextField
                      label="Dosage (optional)"
                      fullWidth
                      value={it.dosage}
                      onChange={(e) =>
                        setRxItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, dosage: e.target.value } : p,
                          ),
                        )
                      }
                    />
                    <TextField
                      label="Frequency (optional)"
                      fullWidth
                      value={it.frequency}
                      onChange={(e) =>
                        setRxItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, frequency: e.target.value } : p,
                          ),
                        )
                      }
                    />
                    <TextField
                      label="Duration (optional)"
                      fullWidth
                      value={it.duration}
                      onChange={(e) =>
                        setRxItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, duration: e.target.value } : p,
                          ),
                        )
                      }
                    />
                    <TextField
                      label="Quantity"
                      type="number"
                      inputProps={{ min: 1, step: 1 }}
                      value={it.quantity ?? 1}
                      onChange={(e) =>
                        setRxItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, quantity: e.target.value } : p,
                          ),
                        )
                      }
                      sx={{ minWidth: 100 }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() =>
                        setRxItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      disabled={rxItems.length === 1}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}

            <Button
              variant="outlined"
              onClick={() =>
                setRxItems((p) => [
                  ...p,
                  { medication: null, dosage: "", frequency: "", duration: "", quantity: 1 },
                ])
              }
            >
              Add medication
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setRxOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createPrescription}
            disabled={rxSaving}
            sx={{ fontWeight: 900 }}
          >
            {rxSaving ? "Creating…" : "Create prescription"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admit patient (from consultation) */}
      <Dialog
        open={admitOpen}
        onClose={() => setAdmitOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Admit Patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {admitBedsLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography color="text.secondary">Loading available beds…</Typography>
              </Stack>
            ) : (
              <>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Bed (available only)</InputLabel>
                  <Select
                    value={admitBedId}
                    label="Bed (available only)"
                    onChange={(e) => setAdmitBedId(e.target.value)}
                  >
                    <MenuItem value="">Select bed</MenuItem>
                    {availableBeds.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {bedLabel(b)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {availableBeds.length === 0 && (
                  <Alert severity="info">No available beds. Add beds in Ward & Admissions.</Alert>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setAdmitOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createAdmission}
            disabled={admitSaving || !admitBedId || admitBedsLoading}
            sx={{ fontWeight: 900 }}
          >
            {admitSaving ? "Admitting…" : "Admit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
