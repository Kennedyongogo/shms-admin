import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
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
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocalHospital as LocalHospitalIcon,
  MedicalServices as MedicalServicesIcon,
  Campaign as CampaignIcon,
  Event as EventIcon,
  Article as ArticleIcon,
  PeopleAlt as PeopleAltIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  hospitals: "/api/hospitals",
  staff: "/api/staff",
  users: "/api/users",
  departments: "/api/departments",
  services: "/api/services",
  news: "/api/news",
  events: "/api/events",
  schedules: "/api/schedules",
};

/** Time string "HH:mm" or "HH:mm:ss" to minutes since midnight. "00:00" as end = 1440 (midnight next day). */
const timeToMinutes = (t) => {
  if (!t) return 0;
  const s = String(t).trim();
  const [h, m] = s.split(":").map(Number);
  if (h === 0 && (m || 0) === 0) return 24 * 60; // midnight = end of day
  return (h || 0) * 60 + (m || 0);
};
/** Given today's slots and current time, return { status: 'working'|'later'|'finished'|'none', nextStart?: string }. */
const getScheduleStatus = (todaySlots) => {
  if (!todaySlots?.length) return { status: "none" };
  const now = new Date();
  const currentM = now.getHours() * 60 + now.getMinutes();
  let nextStart = null;
  for (const slot of todaySlots) {
    const startM = timeToMinutes(slot.start_time);
    const endM = timeToMinutes(slot.end_time);
    if (currentM >= startM && currentM < endM) return { status: "working" };
    if (currentM < startM && (nextStart == null || startM < timeToMinutes(nextStart))) nextStart = String(slot.start_time).slice(0, 5);
  }
  if (nextStart != null) return { status: "later", nextStart };
  return { status: "finished" };
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

const buildImageUrl = (relativePath) => {
  if (!relativePath) return "";
  if (String(relativePath).startsWith("http")) return relativePath;
  if (String(relativePath).startsWith("uploads/")) return `/${relativePath}`;
  if (String(relativePath).startsWith("/uploads/")) return relativePath;
  return relativePath;
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

async function fetchMultipart(url, { method = "POST", token, fields = {}, fileFieldName, file } = {}) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v === null) return;
    form.append(k, String(v));
  });
  if (file && fileFieldName) form.append(fileFieldName, file);

  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
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

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);

export default function HospitalsManagement() {
  const theme = useTheme();
  const token = getToken();
  const isAdmin = getRoleName() === "admin";

  const [tab, setTab] = useState(0); // 0 hospital, 1 departments, 2 staff, 3 services, 4 news/events

  // Hospitals list
  const hospitalsReqId = useRef(0);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [hospitalsPage, setHospitalsPage] = useState(0);
  const [hospitalsRowsPerPage, setHospitalsRowsPerPage] = useState(10);
  const [hospitalsTotal, setHospitalsTotal] = useState(0);
  const [hospitalsSearch, setHospitalsSearch] = useState("");
  const [hospitalsSearchLocked, setHospitalsSearchLocked] = useState(true);

  const [hospitalFilter, setHospitalFilter] = useState("");

  // Hospital dialogs
  const [hospitalDialog, setHospitalDialog] = useState({ open: false, mode: "create", id: null });
  const [hospitalForm, setHospitalForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    logoFile: null,
    logoPreview: "",
  });
  const [hospitalView, setHospitalView] = useState({ open: false, hospital: null });

  // Staff list
  const staffReqId = useRef(0);
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffPage, setStaffPage] = useState(0);
  const [staffRowsPerPage, setStaffRowsPerPage] = useState(10);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffSearchLocked, setStaffSearchLocked] = useState(true);

  // Staff dialogs
  const [staffDialog, setStaffDialog] = useState({ open: false, mode: "create", id: null });
  const [staffForm, setStaffForm] = useState({
    user: null,
    hospital: null,
    department: null,
    staff_type: "",
    specialization: "",
    license_number: "",
    hire_date: "",
  });
  const [staffView, setStaffView] = useState({ open: false, staff: null });

  // Staff schedule dialog
  const [scheduleDialog, setScheduleDialog] = useState({ open: false, staff: null });
  const [staffSchedules, setStaffSchedules] = useState([]);
  const [staffSchedulesLoading, setStaffSchedulesLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ day_of_week: 1, start_time: "09:00", end_time: "17:00" });

  // Lookup options
  const [userOptions, setUserOptions] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  // Departments list (tab 2)
  const deptReqId = useRef(0);
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptPage, setDeptPage] = useState(0);
  const [deptRowsPerPage, setDeptRowsPerPage] = useState(10);
  const [deptTotal, setDeptTotal] = useState(0);
  const [deptSearch, setDeptSearch] = useState("");
  const [deptSearchLocked, setDeptSearchLocked] = useState(true);
  const [deptHospitalFilter, setDeptHospitalFilter] = useState("");
  const [deptDialog, setDeptDialog] = useState({ open: false, mode: "create", id: null });
  const [deptForm, setDeptForm] = useState({ hospital: null, name: "", description: "" });
  const [deptView, setDeptView] = useState({ open: false, department: null });

  // Services list (tab 4)
  const svcReqId = useRef(0);
  const [services, setServices] = useState([]);
  const [svcLoading, setSvcLoading] = useState(false);
  const [svcPage, setSvcPage] = useState(0);
  const [svcRowsPerPage, setSvcRowsPerPage] = useState(10);
  const [svcTotal, setSvcTotal] = useState(0);
  const [svcSearch, setSvcSearch] = useState("");
  const [svcSearchLocked, setSvcSearchLocked] = useState(true);
  const [svcDialog, setSvcDialog] = useState({ open: false, mode: "create", id: null });
  const [svcForm, setSvcForm] = useState({
    hospital: null,
    department: null,
    name: "",
    description: "",
    price: "",
    status: "active",
    imageFile: null,
    imagePreview: "",
  });
  const [svcView, setSvcView] = useState({ open: false, service: null });

  // News & Events (tab 4)
  const [contentTab, setContentTab] = useState(0); // 0 news, 1 events
  const newsReqId = useRef(0);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsPage, setNewsPage] = useState(0);
  const [newsRowsPerPage, setNewsRowsPerPage] = useState(10);
  const [newsTotal, setNewsTotal] = useState(0);
  const [newsSearch, setNewsSearch] = useState("");
  const [newsSearchLocked, setNewsSearchLocked] = useState(true);
  const [newsDialog, setNewsDialog] = useState({ open: false, mode: "create", id: null });
  const [newsForm, setNewsForm] = useState({
    hospital: null,
    title: "",
    slug: "",
    content: "",
    category: "announcement",
    status: "draft",
    featuredFile: null,
    featuredPreview: "",
    slugTouched: false,
  });
  const [newsView, setNewsView] = useState({ open: false, news: null });

  const eventsReqId = useRef(0);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsPage, setEventsPage] = useState(0);
  const [eventsRowsPerPage, setEventsRowsPerPage] = useState(10);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsSearch, setEventsSearch] = useState("");
  const [eventsSearchLocked, setEventsSearchLocked] = useState(true);
  const [eventDialog, setEventDialog] = useState({ open: false, mode: "create", id: null });
  const [eventForm, setEventForm] = useState({
    hospital: null,
    title: "",
    slug: "",
    description: "",
    location: "",
    event_date: "",
    start_time: "",
    end_time: "",
    capacity: "",
    registration_required: false,
    status: "draft",
    bannerFile: null,
    bannerPreview: "",
    slugTouched: false,
  });
  const [eventView, setEventView] = useState({ open: false, event: null });

  const requireTokenGuard = () => {
    if (!token) {
      Swal.fire({ icon: "error", title: "Not logged in", text: "Please sign in again." });
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

  const loadHospitals = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++hospitalsReqId.current;
    setHospitalsLoading(true);
    try {
      const page = hospitalsPage + 1;
      const limit = hospitalsRowsPerPage;
      const search = hospitalsSearch.trim();
      const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) });
      const data = await fetchJson(`${API.hospitals}?${qs.toString()}`, { token });
      if (reqId !== hospitalsReqId.current) return;
      setHospitals(data.data || []);
      setHospitalsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== hospitalsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== hospitalsReqId.current) return;
      setHospitalsLoading(false);
    }
  };

  const loadStaff = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++staffReqId.current;
    setStaffLoading(true);
    try {
      const page = staffPage + 1;
      const limit = staffRowsPerPage;
      const search = staffSearch.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(hospitalFilter ? { hospital_id: hospitalFilter } : {}),
      });
      const data = await fetchJson(`${API.staff}?${qs.toString()}`, { token });
      if (reqId !== staffReqId.current) return;
      setStaff(data.data || []);
      setStaffTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== staffReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== staffReqId.current) return;
      setStaffLoading(false);
    }
  };

  const loadDepartmentsList = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++deptReqId.current;
    setDeptLoading(true);
    try {
      const page = deptPage + 1;
      const limit = deptRowsPerPage;
      const search = deptSearch.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(deptHospitalFilter ? { hospital_id: deptHospitalFilter } : {}),
      });
      const data = await fetchJson(`${API.departments}?${qs.toString()}`, { token });
      if (reqId !== deptReqId.current) return;
      setDepartments(data.data || []);
      setDeptTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== deptReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== deptReqId.current) return;
      setDeptLoading(false);
    }
  };

  const loadServicesList = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++svcReqId.current;
    setSvcLoading(true);
    try {
      const page = svcPage + 1;
      const limit = svcRowsPerPage;
      const search = svcSearch.trim();
      const defaultHospitalId = hospitals?.[0]?.id || "";
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(defaultHospitalId ? { hospital_id: defaultHospitalId } : {}),
      });
      const data = await fetchJson(`${API.services}?${qs.toString()}`, { token });
      if (reqId !== svcReqId.current) return;
      setServices(data.data || []);
      setSvcTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== svcReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== svcReqId.current) return;
      setSvcLoading(false);
    }
  };

  const loadNews = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++newsReqId.current;
    setNewsLoading(true);
    try {
      const page = newsPage + 1;
      const limit = newsRowsPerPage;
      const search = newsSearch.trim();
      const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) });
      const data = await fetchJson(`${API.news}?${qs.toString()}`, { token });
      if (reqId !== newsReqId.current) return;
      setNews(data.data || []);
      setNewsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== newsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== newsReqId.current) return;
      setNewsLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++eventsReqId.current;
    setEventsLoading(true);
    try {
      const page = eventsPage + 1;
      const limit = eventsRowsPerPage;
      const search = eventsSearch.trim();
      const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) });
      const data = await fetchJson(`${API.events}?${qs.toString()}`, { token });
      if (reqId !== eventsReqId.current) return;
      setEvents(data.data || []);
      setEventsTotal(data.pagination?.total ?? (data.data?.length || 0));
    } catch (e) {
      if (reqId !== eventsReqId.current) return;
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      if (reqId !== eventsReqId.current) return;
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalsPage, hospitalsRowsPerPage]);

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffPage, staffRowsPerPage, hospitalFilter]);

  useEffect(() => {
    loadDepartmentsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptPage, deptRowsPerPage, deptHospitalFilter]);

  useEffect(() => {
    if (tab !== 4 || contentTab !== 0) return;
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, contentTab, newsPage, newsRowsPerPage]);

  useEffect(() => {
    if (tab !== 4 || contentTab !== 1) return;
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, contentTab, eventsPage, eventsRowsPerPage]);

  useEffect(() => {
    if (tab !== 3) return;
    loadServicesList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, svcPage, svcRowsPerPage, hospitals?.[0]?.id]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (hospitalsPage !== 0) setHospitalsPage(0);
      else loadHospitals();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalsSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (staffPage !== 0) setStaffPage(0);
      else loadStaff();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (deptPage !== 0) setDeptPage(0);
      else loadDepartmentsList();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 3) return;
      if (svcPage !== 0) setSvcPage(0);
      else loadServicesList();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, svcSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 4 || contentTab !== 0) return;
      if (newsPage !== 0) setNewsPage(0);
      else loadNews();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, contentTab, newsSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 4 || contentTab !== 1) return;
      if (eventsPage !== 0) setEventsPage(0);
      else loadEvents();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, contentTab, eventsSearch]);

  const openCreateHospital = () => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    setHospitalForm({ name: "", email: "", phone: "", address: "", logoFile: null, logoPreview: "" });
    setHospitalDialog({ open: true, mode: "create", id: null });
  };
  const openEditHospital = (h) => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    setHospitalForm({
      name: h.name || "",
      email: h.email || "",
      phone: h.phone || "",
      address: h.address || "",
      logoFile: null,
      logoPreview: buildImageUrl(h.logo_path),
    });
    setHospitalDialog({ open: true, mode: "edit", id: h.id });
  };
  const openViewHospital = (h) => setHospitalView({ open: true, hospital: h });

  const saveHospital = async () => {
    if (!requireTokenGuard()) return;
    if (!hospitalForm.name.trim()) return Swal.fire({ icon: "warning", title: "Missing name", text: "Hospital name is required." });
    try {
      const fields = {
        name: hospitalForm.name.trim(),
        email: hospitalForm.email.trim() || "",
        phone: hospitalForm.phone.trim() || "",
        address: hospitalForm.address.trim() || "",
      };
      if (hospitalDialog.mode === "create") {
        await fetchMultipart(API.hospitals, {
          method: "POST",
          token,
          fields,
          fileFieldName: "hospital_logo",
          file: hospitalForm.logoFile,
        });
        Swal.fire({ icon: "success", title: "Created", text: "Hospital created successfully." });
      } else {
        await fetchMultipart(`${API.hospitals}/${hospitalDialog.id}`, {
          method: "PUT",
          token,
          fields,
          fileFieldName: "hospital_logo",
          file: hospitalForm.logoFile,
        });
        Swal.fire({ icon: "success", title: "Updated", text: "Hospital updated successfully." });
      }
      setHospitalDialog({ open: false, mode: "create", id: null });
      await loadHospitals();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const deleteHospital = async (h) => {
    if (!requireTokenGuard()) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete hospital?",
      html: `Delete <b>${h.name}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.hospitals}/${h.id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", text: "Hospital deleted." });
      await loadHospitals();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const searchUsers = async (q, { excludeStaff = false } = {}) => {
    if (!requireTokenGuard()) return;
    setUsersLoading(true);
    try {
      const qs = new URLSearchParams({
        page: "1",
        limit: "10",
        ...(q ? { search: q } : {}),
        ...(excludeStaff ? { exclude_staff: "true" } : {}),
      });
      const data = await fetchJson(`${API.users}?${qs.toString()}`, { token });
      setUserOptions(data.data || []);
    } catch {
      setUserOptions([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadDepartments = async (hospitalId) => {
    if (!requireTokenGuard()) return;
    if (!hospitalId) {
      setDepartmentOptions([]);
      return;
    }
    setDepartmentsLoading(true);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "100", hospital_id: hospitalId });
      const data = await fetchJson(`${API.departments}?${qs.toString()}`, { token });
      setDepartmentOptions(data.data || []);
    } catch {
      setDepartmentOptions([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const openCreateStaff = () => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    setStaffForm({
      user: null,
      hospital: null,
      department: null,
      staff_type: "",
      specialization: "",
      license_number: "",
      hire_date: "",
    });
    setDepartmentOptions([]);
    setStaffDialog({ open: true, mode: "create", id: null });
    searchUsers("", { excludeStaff: true });
  };
  const openEditStaff = (s) => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    const hospital = s.hospital ? { id: s.hospital.id, name: s.hospital.name } : null;
    const department = s.department ? { id: s.department.id, name: s.department.name } : null;
    setStaffForm({
      user: s.user || null,
      hospital,
      department,
      staff_type: s.staff_type || "",
      specialization: s.specialization || "",
      license_number: s.license_number || "",
      hire_date: s.hire_date || "",
    });
    if (hospital?.id) loadDepartments(hospital.id);
    setStaffDialog({ open: true, mode: "edit", id: s.id });
    searchUsers("", { excludeStaff: false });
  };
  const openViewStaff = (s) => setStaffView({ open: true, staff: s });

  const saveStaff = async () => {
    if (!requireTokenGuard()) return;
    if (!staffForm.user?.id) return Swal.fire({ icon: "warning", title: "Missing user", text: "Select a User first." });
    if (!staffForm.hospital?.id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a Hospital first." });
    if (!staffForm.staff_type.trim()) return Swal.fire({ icon: "warning", title: "Missing staff type", text: "Staff type is required." });

    const payload = {
      user_id: staffForm.user.id,
      hospital_id: staffForm.hospital.id,
      department_id: staffForm.department?.id || null,
      staff_type: staffForm.staff_type.trim(),
      specialization: staffForm.specialization.trim() || null,
      license_number: staffForm.license_number.trim() || null,
      hire_date: staffForm.hire_date || null,
    };
    try {
      if (staffDialog.mode === "create") {
        await fetchJson(API.staff, { method: "POST", token, body: payload });
        Swal.fire({ icon: "success", title: "Created", text: "Staff created successfully." });
      } else {
        await fetchJson(`${API.staff}/${staffDialog.id}`, { method: "PUT", token, body: payload });
        Swal.fire({ icon: "success", title: "Updated", text: "Staff updated successfully." });
      }
      setStaffDialog({ open: false, mode: "create", id: null });
      await loadStaff();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const deleteStaff = async (s) => {
    if (!requireTokenGuard()) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete staff?",
      html: `Delete <b>${s.user?.full_name || "this staff"}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.staff}/${s.id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", text: "Staff deleted." });
      await loadStaff();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const loadStaffSchedules = async (doctorId) => {
    if (!doctorId) return;
    setStaffSchedulesLoading(true);
    try {
      const token = getToken();
      const res = await fetchJson(`${API.schedules}?doctor_id=${doctorId}&limit=50`, { token });
      setStaffSchedules(res.data || []);
    } catch {
      setStaffSchedules([]);
    } finally {
      setStaffSchedulesLoading(false);
    }
  };
  const openScheduleDialog = (s) => {
    setScheduleDialog({ open: true, staff: s });
    setScheduleForm({ day_of_week: 1, start_time: "09:00", end_time: "17:00" });
    loadStaffSchedules(s.id);
  };
  const addSchedule = async () => {
    if (!scheduleDialog.staff?.id) return;
    const token = getToken();
    const start = scheduleForm.start_time;
    const end = scheduleForm.end_time;
    if (!start || !end) return Swal.fire({ icon: "warning", title: "Required", text: "Start and end time are required." });
    const isMidnight = end === "00:00" || end.startsWith("00:00:");
    if (!isMidnight && start >= end) return Swal.fire({ icon: "warning", title: "Invalid times", text: "End time must be after start time." });
    try {
      await fetchJson(API.schedules, {
        method: "POST",
        token,
        body: {
          doctor_id: scheduleDialog.staff.id,
          day_of_week: scheduleForm.day_of_week,
          start_time: start,
          end_time: end,
        },
      });
      Swal.fire({ icon: "success", title: "Added", text: "Schedule slot added." });
      await loadStaffSchedules(scheduleDialog.staff.id);
      setScheduleForm({ day_of_week: scheduleForm.day_of_week, start_time: "09:00", end_time: "17:00" });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };
  const removeSchedule = async (scheduleId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Remove slot?",
      text: "This schedule slot will be removed.",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
    });
    if (!result.isConfirmed) return;
    try {
      const token = getToken();
      await fetchJson(`${API.schedules}/${scheduleId}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Removed", text: "Schedule slot removed." });
      if (scheduleDialog.staff?.id) await loadStaffSchedules(scheduleDialog.staff.id);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  // Departments CRUD
  const openCreateDept = () => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    setDeptSearchLocked(true);
    setDeptForm({ hospital: null, name: "", description: "" });
    setDeptDialog({ open: true, mode: "create", id: null });
  };
  const openEditDept = (d) => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    setDeptSearchLocked(true);
    const hospital = d.hospital ? { id: d.hospital.id, name: d.hospital.name } : hospitals.find((h) => h.id === d.hospital_id) || null;
    setDeptForm({ hospital, name: d.name || "", description: d.description || "" });
    setDeptDialog({ open: true, mode: "edit", id: d.id });
  };
  const openViewDept = (d) => setDeptView({ open: true, department: d });

  const saveDept = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!deptForm.hospital?.id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a hospital." });
    if (!deptForm.name.trim()) return Swal.fire({ icon: "warning", title: "Missing name", text: "Department name is required." });

    const payload = {
      hospital_id: deptForm.hospital.id,
      name: deptForm.name.trim(),
      description: deptForm.description.trim() || null,
    };

    try {
      if (deptDialog.mode === "create") {
        await fetchJson(API.departments, { method: "POST", token, body: payload });
        Swal.fire({ icon: "success", title: "Created", text: "Department created successfully." });
      } else {
        await fetchJson(`${API.departments}/${deptDialog.id}`, { method: "PUT", token, body: payload });
        Swal.fire({ icon: "success", title: "Updated", text: "Department updated successfully." });
      }
      setDeptDialog({ open: false, mode: "create", id: null });
      await loadDepartmentsList();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const deleteDept = async (d) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete department?",
      html: `Delete <b>${d.name}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.departments}/${d.id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", text: "Department deleted." });
      await loadDepartmentsList();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  // Services CRUD
  const openCreateService = () => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    setDeptSearchLocked(true);
    setSvcSearchLocked(true);
    const hospital = hospitals?.[0] ? { id: hospitals[0].id, name: hospitals[0].name } : null;
    setSvcForm({
      hospital,
      department: null,
      name: "",
      description: "",
      price: "",
      status: "active",
      imageFile: null,
      imagePreview: "",
    });
    if (hospital?.id) loadDepartments(hospital.id);
    setSvcDialog({ open: true, mode: "create", id: null });
  };
  const openEditService = (s) => {
    setHospitalsSearchLocked(true);
    setStaffSearchLocked(true);
    setDeptSearchLocked(true);
    setSvcSearchLocked(true);
    const hospital = s.hospital ? { id: s.hospital.id, name: s.hospital.name } : hospitals.find((h) => h.id === s.hospital_id) || null;
    const department = s.department ? { id: s.department.id, name: s.department.name } : null;
    setSvcForm({
      hospital,
      department,
      name: s.name || "",
      description: s.description || "",
      price: s.price ?? "",
      status: s.status || "active",
      imageFile: null,
      imagePreview: buildImageUrl(s.image_path),
    });
    if (hospital?.id) loadDepartments(hospital.id);
    setSvcDialog({ open: true, mode: "edit", id: s.id });
  };
  const openViewService = (s) => setSvcView({ open: true, service: s });

  const saveService = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!svcForm.hospital?.id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a hospital." });
    if (!svcForm.department?.id) return Swal.fire({ icon: "warning", title: "Missing department", text: "Select a department." });
    if (!svcForm.name.trim()) return Swal.fire({ icon: "warning", title: "Missing name", text: "Service name is required." });

    const priceRaw = String(svcForm.price ?? "").trim();
    const fields = {
      hospital_id: svcForm.hospital.id,
      department_id: svcForm.department.id,
      name: svcForm.name.trim(),
      description: svcForm.description.trim() || null,
      price: priceRaw ? priceRaw : null,
      status: svcForm.status,
    };

    try {
      if (svcDialog.mode === "create") {
        await fetchMultipart(API.services, { method: "POST", token, fields, fileFieldName: "service_image", file: svcForm.imageFile });
        Swal.fire({ icon: "success", title: "Created", text: "Service created successfully." });
      } else {
        await fetchMultipart(`${API.services}/${svcDialog.id}`, { method: "PUT", token, fields, fileFieldName: "service_image", file: svcForm.imageFile });
        Swal.fire({ icon: "success", title: "Updated", text: "Service updated successfully." });
      }
      setSvcDialog({ open: false, mode: "create", id: null });
      await loadServicesList();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const deleteService = async (s) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete service?",
      html: `Delete <b>${s.name}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.services}/${s.id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", text: "Service deleted." });
      await loadServicesList();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  // News & Events CRUD
  const openCreateNews = () => {
    setNewsSearchLocked(true);
    setNewsForm({
      hospital: null,
      title: "",
      slug: "",
      content: "",
      category: "announcement",
      status: "draft",
      featuredFile: null,
      featuredPreview: "",
      slugTouched: false,
    });
    setNewsDialog({ open: true, mode: "create", id: null });
  };
  const openEditNews = (n) => {
    setNewsSearchLocked(true);
    const hospital = hospitals.find((h) => h.id === n.hospital_id) || null;
    setNewsForm({
      hospital,
      title: n.title || "",
      slug: n.slug || "",
      content: n.content || "",
      category: n.category || "announcement",
      status: n.status || "draft",
      featuredFile: null,
      featuredPreview: buildImageUrl(n.featured_image_path),
      slugTouched: true,
    });
    setNewsDialog({ open: true, mode: "edit", id: n.id });
  };
  const openViewNews = (n) => setNewsView({ open: true, news: n });

  const saveNews = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!newsForm.hospital?.id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a hospital." });
    if (!newsForm.title.trim() || !newsForm.slug.trim() || !newsForm.content.trim()) {
      return Swal.fire({ icon: "warning", title: "Missing fields", text: "Title, slug, and content are required." });
    }
    const fields = {
      hospital_id: newsForm.hospital.id,
      title: newsForm.title.trim(),
      slug: newsForm.slug.trim(),
      content: newsForm.content.trim(),
      category: newsForm.category,
      status: newsForm.status,
    };
    try {
      if (newsDialog.mode === "create") {
        await fetchMultipart(API.news, {
          method: "POST",
          token,
          fields,
          fileFieldName: "news_featured_image",
          file: newsForm.featuredFile,
        });
        Swal.fire({ icon: "success", title: "Created", text: "News created successfully." });
      } else {
        await fetchMultipart(`${API.news}/${newsDialog.id}`, {
          method: "PUT",
          token,
          fields,
          fileFieldName: "news_featured_image",
          file: newsForm.featuredFile,
        });
        Swal.fire({ icon: "success", title: "Updated", text: "News updated successfully." });
      }
      setNewsDialog({ open: false, mode: "create", id: null });
      await loadNews();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const deleteNews = async (n) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete news?",
      html: `Delete <b>${n.title}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.news}/${n.id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", text: "News deleted." });
      await loadNews();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const openCreateEvent = () => {
    setEventsSearchLocked(true);
    setEventForm({
      hospital: null,
      title: "",
      slug: "",
      description: "",
      location: "",
      event_date: "",
      start_time: "",
      end_time: "",
      capacity: "",
      registration_required: false,
      status: "draft",
      bannerFile: null,
      bannerPreview: "",
      slugTouched: false,
    });
    setEventDialog({ open: true, mode: "create", id: null });
  };
  const openEditEvent = (e) => {
    setEventsSearchLocked(true);
    const hospital = hospitals.find((h) => h.id === e.hospital_id) || null;
    setEventForm({
      hospital,
      title: e.title || "",
      slug: e.slug || "",
      description: e.description || "",
      location: e.location || "",
      event_date: e.event_date || "",
      start_time: e.start_time || "",
      end_time: e.end_time || "",
      capacity: e.capacity ?? "",
      registration_required: Boolean(e.registration_required),
      status: e.status || "draft",
      bannerFile: null,
      bannerPreview: buildImageUrl(e.banner_image_path),
      slugTouched: true,
    });
    setEventDialog({ open: true, mode: "edit", id: e.id });
  };
  const openViewEvent = (e) => setEventView({ open: true, event: e });

  const saveEvent = async () => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    if (!eventForm.hospital?.id) return Swal.fire({ icon: "warning", title: "Missing hospital", text: "Select a hospital." });
    if (!eventForm.title.trim() || !eventForm.slug.trim() || !eventForm.event_date || !eventForm.start_time || !eventForm.end_time) {
      return Swal.fire({ icon: "warning", title: "Missing fields", text: "Title, slug, date, start time and end time are required." });
    }
    const fields = {
      hospital_id: eventForm.hospital.id,
      title: eventForm.title.trim(),
      slug: eventForm.slug.trim(),
      description: eventForm.description.trim() || "",
      location: eventForm.location.trim() || "",
      event_date: eventForm.event_date,
      start_time: eventForm.start_time,
      end_time: eventForm.end_time,
      capacity: eventForm.capacity === "" ? undefined : eventForm.capacity,
      registration_required: eventForm.registration_required ? "true" : "false",
      status: eventForm.status,
    };
    try {
      if (eventDialog.mode === "create") {
        await fetchMultipart(API.events, {
          method: "POST",
          token,
          fields,
          fileFieldName: "event_banner",
          file: eventForm.bannerFile,
        });
        Swal.fire({ icon: "success", title: "Created", text: "Event created successfully." });
      } else {
        await fetchMultipart(`${API.events}/${eventDialog.id}`, {
          method: "PUT",
          token,
          fields,
          fileFieldName: "event_banner",
          file: eventForm.bannerFile,
        });
        Swal.fire({ icon: "success", title: "Updated", text: "Event updated successfully." });
      }
      setEventDialog({ open: false, mode: "create", id: null });
      await loadEvents();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const deleteEvent = async (e) => {
    if (!requireTokenGuard()) return;
    if (!isAdmin) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete event?",
      html: `Delete <b>${e.title}</b>? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.events}/${e.id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", text: "Event deleted." });
      await loadEvents();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed", text: err.message });
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <Box sx={{ p: { xs: 2.5, md: 3 }, color: "white", background: heroGradient }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalHospitalIcon />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Hospital
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>Manage your hospital profile, departments, staff, and updates.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => {
                    if (tab === 0) loadHospitals();
                    if (tab === 1) loadDepartmentsList();
                    if (tab === 2) loadStaff();
                    if (tab === 3) loadServicesList();
                    if (tab === 4) {
                      if (contentTab === 0) loadNews();
                      if (contentTab === 1) loadEvents();
                    }
                  }}
                  sx={{ color: "white", border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {isAdmin && tab === 0 && !hospitalsLoading && hospitals.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateHospital}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  New Hospital
                </Button>
              )}
              {isAdmin && tab === 1 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateDept}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  New Department
                </Button>
              )}
              {isAdmin && tab === 2 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateStaff}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  New Staff
                </Button>
              )}
              {isAdmin && tab === 3 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateService}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  New Service
                </Button>
              )}
              {isAdmin && tab === 4 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={contentTab === 0 ? openCreateNews : openCreateEvent}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  {contentTab === 0 ? "New News" : "New Event"}
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main } }}>
            <Tab icon={<LocalHospitalIcon />} iconPosition="start" label="Hospital" />
            <Tab icon={<PeopleAltIcon />} iconPosition="start" label="Departments" />
            <Tab icon={<PeopleAltIcon />} iconPosition="start" label="Staff" />
            <Tab icon={<MedicalServicesIcon />} iconPosition="start" label="Services" />
            <Tab icon={<CampaignIcon />} iconPosition="start" label="News & Events" />
          </Tabs>
          <Divider />

          {/* Hospital */}
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              {hospitalsLoading ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading hospital…</Typography>
                </Stack>
              ) : hospitals.length === 0 ? (
                <Stack spacing={1.5} sx={{ py: 1 }}>
                  <Alert severity="info">No hospital has been created yet.</Alert>
                  {!isAdmin && <Alert severity="warning">You can view hospital details, but only admins can create/edit.</Alert>}
                </Stack>
              ) : (
                <Stack spacing={2}>
                  {hospitals.map((h) => (
                    <Card key={h.id} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar
                              src={buildImageUrl(h.logo_path)}
                              alt={h.name}
                              sx={{ width: 64, height: 64, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
                            >
                              {(h.name || "H").trim().charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>{h.name || "—"}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, wordBreak: "break-word" }}>
                                {h.email || "—"}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 700 }}>
                                {h.phone || "—"}
                              </Typography>
                            </Box>
                          </Stack>

                          {isAdmin && (
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              <Tooltip title="Edit">
                                <IconButton onClick={() => openEditHospital(h)} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                                  <EditIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </Stack>

                        <Divider sx={{ my: 2 }} />
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Address
                            </Typography>
                            <Typography sx={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>{h.address || "—"}</Typography>
                          </Box>
                          <Box sx={{ width: { xs: "100%", md: 220 } }}>
                            <Typography variant="caption" color="text.secondary">
                              Created
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>{formatDate(h.createdAt)}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* Departments */}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
                <TextField
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  placeholder="Search departments (name, description)…"
                  size="small"
                  fullWidth
                  name="dept_search"
                  type="search"
                  autoComplete="off"
                  onFocus={() => setDeptSearchLocked(false)}
                  onClick={() => setDeptSearchLocked(false)}
                  InputProps={{ readOnly: deptSearchLocked }}
                  inputProps={{ autoComplete: "off", "data-lpignore": "true", "data-1p-ignore": "true" }}
                />
              </Stack>

              <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 360 }}>Description</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deptLoading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading departments…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : departments.length ? (
                      departments.map((d, idx) => (
                        <TableRow key={d.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{deptPage * deptRowsPerPage + idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{d.name}</TableCell>
                          <TableCell
                            sx={{
                              maxWidth: 360,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={d.description || ""}
                          >
                            {d.description || "—"}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Tooltip title="View">
                              <IconButton onClick={() => openViewDept(d)} size="small">
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <>
                                <Tooltip title="Edit">
                                  <IconButton onClick={() => openEditDept(d)} size="small">
                                    <EditIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton onClick={() => deleteDept(d)} size="small" color="error">
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
                        <TableCell colSpan={4}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No departments found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={deptTotal}
                page={deptPage}
                onPageChange={(_, p) => setDeptPage(p)}
                rowsPerPage={deptRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setDeptRowsPerPage(parseInt(e.target.value, 10));
                  setDeptPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {/* Staff */}
          {tab === 2 && (
            <Box sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
                <TextField
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff (name, email, phone, type)…"
                  size="small"
                  fullWidth
                  name="staff_search"
                  type="search"
                  autoComplete="off"
                  onFocus={() => setStaffSearchLocked(false)}
                  onClick={() => setStaffSearchLocked(false)}
                  InputProps={{ readOnly: staffSearchLocked }}
                  inputProps={{ autoComplete: "off", "data-lpignore": "true", "data-1p-ignore": "true" }}
                />
              </Stack>

              {hospitals.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Create a hospital first so you can assign staff to it.
                </Alert>
              )}

              {staffLoading ? (
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                  <Typography color="text.secondary">Loading staff…</Typography>
                </Stack>
              ) : staff.length ? (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 2,
                      "& > *": { minWidth: 0 },
                      "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, 1fr)" },
                      "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
                    }}
                  >
                    {staff.map((s) => {
                      const today = new Date().getDay();
                      const todaySlots = (s.schedules || []).filter((slot) => Number(slot.day_of_week) === today);
                      const scheduleStatus = getScheduleStatus(todaySlots);
                      return (
                        <Card
                          key={s.id}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            overflow: "hidden",
                            transition: "box-shadow 0.2s ease, transform 0.2s ease",
                            borderLeftWidth: scheduleStatus.status === "working" ? 4 : 1,
                            borderLeftColor: scheduleStatus.status === "working" ? "success.main" : "divider",
                            "&:hover": {
                              boxShadow: 2,
                              transform: "translateY(-2px)",
                            },
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                          }}
                        >
                          <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", "&:last-child": { pb: 2 } }}>
                            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 48,
                                  height: 48,
                                  bgcolor: scheduleStatus.status === "working" ? "success.main" : "primary.main",
                                  color: "primary.contrastText",
                                  fontWeight: 700,
                                }}
                              >
                                {(s.user?.full_name || "?").charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700} noWrap title={s.user?.full_name || "—"}>
                                  {s.user?.full_name || "—"}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={s.staff_type}
                                  sx={{ mt: 0.5, fontWeight: 600, textTransform: "capitalize" }}
                                />
                              </Box>
                            </Stack>
                            <Stack spacing={0.5} sx={{ mt: 1, flex: 1 }}>
                              <Typography variant="body2" color="text.secondary" noWrap title={s.department?.name || "—"}>
                                {s.department?.name || "—"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" component="span">
                                {s.user?.phone || "—"}
                              </Typography>
                              {todaySlots.length > 0 && (
                                <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ mt: 0.5 }}>
                                  Today: {todaySlots.map((slot) => `${String(slot.start_time).slice(0, 5)} – ${String(slot.end_time).slice(0, 5)}`).join(", ")}
                                </Typography>
                              )}
                              {scheduleStatus.status === "working" && (
                                <Chip size="small" label="Working now" color="success" sx={{ mt: 0.5, fontWeight: 600, alignSelf: "flex-start" }} />
                              )}
                              {scheduleStatus.status === "later" && (
                                <Chip size="small" label={`Starts at ${scheduleStatus.nextStart}`} sx={{ mt: 0.5, alignSelf: "flex-start", bgcolor: "action.hover" }} />
                              )}
                              {scheduleStatus.status === "finished" && (
                                <Chip size="small" label="Finished for today" sx={{ mt: 0.5, alignSelf: "flex-start", color: "text.secondary", bgcolor: "action.hover" }} />
                              )}
                              {scheduleStatus.status === "none" && (
                                <Chip size="small" label="No schedule today" sx={{ mt: 0.5, alignSelf: "flex-start", color: "text.secondary", bgcolor: "action.hover" }} />
                              )}
                            </Stack>
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
                              <Tooltip title="Schedule">
                                <IconButton onClick={() => openScheduleDialog(s)} size="small" color="default" aria-label="Schedule">
                                  <ScheduleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View">
                                <IconButton onClick={() => openViewStaff(s)} size="small" color="default">
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <>
                                  <Tooltip title="Edit">
                                    <IconButton onClick={() => openEditStaff(s)} size="small" color="primary">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton onClick={() => deleteStaff(s)} size="small" color="error">
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                  <TablePagination
                    component="div"
                    count={staffTotal}
                    page={staffPage}
                    onPageChange={(_, p) => setStaffPage(p)}
                    rowsPerPage={staffRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setStaffRowsPerPage(parseInt(e.target.value, 10));
                      setStaffPage(0);
                    }}
                    rowsPerPageOptions={[6, 12, 24, 48]}
                    sx={{ borderTop: 1, borderColor: "divider", mt: 2 }}
                  />
                </>
              ) : (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">No staff found.</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Services */}
          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
                <TextField
                  value={svcSearch}
                  onChange={(e) => setSvcSearch(e.target.value)}
                  placeholder="Search services (name, description, status)…"
                  size="small"
                  fullWidth
                  name="svc_search"
                  type="search"
                  autoComplete="off"
                  onFocus={() => setSvcSearchLocked(false)}
                  onClick={() => setSvcSearchLocked(false)}
                  InputProps={{ readOnly: svcSearchLocked }}
                  inputProps={{ autoComplete: "off", "data-lpignore": "true", "data-1p-ignore": "true" }}
                />
              </Stack>

              {hospitals.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Create a hospital first so you can create services.
                </Alert>
              )}

              <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {svcLoading ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Loading services…</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : services.length ? (
                      services.map((s, idx) => (
                        <TableRow key={s.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{svcPage * svcRowsPerPage + idx + 1}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1.2} alignItems="center">
                              <Avatar
                                src={buildImageUrl(s.image_path)}
                                alt={s.name}
                                sx={{ width: 32, height: 32, bgcolor: "rgba(0, 137, 123, 0.10)", color: theme.palette.primary.dark, fontWeight: 900 }}
                              >
                                {(s.name || "S").trim().charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{s.name || "—"}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>
                                  {s.description || "—"}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>{s.department?.name || "—"}</TableCell>
                          <TableCell>{s.price != null && s.price !== "" ? s.price : "—"}</TableCell>
                          <TableCell>
                            <Chip size="small" label={s.status} color={s.status === "active" ? "success" : "default"} variant={s.status === "active" ? "filled" : "outlined"} />
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Tooltip title="View">
                              <IconButton onClick={() => openViewService(s)} size="small">
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <>
                                <Tooltip title="Edit">
                                  <IconButton onClick={() => openEditService(s)} size="small">
                                    <EditIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton onClick={() => deleteService(s)} size="small" color="error">
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
                            No services found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={svcTotal}
                page={svcPage}
                onPageChange={(_, p) => setSvcPage(p)}
                rowsPerPage={svcRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setSvcRowsPerPage(parseInt(e.target.value, 10));
                  setSvcPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Box>
          )}

          {/* News & Events */}
          {tab === 4 && (
            <Box sx={{ p: 2 }}>
              <Tabs
                value={contentTab}
                onChange={(_, v) => setContentTab(v)}
                sx={{ mb: 2, "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main } }}
              >
                <Tab icon={<ArticleIcon />} iconPosition="start" label="News" />
                <Tab icon={<EventIcon />} iconPosition="start" label="Events" />
              </Tabs>
              <Divider sx={{ mb: 2 }} />

              {contentTab === 0 && (
                <>
                  <TextField
                    value={newsSearch}
                    onChange={(e) => setNewsSearch(e.target.value)}
                    placeholder="Search news (title, slug, status)…"
                    size="small"
                    fullWidth
                    name="news_search"
                    type="search"
                    autoComplete="off"
                    onFocus={() => setNewsSearchLocked(false)}
                    onClick={() => setNewsSearchLocked(false)}
                    InputProps={{ readOnly: newsSearchLocked }}
                    inputProps={{ autoComplete: "off", "data-lpignore": "true", "data-1p-ignore": "true" }}
                    sx={{ mb: 2 }}
                  />

                  <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                          <TableCell sx={{ fontWeight: 800, width: 64 }}>No</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Title</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Hospital</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {newsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                                <CircularProgress size={18} />
                                <Typography color="text.secondary">Loading news…</Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : news.length ? (
                          news.map((n, idx) => (
                            <TableRow key={n.id} hover>
                              <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{newsPage * newsRowsPerPage + idx + 1}</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>{n.title}</TableCell>
                              <TableCell>{hospitals.find((h) => h.id === n.hospital_id)?.name || "—"}</TableCell>
                              <TableCell>{n.category}</TableCell>
                              <TableCell>
                                <Chip size="small" label={n.status} sx={{ fontWeight: 800 }} />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="View">
                                  <IconButton onClick={() => openViewNews(n)} size="small">
                                    <VisibilityIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                {isAdmin && (
                                  <>
                                    <Tooltip title="Edit">
                                      <IconButton onClick={() => openEditNews(n)} size="small">
                                        <EditIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton onClick={() => deleteNews(n)} size="small" color="error">
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
                                No news found.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={newsTotal}
                    page={newsPage}
                    onPageChange={(_, p) => setNewsPage(p)}
                    rowsPerPage={newsRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setNewsRowsPerPage(parseInt(e.target.value, 10));
                      setNewsPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </>
              )}

              {contentTab === 1 && (
                <>
                  <TextField
                    value={eventsSearch}
                    onChange={(e) => setEventsSearch(e.target.value)}
                    placeholder="Search events (title, location, status)…"
                    size="small"
                    fullWidth
                    name="events_search"
                    type="search"
                    autoComplete="off"
                    onFocus={() => setEventsSearchLocked(false)}
                    onClick={() => setEventsSearchLocked(false)}
                    InputProps={{ readOnly: eventsSearchLocked }}
                    inputProps={{ autoComplete: "off", "data-lpignore": "true", "data-1p-ignore": "true" }}
                    sx={{ mb: 2 }}
                  />

                  <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                          <TableCell sx={{ fontWeight: 800, width: 64 }}>No</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Title</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Hospital</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {eventsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                                <CircularProgress size={18} />
                                <Typography color="text.secondary">Loading events…</Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : events.length ? (
                          events.map((ev, idx) => (
                            <TableRow key={ev.id} hover>
                              <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{eventsPage * eventsRowsPerPage + idx + 1}</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>{ev.title}</TableCell>
                              <TableCell>{hospitals.find((h) => h.id === ev.hospital_id)?.name || "—"}</TableCell>
                              <TableCell>{ev.event_date || "—"}</TableCell>
                              <TableCell>
                                <Chip size="small" label={ev.status} sx={{ fontWeight: 800 }} />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="View">
                                  <IconButton onClick={() => openViewEvent(ev)} size="small">
                                    <VisibilityIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                {isAdmin && (
                                  <>
                                    <Tooltip title="Edit">
                                      <IconButton onClick={() => openEditEvent(ev)} size="small">
                                        <EditIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton onClick={() => deleteEvent(ev)} size="small" color="error">
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
                                No events found.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={eventsTotal}
                    page={eventsPage}
                    onPageChange={(_, p) => setEventsPage(p)}
                    rowsPerPage={eventsRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setEventsRowsPerPage(parseInt(e.target.value, 10));
                      setEventsPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Hospital view */}
      <Dialog open={hospitalView.open} onClose={() => setHospitalView({ open: false, hospital: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Hospital Details</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={buildImageUrl(hospitalView.hospital?.logo_path)}
                alt={hospitalView.hospital?.name}
                sx={{ width: 56, height: 56, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(hospitalView.hospital?.name || "H").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{hospitalView.hospital?.name || "—"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {hospitalView.hospital?.email || "—"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{hospitalView.hospital?.phone || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Created
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{formatDate(hospitalView.hospital?.createdAt)}</Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Address
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{hospitalView.hospital?.address || "—"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHospitalView({ open: false, hospital: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Hospital create/edit */}
      <Dialog open={hospitalDialog.open} onClose={() => setHospitalDialog({ open: false, mode: "create", id: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{hospitalDialog.mode === "create" ? "Create Hospital" : "Edit Hospital"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={hospitalForm.logoPreview}
                alt={hospitalForm.name}
                sx={{ width: 56, height: 56, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(hospitalForm.name || "H").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>
                Upload logo
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setHospitalForm((p) => {
                      if (p.logoPreview && p.logoFile) URL.revokeObjectURL(p.logoPreview);
                      return { ...p, logoFile: file, logoPreview: url };
                    });
                  }}
                />
              </Button>
            </Stack>
            <TextField label="Hospital name" fullWidth value={hospitalForm.name} onChange={(e) => setHospitalForm((p) => ({ ...p, name: e.target.value }))} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Email" fullWidth value={hospitalForm.email} onChange={(e) => setHospitalForm((p) => ({ ...p, email: e.target.value }))} />
              <TextField label="Phone" fullWidth value={hospitalForm.phone} onChange={(e) => setHospitalForm((p) => ({ ...p, phone: e.target.value }))} />
            </Stack>
            <TextField label="Address" fullWidth multiline minRows={2} value={hospitalForm.address} onChange={(e) => setHospitalForm((p) => ({ ...p, address: e.target.value }))} />
            {!isAdmin && (
              <Alert severity="info">
                You can view hospitals, but only admins can create/edit/delete.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHospitalDialog({ open: false, mode: "create", id: null })}>Cancel</Button>
          {isAdmin && (
            <Button variant="contained" onClick={saveHospital} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Staff view */}
      <Dialog open={staffView.open} onClose={() => setStaffView({ open: false, staff: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Staff Details</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{staffView.staff?.user?.full_name || "—"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {staffView.staff?.user?.email || "—"}
            </Typography>
            <Divider />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{staffView.staff?.staff_type || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{staffView.staff?.user?.phone || "—"}</Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Hospital
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{staffView.staff?.hospital?.name || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Department
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{staffView.staff?.department?.name || "—"}</Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Specialization
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{staffView.staff?.specialization || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  License number
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{staffView.staff?.license_number || "—"}</Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Hire date
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{staffView.staff?.hire_date || "—"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStaffView({ open: false, staff: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Staff schedule */}
      <Dialog open={scheduleDialog.open} onClose={() => setScheduleDialog({ open: false, staff: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          Schedule — {scheduleDialog.staff?.user?.full_name || "Staff"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {staffSchedulesLoading ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">Loading schedule…</Typography>
              </Stack>
            ) : (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Existing slots
                </Typography>
                {staffSchedules.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No schedule slots yet. Add one below.</Typography>
                ) : (
                  <Stack spacing={0.5}>
                    {staffSchedules.map((slot) => (
                      <Stack
                        key={slot.id}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          py: 1,
                          px: 1.5,
                          borderRadius: 1,
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {DAY_NAMES[slot.day_of_week]} — {String(slot.start_time).slice(0, 5)} – {String(slot.end_time).slice(0, 5)}
                        </Typography>
                        {isAdmin && (
                          <IconButton onClick={() => removeSchedule(slot.id)} size="small" color="error" aria-label="Remove slot">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                )}
                {isAdmin && (
                  <>
                    <Divider />
                    <Typography variant="subtitle2" color="text.secondary">
                      Add slot
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Day</InputLabel>
                        <Select
                          value={scheduleForm.day_of_week}
                          label="Day"
                          onChange={(e) => setScheduleForm((p) => ({ ...p, day_of_week: Number(e.target.value) }))}
                        >
                          {DAY_NAMES.map((name, i) => (
                            <MenuItem key={i} value={i}>{name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Start"
                        type="time"
                        size="small"
                        value={scheduleForm.start_time}
                        onChange={(e) => setScheduleForm((p) => ({ ...p, start_time: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                        sx={{ width: 120 }}
                      />
                      <TextField
                        label="End"
                        type="time"
                        size="small"
                        value={scheduleForm.end_time}
                        onChange={(e) => setScheduleForm((p) => ({ ...p, end_time: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                        sx={{ width: 120 }}
                      />
                      <Button variant="contained" onClick={addSchedule} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
                        Add
                      </Button>
                    </Stack>
                  </>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog({ open: false, staff: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Staff create/edit */}
      <Dialog open={staffDialog.open} onClose={() => setStaffDialog({ open: false, mode: "create", id: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{staffDialog.mode === "create" ? "Create Staff" : "Edit Staff"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Staff profiles link an existing <b>User</b> to a <b>Hospital</b> (and optional Department). Create the user first in “Users & Roles”.
            </Alert>
            <Autocomplete
              options={userOptions}
              value={staffForm.user}
              onChange={(_, v) => setStaffForm((p) => ({ ...p, user: v }))}
              loading={usersLoading}
              getOptionLabel={(u) => `${u.full_name || "—"} • ${u.email || ""}`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onInputChange={(_, v) => searchUsers(v, { excludeStaff: staffDialog.mode === "create" })}
              renderInput={(params) => <TextField {...params} label="User" placeholder="Search user…" />}
            />
            <Autocomplete
              options={hospitals}
              value={staffForm.hospital}
              onChange={(_, v) => {
                setStaffForm((p) => ({ ...p, hospital: v, department: null }));
                loadDepartments(v?.id || "");
              }}
              getOptionLabel={(h) => h?.name || "—"}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Hospital" placeholder="Select hospital…" />}
            />
            <Autocomplete
              options={departmentOptions}
              value={staffForm.department}
              onChange={(_, v) => setStaffForm((p) => ({ ...p, department: v }))}
              loading={departmentsLoading}
              getOptionLabel={(d) => d?.name || "—"}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Department (optional)" placeholder="Select department…" />}
            />
            <TextField label="Staff type (e.g. doctor, nurse)" fullWidth value={staffForm.staff_type} onChange={(e) => setStaffForm((p) => ({ ...p, staff_type: e.target.value }))} />
            <TextField label="Specialization (optional)" fullWidth value={staffForm.specialization} onChange={(e) => setStaffForm((p) => ({ ...p, specialization: e.target.value }))} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="License number (optional)" fullWidth value={staffForm.license_number} onChange={(e) => setStaffForm((p) => ({ ...p, license_number: e.target.value }))} />
              <TextField
                label="Hire date (optional)"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={staffForm.hire_date}
                onChange={(e) => setStaffForm((p) => ({ ...p, hire_date: e.target.value }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStaffDialog({ open: false, mode: "create", id: null })}>Cancel</Button>
          {isAdmin && (
            <Button variant="contained" onClick={saveStaff} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Department view */}
      <Dialog open={deptView.open} onClose={() => setDeptView({ open: false, department: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Department Details</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{deptView.department?.name || "—"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {deptView.department?.hospital?.name || "—"}
            </Typography>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography sx={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>{deptView.department?.description || "—"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeptView({ open: false, department: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Department create/edit */}
      <Dialog open={deptDialog.open} onClose={() => setDeptDialog({ open: false, mode: "create", id: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{deptDialog.mode === "create" ? "Create Department" : "Edit Department"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={hospitals}
              value={deptForm.hospital}
              onChange={(_, v) => setDeptForm((p) => ({ ...p, hospital: v }))}
              getOptionLabel={(h) => h?.name || "—"}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Hospital" placeholder="Select hospital…" />}
            />
            <TextField label="Department name" fullWidth value={deptForm.name} onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))} />
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              minRows={3}
              value={deptForm.description}
              onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))}
            />
            {!isAdmin && <Alert severity="info">You can view departments, but only admins can create/edit/delete.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeptDialog({ open: false, mode: "create", id: null })}>Cancel</Button>
          {isAdmin && (
            <Button variant="contained" onClick={saveDept} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Service view */}
      <Dialog open={svcView.open} onClose={() => setSvcView({ open: false, service: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Service Details</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={buildImageUrl(svcView.service?.image_path)}
                sx={{ width: 64, height: 64, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(svcView.service?.name || "S").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{svcView.service?.name || "—"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {svcView.service?.department?.name || "—"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Price
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{svcView.service?.price != null && svcView.service?.price !== "" ? svcView.service?.price : "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{svcView.service?.status || "—"}</Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography sx={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>{svcView.service?.description || "—"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSvcView({ open: false, service: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Service create/edit */}
      <Dialog open={svcDialog.open} onClose={() => setSvcDialog({ open: false, mode: "create", id: null })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{svcDialog.mode === "create" ? "Create Service" : "Edit Service"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={svcForm.imagePreview}
                alt={svcForm.name}
                sx={{ width: 56, height: 56, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(svcForm.name || "S").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>
                Upload image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setSvcForm((p) => {
                      if (p.imagePreview && p.imageFile) URL.revokeObjectURL(p.imagePreview);
                      return { ...p, imageFile: file, imagePreview: url };
                    });
                  }}
                />
              </Button>
            </Stack>

            <Autocomplete
              options={hospitals}
              value={svcForm.hospital}
              onChange={(_, v) => {
                setSvcForm((p) => ({ ...p, hospital: v, department: null }));
                loadDepartments(v?.id || "");
              }}
              getOptionLabel={(h) => h?.name || "—"}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Hospital" placeholder="Select hospital…" />}
              disabled={hospitals.length <= 1}
            />

            <Autocomplete
              options={departmentOptions}
              value={svcForm.department}
              onChange={(_, v) => setSvcForm((p) => ({ ...p, department: v }))}
              loading={departmentsLoading}
              getOptionLabel={(d) => d?.name || "—"}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Department" placeholder="Select department…" />}
            />

            <TextField label="Service name" fullWidth value={svcForm.name} onChange={(e) => setSvcForm((p) => ({ ...p, name: e.target.value }))} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Price (optional)"
                fullWidth
                type="number"
                inputProps={{ step: "0.01", min: "0" }}
                value={svcForm.price}
                onChange={(e) => setSvcForm((p) => ({ ...p, price: e.target.value }))}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={svcForm.status} onChange={(e) => setSvcForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="inactive">inactive</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              minRows={3}
              value={svcForm.description}
              onChange={(e) => setSvcForm((p) => ({ ...p, description: e.target.value }))}
            />
            {!isAdmin && <Alert severity="info">You can view services, but only admins can create/edit/delete.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSvcDialog({ open: false, mode: "create", id: null })}>Cancel</Button>
          {isAdmin && (
            <Button variant="contained" onClick={saveService} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* News view */}
      <Dialog open={newsView.open} onClose={() => setNewsView({ open: false, news: null })} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>News Details</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={buildImageUrl(newsView.news?.featured_image_path)}
                sx={{ width: 64, height: 64, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(newsView.news?.title || "N").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{newsView.news?.title || "—"}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                  {newsView.news?.slug || "—"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Hospital
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{hospitals.find((h) => h.id === newsView.news?.hospital_id)?.name || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Category / Status
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {newsView.news?.category || "—"} • {newsView.news?.status || "—"}
                </Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Content
              </Typography>
              <Typography sx={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>{newsView.news?.content || "—"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewsView({ open: false, news: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* News create/edit */}
      <Dialog open={newsDialog.open} onClose={() => setNewsDialog({ open: false, mode: "create", id: null })} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>{newsDialog.mode === "create" ? "Create News" : "Edit News"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={newsForm.featuredPreview}
                sx={{ width: 56, height: 56, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(newsForm.title || "N").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>
                Upload featured image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setNewsForm((p) => {
                      if (p.featuredPreview && p.featuredFile) URL.revokeObjectURL(p.featuredPreview);
                      return { ...p, featuredFile: file, featuredPreview: url };
                    });
                  }}
                />
              </Button>
            </Stack>
            <Autocomplete
              options={hospitals}
              value={newsForm.hospital}
              onChange={(_, v) => setNewsForm((p) => ({ ...p, hospital: v }))}
              getOptionLabel={(h) => h?.name || "—"}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Hospital" placeholder="Select hospital…" />}
            />
            <TextField
              label="Title"
              fullWidth
              value={newsForm.title}
              onChange={(e) => {
                const title = e.target.value;
                setNewsForm((p) => ({ ...p, title, ...(p.slugTouched ? {} : { slug: slugify(title) }) }));
              }}
            />
            <TextField
              label="Slug"
              fullWidth
              value={newsForm.slug}
              onChange={(e) => setNewsForm((p) => ({ ...p, slugTouched: true, slug: slugify(e.target.value) }))}
              helperText="URL-friendly identifier. Must be unique."
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={newsForm.category} label="Category" onChange={(e) => setNewsForm((p) => ({ ...p, category: e.target.value }))}>
                  <MenuItem value="announcement">Announcement</MenuItem>
                  <MenuItem value="medical_update">Medical update</MenuItem>
                  <MenuItem value="recruitment">Recruitment</MenuItem>
                  <MenuItem value="awareness">Awareness</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={newsForm.status} label="Status" onChange={(e) => setNewsForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Content"
              fullWidth
              multiline
              minRows={6}
              value={newsForm.content}
              onChange={(e) => setNewsForm((p) => ({ ...p, content: e.target.value }))}
            />
            {!isAdmin && <Alert severity="info">You can view news, but only admins can create/edit/delete.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewsDialog({ open: false, mode: "create", id: null })}>Cancel</Button>
          {isAdmin && (
            <Button variant="contained" onClick={saveNews} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Event view */}
      <Dialog open={eventView.open} onClose={() => setEventView({ open: false, event: null })} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Event Details</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={buildImageUrl(eventView.event?.banner_image_path)}
                sx={{ width: 64, height: 64, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(eventView.event?.title || "E").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{eventView.event?.title || "—"}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                  {eventView.event?.slug || "—"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Hospital
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{hospitals.find((h) => h.id === eventView.event?.hospital_id)?.name || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Date / Time
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {eventView.event?.event_date || "—"} • {eventView.event?.start_time || "—"}–{eventView.event?.end_time || "—"}
                </Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Location
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{eventView.event?.location || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{eventView.event?.status || "—"}</Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography sx={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>{eventView.event?.description || "—"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventView({ open: false, event: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Event create/edit */}
      <Dialog open={eventDialog.open} onClose={() => setEventDialog({ open: false, mode: "create", id: null })} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>{eventDialog.mode === "create" ? "Create Event" : "Edit Event"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={eventForm.bannerPreview}
                sx={{ width: 56, height: 56, bgcolor: "rgba(0, 137, 123, 0.12)", color: theme.palette.primary.dark, fontWeight: 900 }}
              >
                {(eventForm.title || "E").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>
                Upload banner
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setEventForm((p) => {
                      if (p.bannerPreview && p.bannerFile) URL.revokeObjectURL(p.bannerPreview);
                      return { ...p, bannerFile: file, bannerPreview: url };
                    });
                  }}
                />
              </Button>
            </Stack>
            <Autocomplete
              options={hospitals}
              value={eventForm.hospital}
              onChange={(_, v) => setEventForm((p) => ({ ...p, hospital: v }))}
              getOptionLabel={(h) => h?.name || "—"}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Hospital" placeholder="Select hospital…" />}
            />
            <TextField
              label="Title"
              fullWidth
              value={eventForm.title}
              onChange={(e) => {
                const title = e.target.value;
                setEventForm((p) => ({ ...p, title, ...(p.slugTouched ? {} : { slug: slugify(title) }) }));
              }}
            />
            <TextField
              label="Slug"
              fullWidth
              value={eventForm.slug}
              onChange={(e) => setEventForm((p) => ({ ...p, slugTouched: true, slug: slugify(e.target.value) }))}
              helperText="URL-friendly identifier. Must be unique."
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Event date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={eventForm.event_date}
                onChange={(e) => setEventForm((p) => ({ ...p, event_date: e.target.value }))}
              />
              <TextField
                label="Start time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={eventForm.start_time}
                onChange={(e) => setEventForm((p) => ({ ...p, start_time: e.target.value }))}
              />
              <TextField
                label="End time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={eventForm.end_time}
                onChange={(e) => setEventForm((p) => ({ ...p, end_time: e.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Location (optional)" fullWidth value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} />
              <TextField
                label="Capacity (optional)"
                type="number"
                fullWidth
                value={eventForm.capacity}
                onChange={(e) => setEventForm((p) => ({ ...p, capacity: e.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Registration required</InputLabel>
                <Select
                  value={eventForm.registration_required ? "true" : "false"}
                  label="Registration required"
                  onChange={(e) => setEventForm((p) => ({ ...p, registration_required: e.target.value === "true" }))}
                >
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={eventForm.status} label="Status" onChange={(e) => setEventForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              minRows={4}
              value={eventForm.description}
              onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
            />
            {!isAdmin && <Alert severity="info">You can view events, but only admins can create/edit/delete.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialog({ open: false, mode: "create", id: null })}>Cancel</Button>
          {isAdmin && (
            <Button variant="contained" onClick={saveEvent} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

