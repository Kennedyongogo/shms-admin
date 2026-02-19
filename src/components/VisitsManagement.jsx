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
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

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
  const location = useLocation();
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

  const [tab, setTab] = useState(0); // 0 appointments, 1 consultations

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

  // Create appointment dialog (walk-in supported)
  const [createApptOpen, setCreateApptOpen] = useState(false);
  const [walkIn, setWalkIn] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
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

  // Record consultation dialog
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForAppointment, setRecordForAppointment] = useState(null);
  const [recordForm, setRecordForm] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
  });

  // Appointment view/status dialog
  const [apptViewOpen, setApptViewOpen] = useState(false);
  const [apptViewLoading, setApptViewLoading] = useState(false);
  const [apptView, setApptView] = useState(null);
  const [apptStatusDraft, setApptStatusDraft] = useState("");
  const [apptStatusSaving, setApptStatusSaving] = useState(false);
  const [apptBilling, setApptBilling] = useState(null);
  const [apptBillingLoading, setApptBillingLoading] = useState(false);

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
    { medication: null, dosage: "", frequency: "", duration: "" },
  ]);

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

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptPage, apptRowsPerPage, statusFilter]);

  useEffect(() => {
    loadConsultations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consPage, consRowsPerPage]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (apptPage !== 0) setApptPage(0);
      else loadAppointments();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (consPage !== 0) setConsPage(0);
      else loadConsultations();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consSearch]);

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

  const searchDoctors = async (q) => {
    if (!requireTokenGuard()) return;
    setDoctorLoading(true);
    try {
      const qs = new URLSearchParams({
        page: "1",
        limit: "10",
        ...(q ? { search: q } : {}),
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

  const openCreateWalkInPatientPage = () => {
    if (!isAdmin) {
      Swal.fire({
        icon: "info",
        title: "Admins only",
        text: "Only admins can create walk-in patients.",
      });
      return;
    }
    navigate("/appointments/walk-in-patient");
  };

  const openCreateAppointment = () => {
    setApptSearchLocked(true);
    setConsSearchLocked(true);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedService(null);
    setWalkIn(true);
    setAppointmentDate(toLocalDateTimeInputValue());
    setCreateApptOpen(true);
    searchPatients("");
    searchDoctors("");
    searchServices("");
  };

  useEffect(() => {
    const pid = location?.state?.preselectPatientId;
    if (!pid) return;
    (async () => {
      try {
        const data = await fetchJson(`${API.patients}/${pid}`, { token });
        const patient = data?.data || null;
        setApptSearchLocked(true);
        setConsSearchLocked(true);
        setWalkIn(true);
        setAppointmentDate(toLocalDateTimeInputValue());
        setCreateApptOpen(true);
        setSelectedDoctor(null);
        setSelectedPatient(patient);
        await searchPatients("");
        await searchDoctors("");
      } catch (e) {
        Swal.fire({ icon: "error", title: "Failed", text: e.message });
      } finally {
        navigate("/appointments", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state?.preselectPatientId]);

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

    const payload = {
      patient_id: selectedPatient.id,
      doctor_id: selectedDoctor.id,
      service_id: selectedService?.id ?? null,
      appointment_date: new Date(appointmentDate).toISOString(),
      created_by: currentUser?.id ?? null,
    };

    try {
      const created = await fetchJson(API.appointments, {
        method: "POST",
        token,
        body: payload,
      });
      const appt = created.data;

      setCreateApptOpen(false);
      if (walkIn && appt?.id) {
        const full = await fetchJson(`${API.appointments}/${appt.id}`, {
          token,
        });
        const payNow = await Swal.fire({
          icon: "info",
          title: "Payment required",
          text: "Walk-in appointments must be paid before they can be confirmed. Do you want to take payment now?",
          showCancelButton: true,
          confirmButtonText: "Pay now",
          cancelButtonText: "Later",
          reverseButtons: true,
        });
        if (payNow.isConfirmed) {
          const paid = await payForAppointment(full.data);
          if (paid) {
            await fetchJson(`${API.appointments}/${appt.id}/confirm`, {
              method: "PATCH",
              token,
            });
            const result = await Swal.fire({
              icon: "success",
              title: "Walk-in appointment confirmed",
              text: "Do you want to record the consultation now?",
              showCancelButton: true,
              confirmButtonText: "Record now",
              cancelButtonText: "Later",
              reverseButtons: true,
            });
            if (result.isConfirmed) {
              const refreshed = await fetchJson(
                `${API.appointments}/${appt.id}`,
                { token },
              );
              openRecordConsultation(refreshed.data);
            }
          }
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
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
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
      await fetchJson(`${API.appointments}/${appt.id}`, {
        method: "DELETE",
        token,
      });
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Appointment deleted.",
      });
      await loadAppointments();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const openRecordConsultation = async (appt) => {
    if (!requireTokenGuard()) return;
    if (!appt?.id) return;
    if (!isAdmin && !isAssignedDoctor(appt)) {
      Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the assigned doctor (or admin) can record a consultation.",
      });
      return;
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
        openViewConsultation({ id: c.id });
        return;
      }
    } catch (e) {
      // 404 means no consultation yet; proceed. Any other error should stop.
      if (e?.status && Number(e.status) !== 404) {
        Swal.fire({ icon: "error", title: "Failed", text: e.message });
        return;
      }
    }

    setRecordForAppointment(appt);
    setRecordForm({ symptoms: "", diagnosis: "", notes: "" });
    setRecordOpen(true);
  };

  const openViewAppointment = async (appt) => {
    if (!requireTokenGuard()) return;
    setApptViewOpen(true);
    setApptViewLoading(true);
    setApptView(null);
    setApptStatusDraft("");
    setApptBilling(null);
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
    if (current === "pending") return ["confirmed", "cancelled"];
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

    if (
      (apptStatusDraft === "confirmed" || apptStatusDraft === "completed") &&
      !apptBilling?.paid
    ) {
      const ask = await Swal.fire({
        icon: "warning",
        title: "Payment required",
        text: "You must record payment before confirming/completing this appointment.",
        showCancelButton: true,
        confirmButtonText: "Pay now",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });
      if (ask.isConfirmed) {
        await payForAppointment(apptView);
        await loadAppointmentBilling(apptView.id);
      }
      return;
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
        const ask = await Swal.fire({
          icon: "warning",
          title: "Payment required",
          text: e.message,
          showCancelButton: true,
          confirmButtonText: "Pay now",
          cancelButtonText: "Cancel",
          reverseButtons: true,
        });
        if (ask.isConfirmed) {
          await payForAppointment(apptView);
          await loadAppointmentBilling(apptView.id);
        }
        return;
      }
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setApptStatusSaving(false);
    }
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

  const payForAppointment = async (appt) => {
    if (!requireTokenGuard()) return false;
    if (!appt?.id) return false;
    const patientId = appt?.patient?.id || appt?.patient_id;
    if (!patientId) {
      Swal.fire({
        icon: "error",
        title: "Missing patient",
        text: "Cannot generate a bill without patient_id.",
      });
      return false;
    }

    const defaultAmount =
      appt?.service?.price != null && appt?.service?.price !== ""
        ? String(appt.service.price)
        : "0";
    const ask = await Swal.fire({
      icon: "question",
      title: "Take payment (test)",
      input: "text",
      inputLabel: "Amount to charge",
      inputValue: defaultAmount,
      showCancelButton: true,
      confirmButtonText: "Pay",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      inputValidator: (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) return "Enter a valid amount";
        return undefined;
      },
    });
    if (!ask.isConfirmed) return false;
    const amount = Number(ask.value);

    try {
      const billRes = await fetchJson(`${API.billing}/generate`, {
        method: "POST",
        token,
        body: { patient_id: patientId, consultation_id: null },
      });
      const billId = billRes?.data?.id;
      await fetchJson(`${API.billing}/${billId}/items`, {
        method: "POST",
        token,
        body: {
          items: [{ item_type: "appointment", reference_id: appt.id, amount }],
        },
      });
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: billId,
          amount_paid: amount,
          payment_method: "cash",
          payment_date: new Date().toISOString(),
        },
      });
      await loadAppointmentBilling(appt.id);
      Swal.fire({
        icon: "success",
        title: "Paid",
        text: "Payment recorded (test).",
      });
      return true;
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e.message });
      return false;
    }
  };

  const openViewConsultation = async (c) => {
    if (!requireTokenGuard()) return;
    setConsViewOpen(true);
    setConsViewLoading(true);
    setConsView(null);
    try {
      const data = await fetchJson(`${API.consultations}/${c.id}`, { token });
      setConsView(data?.data || null);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
      setConsViewOpen(false);
    } finally {
      setConsViewLoading(false);
    }
  };

  const openEditConsultation = () => {
    if (!consView?.id) return;
    if (!isAdmin && !isAssignedDoctor(consView)) {
      return Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the assigned doctor (or admin) can update this consultation.",
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
    if (!isAdmin && !isAssignedDoctor(consView)) {
      Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the assigned doctor (or admin) can initiate lab tests for this consultation.",
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
    if (!isAdmin && !isAssignedDoctor(consView)) {
      Swal.fire({
        icon: "warning",
        title: "Not allowed",
        text: "Only the assigned doctor (or admin) can prescribe for this consultation.",
      });
      return;
    }
    setRxItems([{ medication: null, dosage: "", frequency: "", duration: "" }]);
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

  const recordConsultation = async () => {
    if (!requireTokenGuard()) return;
    if (!recordForAppointment?.id) return;
    try {
      await fetchJson(`${API.consultations}/record`, {
        method: "POST",
        token,
        body: {
          appointment_id: recordForAppointment.id,
          symptoms: recordForm.symptoms || null,
          diagnosis: recordForm.diagnosis || null,
          notes: recordForm.notes || null,
        },
      });
      setRecordOpen(false);
      Swal.fire({
        icon: "success",
        title: "Saved",
        text: "Consultation recorded.",
      });
      await loadConsultations();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
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
                <EventNoteIcon />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Appointments & Consultations
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                Book appointments, support walk-ins, and record consultations.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => {
                    loadAppointments();
                    loadConsultations();
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
                  border: "1px solid rgba(255,255,255,0.25)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                }}
              >
                New Appointment
              </Button>
              {isAdmin && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={openCreateWalkInPatientPage}
                  sx={{
                    borderColor: "rgba(255,255,255,0.55)",
                    color: "white",
                    fontWeight: 800,
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.85)",
                      bgcolor: "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  Create Walk-in Patient
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
              icon={<EventNoteIcon />}
              iconPosition="start"
              label="Appointments"
            />
            <Tab
              icon={<NoteAddIcon />}
              iconPosition="start"
              label="Consultations"
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
                            <Tooltip title="Record consultation">
                              <span>
                                <IconButton
                                  onClick={() => openRecordConsultation(a)}
                                  size="small"
                                  disabled={!isAdmin && !isAssignedDoctor(a)}
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
                                onClick={() => openViewConsultation(c)}
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
        </CardContent>
      </Card>

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
                  onChange={(e) => setWalkIn(e.target.checked)}
                />
              }
              label="Walk-in (create & auto-confirm)"
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
              onInputChange={(_, v) => searchDoctors(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Staff"
                  placeholder="Search staff…"
                />
              )}
            />

            <Autocomplete
              options={serviceOptions}
              value={selectedService}
              onChange={(_, v) => setSelectedService(v)}
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

            <TextField
              label="Appointment date & time"
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
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

      {/* Record consultation */}
      <Dialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Record Consultation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Chip
              label={`Appointment: ${recordForAppointment?.patient?.full_name || recordForAppointment?.patient?.user?.full_name || ""} • ${formatDateTime(
                recordForAppointment?.appointment_date,
              )}`}
              sx={{ bgcolor: "rgba(0, 137, 123, 0.08)", fontWeight: 800 }}
            />
            <TextField
              label="Symptoms"
              value={recordForm.symptoms}
              onChange={(e) =>
                setRecordForm((p) => ({ ...p, symptoms: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Diagnosis"
              value={recordForm.diagnosis}
              onChange={(e) =>
                setRecordForm((p) => ({ ...p, diagnosis: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Notes"
              value={recordForm.notes}
              onChange={(e) =>
                setRecordForm((p) => ({ ...p, notes: e.target.value }))
              }
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={recordConsultation}
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Appointment view + status */}
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
            <Stack spacing={2} sx={{ mt: 1 }}>
              {!isAdmin && !isAssignedDoctor(apptView) && (
                <Alert severity="info">
                  You can view this appointment, but only the assigned doctor
                  (or admin) can update its status.
                </Alert>
              )}
              <Typography sx={{ fontWeight: 900 }}>
                {apptView.patient?.full_name ||
                  apptView.patient?.user?.full_name ||
                  "Patient"}{" "}
                • {formatDateTime(apptView.appointment_date)}
              </Typography>
              <Typography color="text.secondary">
                Doctor:{" "}
                {apptView.doctor?.user?.full_name ||
                  apptView.doctor?.staff_type ||
                  "—"}
              </Typography>
              <Typography color="text.secondary">
                Service: {apptView.service?.name || "—"}
                {apptView.service?.price != null &&
                apptView.service?.price !== ""
                  ? ` • ${apptView.service.price}`
                  : ""}
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
                    {apptBillingLoading ? (
                      <Chip size="small" label="Checking…" />
                    ) : (
                      <Chip
                        size="small"
                        label={
                          apptBilling?.paid
                            ? "paid"
                            : apptBilling?.exists
                              ? apptBilling?.status || "unpaid"
                              : "unbilled"
                        }
                        color={apptBilling?.paid ? "success" : "default"}
                        variant={apptBilling?.paid ? "filled" : "outlined"}
                        sx={{ fontWeight: 800 }}
                      />
                    )}
                  </Stack>
                  <Button
                    variant="outlined"
                    onClick={() => payForAppointment(apptView)}
                    disabled={apptBillingLoading || apptBilling?.paid}
                    sx={{ fontWeight: 900 }}
                  >
                    Pay now (test)
                  </Button>
                </Stack>
                {apptBilling?.exists ? (
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Total: {apptBilling.total_amount} • Paid:{" "}
                    {apptBilling.paid_amount} • Balance: {apptBilling.balance}
                  </Typography>
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    No bill found for this appointment yet.
                  </Typography>
                )}
                {!apptBilling?.paid && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Appointment confirmation/completion is blocked until payment
                    is recorded.
                  </Alert>
                )}
              </Box>

              <FormControl
                fullWidth
                size="small"
                disabled={
                  ["completed", "cancelled"].includes(apptView.status) ||
                  (!isAdmin && !isAssignedDoctor(apptView))
                }
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
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {["completed", "cancelled"].includes(apptView.status) && (
                <Alert severity="info">
                  This appointment is {apptView.status} and cannot be changed.
                </Alert>
              )}
            </Stack>
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
              {!isAdmin && !isAssignedDoctor(consView) && (
                <Alert severity="info">
                  You can view this consultation, but only the assigned doctor
                  (or admin) can update it, prescribe, or initiate lab tests.
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

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={openEditConsultation}
                  disabled={!isAdmin && !isAssignedDoctor(consView)}
                >
                  Update consultation
                </Button>
                <Button
                  startIcon={<ScienceIcon />}
                  variant="outlined"
                  onClick={openLabDialog}
                  disabled={!isAdmin && !isAssignedDoctor(consView)}
                >
                  Initiate lab test
                </Button>
                <Button
                  startIcon={<PharmacyIcon />}
                  variant="outlined"
                  onClick={openRxDialog}
                  disabled={!isAdmin && !isAssignedDoctor(consView)}
                >
                  Prescribe
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
                  { medication: null, dosage: "", frequency: "", duration: "" },
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
    </Box>
  );
}
