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
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  GetApp as DownloadIcon,
  Print as PrintIcon,
  RestaurantMenu as DietIcon,
  Assignment as OrderIcon,
  MenuBook as MealPlanIcon,
  LocalShipping as DeliveryIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  dietTypes: "/api/diet-types",
  patientDietOrders: "/api/patient-diet-orders",
  mealPlans: "/api/meal-plans",
  mealDeliveryLogs: "/api/meal-delivery-logs",
  mealRounds: "/api/meal-rounds",
  admissions: "/api/admissions",
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

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function dietOrderStatus(row) {
  if (!row.end_date) return "Active";
  const end = new Date(String(row.end_date).slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end >= today ? "Active" : "Ended";
}

export default function DietManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const token = getToken();
  const [tab, setTab] = useState(0);

  // Diet Types
  const typesReqId = useRef(0);
  const [dietTypes, setDietTypes] = useState([]);
  const [dietTypesLoading, setDietTypesLoading] = useState(false);
  const [dietTypesPage, setDietTypesPage] = useState(0);
  const [dietTypesRowsPerPage, setDietTypesRowsPerPage] = useState(10);
  const [dietTypesTotal, setDietTypesTotal] = useState(0);
  const [dietTypesSearch, setDietTypesSearch] = useState("");
  const [typeDialog, setTypeDialog] = useState({ open: false, mode: "create", id: null });
  const [typeForm, setTypeForm] = useState({ name: "", description: "" });
  const [typeSaving, setTypeSaving] = useState(false);

  // Patient Diet Orders
  const ordersReqId = useRef(0);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersRowsPerPage, setOrdersRowsPerPage] = useState(10);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersAdmissionFilter, setOrdersAdmissionFilter] = useState("");
  const [orderDialog, setOrderDialog] = useState({ open: false, mode: "create", id: null });
  const [orderForm, setOrderForm] = useState({ admission_id: "", diet_type_id: "", prescribed_by: "", start_date: "", end_date: "" });
  const [orderSaving, setOrderSaving] = useState(false);

  // Meal Plans
  const plansReqId = useRef(0);
  const [mealPlans, setMealPlans] = useState([]);
  const [mealPlansLoading, setMealPlansLoading] = useState(false);
  const [mealPlansPage, setMealPlansPage] = useState(0);
  const [mealPlansRowsPerPage, setMealPlansRowsPerPage] = useState(10);
  const [mealPlansTotal, setMealPlansTotal] = useState(0);
  const [plansDietFilter, setPlansDietFilter] = useState("");
  const [planDialog, setPlanDialog] = useState({ open: false, mode: "create", id: null });
  const [planForm, setPlanForm] = useState({ diet_type_id: "", breakfast: "", lunch: "", dinner: "", snack: "" });
  const [planSaving, setPlanSaving] = useState(false);

  // Meal Delivery Logs
  const logsReqId = useRef(0);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [deliveryLogsLoading, setDeliveryLogsLoading] = useState(false);
  const [deliveryLogsPage, setDeliveryLogsPage] = useState(0);
  const [deliveryLogsRowsPerPage, setDeliveryLogsRowsPerPage] = useState(10);
  const [deliveryLogsTotal, setDeliveryLogsTotal] = useState(0);
  const [logsAdmissionFilter, setLogsAdmissionFilter] = useState("");
  const [logDialog, setLogDialog] = useState({ open: false, mode: "create", id: null });
  const [logForm, setLogForm] = useState({ admission_id: "", meal_type: "breakfast", date: "", delivered_by: "", status: "delivered" });
  const [logSaving, setLogSaving] = useState(false);

  // Options for dropdowns
  const [admissionsOptions, setAdmissionsOptions] = useState([]);
  const [dietTypesOptions, setDietTypesOptions] = useState([]);

  // Round sheet (cook print)
  const roundSheetReqId = useRef(0);
  const [roundSheetData, setRoundSheetData] = useState([]);
  const [roundSheetDate, setRoundSheetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roundSheetLoading, setRoundSheetLoading] = useState(false);

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.main, theme.palette.primary.dark]);

  const loadDietTypes = async () => {
    const reqId = ++typesReqId.current;
    setDietTypesLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(dietTypesPage + 1),
        limit: String(dietTypesRowsPerPage),
        ...(dietTypesSearch.trim() ? { search: dietTypesSearch.trim() } : {}),
      });
      const data = await fetchJson(`${API.dietTypes}?${qs.toString()}`, { token });
      if (reqId !== typesReqId.current) return;
      setDietTypes(data?.data || []);
      setDietTypesTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== typesReqId.current) return;
      setDietTypes([]);
      setDietTypesTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load diet types" });
    } finally {
      if (reqId === typesReqId.current) setDietTypesLoading(false);
    }
  };

  const loadOrders = async () => {
    const reqId = ++ordersReqId.current;
    setOrdersLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(ordersPage + 1),
        limit: String(ordersRowsPerPage),
        ...(ordersAdmissionFilter ? { admission_id: ordersAdmissionFilter } : {}),
      });
      const data = await fetchJson(`${API.patientDietOrders}?${qs.toString()}`, { token });
      if (reqId !== ordersReqId.current) return;
      setOrders(data?.data || []);
      setOrdersTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== ordersReqId.current) return;
      setOrders([]);
      setOrdersTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load diet orders" });
    } finally {
      if (reqId === ordersReqId.current) setOrdersLoading(false);
    }
  };

  const loadMealPlans = async () => {
    const reqId = ++plansReqId.current;
    setMealPlansLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(mealPlansPage + 1),
        limit: String(mealPlansRowsPerPage),
        ...(plansDietFilter ? { diet_type_id: plansDietFilter } : {}),
      });
      const data = await fetchJson(`${API.mealPlans}?${qs.toString()}`, { token });
      if (reqId !== plansReqId.current) return;
      setMealPlans(data?.data || []);
      setMealPlansTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== plansReqId.current) return;
      setMealPlans([]);
      setMealPlansTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load meal plans" });
    } finally {
      if (reqId === plansReqId.current) setMealPlansLoading(false);
    }
  };

  const loadDeliveryLogs = async () => {
    const reqId = ++logsReqId.current;
    setDeliveryLogsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(deliveryLogsPage + 1),
        limit: String(deliveryLogsRowsPerPage),
        ...(logsAdmissionFilter ? { admission_id: logsAdmissionFilter } : {}),
      });
      const data = await fetchJson(`${API.mealDeliveryLogs}?${qs.toString()}`, { token });
      if (reqId !== logsReqId.current) return;
      setDeliveryLogs(data?.data || []);
      setDeliveryLogsTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      if (reqId !== logsReqId.current) return;
      setDeliveryLogs([]);
      setDeliveryLogsTotal(0);
      Swal.fire({ icon: "error", title: "Failed", text: e?.message || "Could not load delivery logs" });
    } finally {
      if (reqId === logsReqId.current) setDeliveryLogsLoading(false);
    }
  };

  const loadAdmissionsOptions = async () => {
    try {
      const data = await fetchJson(`${API.admissions}?limit=500&status=admitted`, { token });
      setAdmissionsOptions(data?.data || []);
    } catch {
      setAdmissionsOptions([]);
    }
  };

  const loadDietTypesOptions = async () => {
    try {
      const data = await fetchJson(`${API.dietTypes}?limit=500`, { token });
      setDietTypesOptions(data?.data || []);
    } catch {
      setDietTypesOptions([]);
    }
  };

  const loadRoundSheet = async () => {
    const reqId = ++roundSheetReqId.current;
    setRoundSheetLoading(true);
    try {
      const data = await fetchJson(`${API.mealRounds}?date=${roundSheetDate}`, { token });
      if (reqId !== roundSheetReqId.current) return;
      setRoundSheetData(data?.data || []);
    } catch (e) {
      if (reqId !== roundSheetReqId.current) return;
      setRoundSheetData([]);
      Swal.fire({ icon: "error", title: "Failed to load round sheet", text: e?.message });
    } finally {
      if (reqId === roundSheetReqId.current) setRoundSheetLoading(false);
    }
  };

  const downloadRoundSheetPdf = async () => {
    try {
      const res = await fetch(`${API.mealRounds}/pdf?date=${encodeURIComponent(roundSheetDate)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meal-round-sheet-${roundSheetDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      Swal.fire({ icon: "success", title: "Download started", timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Download failed", text: e?.message });
    }
  };

  useEffect(() => {
    if (tab === 0) loadDietTypes();
  }, [tab, dietTypesPage, dietTypesRowsPerPage, dietTypesSearch]);

  useEffect(() => {
    if (tab === 1) {
      loadAdmissionsOptions();
      loadDietTypesOptions();
      loadOrders();
    }
  }, [tab, ordersPage, ordersRowsPerPage, ordersAdmissionFilter]);

  useEffect(() => {
    if (tab === 2) {
      loadDietTypesOptions();
      loadMealPlans();
    }
  }, [tab, mealPlansPage, mealPlansRowsPerPage, plansDietFilter]);

  useEffect(() => {
    if (tab === 3) {
      loadAdmissionsOptions();
      loadDeliveryLogs();
    }
  }, [tab, deliveryLogsPage, deliveryLogsRowsPerPage, logsAdmissionFilter]);

  useEffect(() => {
    if (tab === 4) loadRoundSheet();
  }, [tab, roundSheetDate]);

  const refreshCurrent = () => {
    if (tab === 0) loadDietTypes();
    if (tab === 1) loadOrders();
    if (tab === 2) loadMealPlans();
    if (tab === 3) loadDeliveryLogs();
    if (tab === 4) loadRoundSheet();
  };

  // ——— Diet Type CRUD ———
  const openTypeCreate = () => {
    setTypeForm({ name: "", description: "" });
    setTypeDialog({ open: true, mode: "create", id: null });
  };
  const openTypeEdit = (row) => {
    setTypeForm({ name: row.name || "", description: row.description || "" });
    setTypeDialog({ open: true, mode: "edit", id: row.id });
  };
  const saveType = async () => {
    if (!typeForm.name?.trim()) return Swal.fire({ icon: "warning", title: "Name required" });
    setTypeSaving(true);
    try {
      if (typeDialog.mode === "create") {
        await fetchJson(API.dietTypes, { method: "POST", token, body: { name: typeForm.name.trim(), description: typeForm.description?.trim() || null } });
        Swal.fire({ icon: "success", title: "Diet type created", timer: 1500, showConfirmButton: false });
      } else {
        await fetchJson(`${API.dietTypes}/${typeDialog.id}`, { method: "PUT", token, body: { name: typeForm.name.trim(), description: typeForm.description?.trim() || null } });
        Swal.fire({ icon: "success", title: "Diet type updated", timer: 1500, showConfirmButton: false });
      }
      setTypeDialog({ open: false, mode: "create", id: null });
      loadDietTypes();
      loadDietTypesOptions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setTypeSaving(false);
    }
  };
  const deleteType = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: "Delete diet type?", text: "This cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: theme.palette.error.main });
    if (!isConfirmed) return;
    try {
      await fetchJson(`${API.dietTypes}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadDietTypes();
      loadDietTypesOptions();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  // ——— Patient Diet Order CRUD ———
  const openOrderCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setOrderForm({ admission_id: "", diet_type_id: "", prescribed_by: "", start_date: today, end_date: "" });
    setOrderDialog({ open: true, mode: "create", id: null });
  };
  const openOrderEdit = (row) => {
    setOrderForm({
      admission_id: row.admission_id || "",
      diet_type_id: row.diet_type_id || "",
      prescribed_by: row.prescribed_by || "",
      start_date: row.start_date ? String(row.start_date).slice(0, 10) : "",
      end_date: row.end_date ? String(row.end_date).slice(0, 10) : "",
    });
    setOrderDialog({ open: true, mode: "edit", id: row.id });
  };
  const saveOrder = async () => {
    if (!orderForm.admission_id || !orderForm.diet_type_id || !orderForm.start_date) return Swal.fire({ icon: "warning", title: "Admission, diet type, and start date are required" });
    setOrderSaving(true);
    try {
      const body = {
        admission_id: orderForm.admission_id,
        diet_type_id: orderForm.diet_type_id,
        prescribed_by: orderForm.prescribed_by || null,
        start_date: orderForm.start_date,
        end_date: orderForm.end_date || null,
      };
      if (orderDialog.mode === "create") {
        await fetchJson(API.patientDietOrders, { method: "POST", token, body });
        Swal.fire({ icon: "success", title: "Diet order created", timer: 1500, showConfirmButton: false });
      } else {
        await fetchJson(`${API.patientDietOrders}/${orderDialog.id}`, { method: "PUT", token, body });
        Swal.fire({ icon: "success", title: "Diet order updated", timer: 1500, showConfirmButton: false });
      }
      setOrderDialog({ open: false, mode: "create", id: null });
      loadOrders();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setOrderSaving(false);
    }
  };
  const deleteOrder = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: "Delete diet order?", icon: "warning", showCancelButton: true, confirmButtonColor: theme.palette.error.main });
    if (!isConfirmed) return;
    try {
      await fetchJson(`${API.patientDietOrders}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadOrders();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  // ——— Meal Plan CRUD ———
  const openPlanCreate = () => {
    setPlanForm({ diet_type_id: "", breakfast: "", lunch: "", dinner: "", snack: "" });
    setPlanDialog({ open: true, mode: "create", id: null });
  };
  const openPlanEdit = (row) => {
    setPlanForm({
      diet_type_id: row.diet_type_id || "",
      breakfast: row.breakfast || "",
      lunch: row.lunch || "",
      dinner: row.dinner || "",
      snack: row.snack || "",
    });
    setPlanDialog({ open: true, mode: "edit", id: row.id });
  };
  const savePlan = async () => {
    if (!planForm.diet_type_id) return Swal.fire({ icon: "warning", title: "Diet type is required" });
    setPlanSaving(true);
    try {
      const body = {
        diet_type_id: planForm.diet_type_id,
        breakfast: planForm.breakfast?.trim() || null,
        lunch: planForm.lunch?.trim() || null,
        dinner: planForm.dinner?.trim() || null,
        snack: planForm.snack?.trim() || null,
      };
      if (planDialog.mode === "create") {
        await fetchJson(API.mealPlans, { method: "POST", token, body });
        Swal.fire({ icon: "success", title: "Meal plan created", timer: 1500, showConfirmButton: false });
      } else {
        await fetchJson(`${API.mealPlans}/${planDialog.id}`, { method: "PUT", token, body });
        Swal.fire({ icon: "success", title: "Meal plan updated", timer: 1500, showConfirmButton: false });
      }
      setPlanDialog({ open: false, mode: "create", id: null });
      loadMealPlans();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setPlanSaving(false);
    }
  };
  const deletePlan = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: "Delete meal plan?", icon: "warning", showCancelButton: true, confirmButtonColor: theme.palette.error.main });
    if (!isConfirmed) return;
    try {
      await fetchJson(`${API.mealPlans}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadMealPlans();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  // ——— Meal Delivery Log CRUD ———
  const openLogCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setLogForm({ admission_id: "", meal_type: "breakfast", date: today, delivered_by: "", status: "delivered" });
    setLogDialog({ open: true, mode: "create", id: null });
  };
  const openLogEdit = (row) => {
    setLogForm({
      admission_id: row.admission_id || "",
      meal_type: row.meal_type || "breakfast",
      date: row.date ? String(row.date).slice(0, 10) : "",
      delivered_by: row.delivered_by || "",
      status: row.status || "delivered",
    });
    setLogDialog({ open: true, mode: "edit", id: row.id });
  };
  const saveLog = async () => {
    if (!logForm.admission_id || !logForm.date) return Swal.fire({ icon: "warning", title: "Admission and date are required" });
    setLogSaving(true);
    try {
      const body = {
        admission_id: logForm.admission_id,
        meal_type: logForm.meal_type,
        date: logForm.date,
        delivered_by: logForm.delivered_by || null,
        status: logForm.status,
      };
      if (logDialog.mode === "create") {
        await fetchJson(API.mealDeliveryLogs, { method: "POST", token, body });
        Swal.fire({ icon: "success", title: "Delivery log created", timer: 1500, showConfirmButton: false });
      } else {
        await fetchJson(`${API.mealDeliveryLogs}/${logDialog.id}`, { method: "PUT", token, body });
        Swal.fire({ icon: "success", title: "Delivery log updated", timer: 1500, showConfirmButton: false });
      }
      setLogDialog({ open: false, mode: "create", id: null });
      loadDeliveryLogs();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    } finally {
      setLogSaving(false);
    }
  };
  const deleteLog = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: "Delete delivery log?", icon: "warning", showCancelButton: true, confirmButtonColor: theme.palette.error.main });
    if (!isConfirmed) return;
    try {
      await fetchJson(`${API.mealDeliveryLogs}/${id}`, { method: "DELETE", token });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      loadDeliveryLogs();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e?.message });
    }
  };

  const admissionLabel = (a) => {
    if (!a) return "—";
    const patient = a.patient?.full_name || a.patient?.user?.full_name || a.patient_id;
    const bed = a.bed?.bed_number ? `Bed ${a.bed.bed_number}` : "";
    return [patient, bed].filter(Boolean).join(" • ") || a.id?.slice(0, 8) || "—";
  };

  return (
    <Card sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      <Box sx={{ p: 2.5, background: heroGradient, color: "white" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
            Diet & Meals
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>Inpatient diet types, orders, meal plans, and delivery logs</Typography>
        </Stack>
      </Box>

      <CardContent sx={{ p: 0 }}>
        {isMobile ? (
          <FormControl fullWidth size="small" sx={{ px: 2, py: 1.5 }}>
            <InputLabel id="diet-section-label">Section</InputLabel>
            <Select
              labelId="diet-section-label"
              value={tab}
              label="Section"
              onChange={(e) => setTab(Number(e.target.value))}
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value={0}>Diet types</MenuItem>
              <MenuItem value={1}>Diet orders</MenuItem>
              <MenuItem value={2}>Meal plans</MenuItem>
              <MenuItem value={3}>Delivery logs</MenuItem>
              <MenuItem value={4}>Round sheet</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main } }}>
            <Tab icon={<DietIcon />} iconPosition="start" label="Diet types" />
            <Tab icon={<OrderIcon />} iconPosition="start" label="Diet orders" />
            <Tab icon={<MealPlanIcon />} iconPosition="start" label="Meal plans" />
            <Tab icon={<DeliveryIcon />} iconPosition="start" label="Delivery logs" />
            <Tab icon={<PrintIcon />} iconPosition="start" label="Round sheet" />
          </Tabs>
        )}
        <Divider />

        {/* Tab 0: Diet types */}
        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField size="small" fullWidth label="Search (name, description)" value={dietTypesSearch} onChange={(e) => { setDietTypesSearch(e.target.value); setDietTypesPage(0); }} />
              <Button variant="contained" startIcon={<AddIcon />} onClick={openTypeCreate} sx={{ fontWeight: 900, minWidth: { xs: "100%", md: 140 } }}>Add type</Button>
            </Stack>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 96, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dietTypesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : dietTypes.length ? (
                    dietTypes.map((row, idx) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{dietTypesPage * dietTypesRowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{row.name}</TableCell>
                        <TableCell sx={{ maxWidth: 360, display: { xs: "none", md: "table-cell" } }}>{row.description || "—"}</TableCell>
                        <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }}>
                          <Box sx={{ display: { xs: "grid", md: "flex" }, gridTemplateColumns: { xs: "repeat(2, auto)", md: "unset" }, flexDirection: { md: "row" }, gap: 0.5, justifyContent: "flex-end", justifyItems: { xs: "end" }, maxWidth: "100%" }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openTypeEdit(row)} aria-label="Edit"><EditIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => deleteType(row.id)} aria-label="Delete"><DeleteIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 3 }}><Typography color="text.secondary">No diet types found.</Typography></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={dietTypesTotal} page={dietTypesPage} onPageChange={(_, p) => setDietTypesPage(p)} rowsPerPage={dietTypesRowsPerPage} onRowsPerPageChange={(e) => { setDietTypesRowsPerPage(parseInt(e.target.value, 10)); setDietTypesPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}

        {/* Tab 1: Diet orders */}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Filter by admission</InputLabel>
                <Select value={ordersAdmissionFilter} label="Filter by admission" onChange={(e) => { setOrdersAdmissionFilter(e.target.value); setOrdersPage(0); }}>
                  <MenuItem value="">All</MenuItem>
                  {admissionsOptions.map((a) => (
                    <MenuItem key={a.id} value={a.id}>{admissionLabel(a)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openOrderCreate} sx={{ fontWeight: 900 }}>Add order</Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              You can add multiple diet orders per admission. Edit an order to extend the end date, or add a new order when the patient stays longer.
            </Typography>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Admission</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Diet type</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Start</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>End</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Prescribed by</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 96, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ordersLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : orders.length ? (
                    orders.map((row, idx) => {
                      const status = dietOrderStatus(row);
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{ordersPage * ordersRowsPerPage + idx + 1}</TableCell>
                          <TableCell>{admissionLabel(row.admission)}</TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{row.dietType?.name ?? "—"}</TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{formatDate(row.start_date)}</TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{formatDate(row.end_date)}</TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Chip size="small" label={status} color={status === "Active" ? "success" : "default"} variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{row.prescribedBy?.user?.full_name ?? "—"}</TableCell>
                          <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }}>
                            <Box sx={{ display: { xs: "grid", md: "flex" }, gridTemplateColumns: { xs: "repeat(2, auto)", md: "unset" }, flexDirection: { md: "row" }, gap: 0.5, justifyContent: "flex-end", justifyItems: { xs: "end" }, maxWidth: "100%" }}>
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => openOrderEdit(row)} aria-label="Edit"><EditIcon fontSize="inherit" /></IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => deleteOrder(row.id)} aria-label="Delete"><DeleteIcon fontSize="inherit" /></IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 3 }}><Typography color="text.secondary">No diet orders found.</Typography></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={ordersTotal} page={ordersPage} onPageChange={(_, p) => setOrdersPage(p)} rowsPerPage={ordersRowsPerPage} onRowsPerPageChange={(e) => { setOrdersRowsPerPage(parseInt(e.target.value, 10)); setOrdersPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}

        {/* Tab 2: Meal plans — cards */}
        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Filter by diet type</InputLabel>
                <Select value={plansDietFilter} label="Filter by diet type" onChange={(e) => { setPlansDietFilter(e.target.value); setMealPlansPage(0); }}>
                  <MenuItem value="">All</MenuItem>
                  {dietTypesOptions.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openPlanCreate} sx={{ fontWeight: 900 }}>Add meal plan</Button>
            </Stack>
            {mealPlansLoading ? (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Loading meal plans…</Typography>
              </Stack>
            ) : mealPlans.length ? (
              <Stack spacing={2}>
                {mealPlans.map((row, idx) => (
                  <Card
                    key={row.id}
                    variant="outlined"
                    sx={{
                      width: "100%",
                      borderRadius: 2,
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
                      transition: "box-shadow 0.2s ease",
                    }}
                  >
                    <Box sx={{ px: 2.5, py: 1.5, bgcolor: "rgba(0,0,0,0.04)", borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Chip label={mealPlansPage * mealPlansRowsPerPage + idx + 1} size="small" sx={{ fontWeight: 800, minWidth: 32 }} />
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{row.dietType?.name ?? "—"}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary" onClick={() => openPlanEdit(row)} aria-label="Edit"><EditIcon fontSize="inherit" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => deletePlan(row.id)} aria-label="Delete"><DeleteIcon fontSize="inherit" /></IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                    <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                      <Stack divider={<Divider />}>
                        <Box sx={{ px: 2.5, py: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Breakfast</Typography>
                          <Typography sx={{ mt: 0.5 }}>{row.breakfast || "—"}</Typography>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Lunch</Typography>
                          <Typography sx={{ mt: 0.5 }}>{row.lunch || "—"}</Typography>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Dinner</Typography>
                          <Typography sx={{ mt: 0.5 }}>{row.dinner || "—"}</Typography>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Snack</Typography>
                          <Typography sx={{ mt: 0.5 }}>{row.snack || "—"}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Typography color="text.secondary">No meal plans found.</Typography>
              </Box>
            )}
            {mealPlans.length > 0 && (
              <TablePagination component="div" count={mealPlansTotal} page={mealPlansPage} onPageChange={(_, p) => setMealPlansPage(p)} rowsPerPage={mealPlansRowsPerPage} onRowsPerPageChange={(e) => { setMealPlansRowsPerPage(parseInt(e.target.value, 10)); setMealPlansPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} sx={{ borderTop: "1px solid", borderColor: "divider", mt: 2 }} />
            )}
          </Box>
        )}

        {/* Tab 3: Delivery logs */}
        {tab === 3 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Filter by admission</InputLabel>
                <Select value={logsAdmissionFilter} label="Filter by admission" onChange={(e) => { setLogsAdmissionFilter(e.target.value); setDeliveryLogsPage(0); }}>
                  <MenuItem value="">All</MenuItem>
                  {admissionsOptions.map((a) => (
                    <MenuItem key={a.id} value={a.id}>{admissionLabel(a)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openLogCreate} sx={{ fontWeight: 900 }}>Log delivery</Button>
            </Stack>
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 140, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Admission</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 90 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Meal</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 110 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Delivered by</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 96, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveryLogsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : deliveryLogs.length ? (
                    deliveryLogs.map((row, idx) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{deliveryLogsPage * deliveryLogsRowsPerPage + idx + 1}</TableCell>
                        <TableCell>{admissionLabel(row.admission)}</TableCell>
                        <TableCell sx={{ textTransform: "capitalize", display: { xs: "none", sm: "table-cell" } }}>{row.meal_type}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{formatDate(row.date)}</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{row.deliveredBy?.user?.full_name ?? "—"}</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><Chip size="small" label={row.status} color={row.status === "delivered" ? "success" : "default"} variant="outlined" /></TableCell>
                        <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }}>
                          <Box sx={{ display: { xs: "grid", md: "flex" }, gridTemplateColumns: { xs: "repeat(2, auto)", md: "unset" }, flexDirection: { md: "row" }, gap: 0.5, justifyContent: "flex-end", justifyItems: { xs: "end" }, maxWidth: "100%" }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openLogEdit(row)} aria-label="Edit"><EditIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => deleteLog(row.id)} aria-label="Delete"><DeleteIcon fontSize="inherit" /></IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 3 }}><Typography color="text.secondary">No delivery logs found.</Typography></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={deliveryLogsTotal} page={deliveryLogsPage} onPageChange={(_, p) => setDeliveryLogsPage(p)} rowsPerPage={deliveryLogsRowsPerPage} onRowsPerPageChange={(e) => { setDeliveryLogsRowsPerPage(parseInt(e.target.value, 10)); setDeliveryLogsPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
          </Box>
        )}

        {/* Tab 4: Round sheet (cook download PDF) */}
        {tab === 4 && (
          <Box sx={{ p: 2 }} id="meal-round-sheet">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 2, flexWrap: "wrap" }}>
              <TextField
                size="small"
                type="date"
                label="Date"
                value={roundSheetDate}
                onChange={(e) => setRoundSheetDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <Button variant="outlined" onClick={loadRoundSheet} disabled={roundSheetLoading} sx={{ fontWeight: 800 }}>
                {roundSheetLoading ? "Loading…" : "Refresh"}
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={downloadRoundSheetPdf}
                disabled={roundSheetLoading}
                sx={{ fontWeight: 900 }}
              >
                Download PDF
              </Button>
            </Stack>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Meal rounds for {formatDate(roundSheetDate)}. Download PDF (with hospital header) and take to the ward to ask patients what they need before delivery.
            </Typography>
              {roundSheetLoading ? (
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <CircularProgress size={24} />
                  <Typography color="text.secondary">Loading…</Typography>
                </Stack>
              ) : roundSheetData.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>No admitted patients with diet orders for this date.</Typography>
              ) : (
                <Stack spacing={2}>
                  {roundSheetData.map((row, idx) => (
                    <Card key={row.admission_id || idx} variant="outlined" sx={{ breakInside: "avoid", borderRadius: 2 }}>
                      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 1.5, pb: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                          <Typography sx={{ fontWeight: 800 }}>#{idx + 1}</Typography>
                          <Typography sx={{ fontWeight: 800 }}>{row.ward_name} — Bed {row.bed_number}</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{row.patient_name}</Typography>
                          {row.diet_type_name && <Chip size="small" label={row.diet_type_name} color="primary" variant="outlined" />}
                        </Stack>
                        <Stack spacing={0.75}>
                          <Box><Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>Breakfast</Typography><Typography variant="body2">{row.breakfast || "—"}</Typography></Box>
                          <Box><Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>Lunch</Typography><Typography variant="body2">{row.lunch || "—"}</Typography></Box>
                          <Box><Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>Dinner</Typography><Typography variant="body2">{row.dinner || "—"}</Typography></Box>
                          <Box><Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>Snack</Typography><Typography variant="body2">{row.snack || "—"}</Typography></Box>
                        </Stack>
                        <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px dashed", borderColor: "divider" }}>
                          <Typography variant="caption" color="text.secondary">Notes / patient choice: _________________________</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
        )}
      </CardContent>

      {/* Diet type dialog */}
      <Dialog open={typeDialog.open} onClose={() => setTypeDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{typeDialog.mode === "create" ? "Add diet type" : "Edit diet type"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField fullWidth size="small" label="Name" value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} required />
            <TextField fullWidth size="small" label="Description" value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} multiline rows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveType} disabled={typeSaving}>{typeSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Diet order dialog */}
      <Dialog open={orderDialog.open} onClose={() => setOrderDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{orderDialog.mode === "create" ? "Add diet order" : "Edit diet order"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Admission</InputLabel>
              <Select value={orderForm.admission_id} label="Admission" onChange={(e) => setOrderForm((p) => ({ ...p, admission_id: e.target.value }))}>
                <MenuItem value="">Select admission</MenuItem>
                {admissionsOptions.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{admissionLabel(a)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" required>
              <InputLabel>Diet type</InputLabel>
              <Select value={orderForm.diet_type_id} label="Diet type" onChange={(e) => setOrderForm((p) => ({ ...p, diet_type_id: e.target.value }))}>
                <MenuItem value="">Select diet type</MenuItem>
                {dietTypesOptions.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" type="date" label="Start date" value={orderForm.start_date} onChange={(e) => setOrderForm((p) => ({ ...p, start_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField fullWidth size="small" type="date" label="End date (optional)" value={orderForm.end_date} onChange={(e) => setOrderForm((p) => ({ ...p, end_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveOrder} disabled={orderSaving}>{orderSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Meal plan dialog */}
      <Dialog open={planDialog.open} onClose={() => setPlanDialog((p) => ({ ...p, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle>{planDialog.mode === "create" ? "Add meal plan" : "Edit meal plan"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Diet type</InputLabel>
              <Select value={planForm.diet_type_id} label="Diet type" onChange={(e) => setPlanForm((p) => ({ ...p, diet_type_id: e.target.value }))}>
                <MenuItem value="">Select diet type</MenuItem>
                {dietTypesOptions.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="Breakfast" value={planForm.breakfast} onChange={(e) => setPlanForm((p) => ({ ...p, breakfast: e.target.value }))} multiline rows={2} placeholder="e.g. Oatmeal, fruit" />
            <TextField fullWidth size="small" label="Lunch" value={planForm.lunch} onChange={(e) => setPlanForm((p) => ({ ...p, lunch: e.target.value }))} multiline rows={2} placeholder="e.g. Grilled chicken, rice, vegetables" />
            <TextField fullWidth size="small" label="Dinner" value={planForm.dinner} onChange={(e) => setPlanForm((p) => ({ ...p, dinner: e.target.value }))} multiline rows={2} placeholder="e.g. Fish, salad" />
            <TextField fullWidth size="small" label="Snack" value={planForm.snack} onChange={(e) => setPlanForm((p) => ({ ...p, snack: e.target.value }))} multiline rows={2} placeholder="e.g. Yogurt, nuts" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={savePlan} disabled={planSaving}>{planSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Delivery log dialog */}
      <Dialog open={logDialog.open} onClose={() => setLogDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{logDialog.mode === "create" ? "Log meal delivery" : "Edit delivery log"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Admission</InputLabel>
              <Select value={logForm.admission_id} label="Admission" onChange={(e) => setLogForm((p) => ({ ...p, admission_id: e.target.value }))}>
                <MenuItem value="">Select admission</MenuItem>
                {admissionsOptions.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{admissionLabel(a)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Meal type</InputLabel>
              <Select value={logForm.meal_type} label="Meal type" onChange={(e) => setLogForm((p) => ({ ...p, meal_type: e.target.value }))}>
                <MenuItem value="breakfast">Breakfast</MenuItem>
                <MenuItem value="lunch">Lunch</MenuItem>
                <MenuItem value="dinner">Dinner</MenuItem>
                <MenuItem value="snack">Snack</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth size="small" type="date" label="Date" value={logForm.date} onChange={(e) => setLogForm((p) => ({ ...p, date: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={logForm.status} label="Status" onChange={(e) => setLogForm((p) => ({ ...p, status: e.target.value }))}>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="skipped">Skipped</MenuItem>
                <MenuItem value="refused">Refused</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveLog} disabled={logSaving}>{logSaving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
