import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  LocalHospital,
  EventNote,
  People,
  RecordVoiceOver,
  Science,
  LocalPharmacy,
  ReceiptLong,
  Hotel,
  Inventory,
  Bed,
  Person,
  Description,
  PersonOff,
  Campaign,
  Business,
  Category,
} from "@mui/icons-material";

const API_STATISTICS = "/api/statistics";
const API_APPOINTMENTS_CHART = "/api/statistics/appointments/chart";
const API_REVENUE_CHART = "/api/statistics/revenue/chart";

async function fetchJson(url, { token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const PIE_COLORS = ["#00897b", "#26a69a", "#4db6ac", "#80cbc4", "#b2dfdb", "#e0f2f1"];
const BAR_COLORS = ["#00897b", "#26a69a", "#4db6ac"];

function objToPieData(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj).map(([name, value]) => ({ name, value: Number(value) || 0 }));
}

function StatCard({ title, value, icon: Icon, subtitle, compact }) {
  const theme = useTheme();
  const cardContent = (
    <>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, width: "100%" }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography color="text.secondary" variant="body2" fontWeight="500" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {value != null ? value.toLocaleString() : "—"}
          </Typography>
          {subtitle != null && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {Icon && (
          <Box sx={{ color: theme.palette.primary.main, opacity: 0.85, flexShrink: 0 }}>
            <Icon sx={{ fontSize: 32 }} />
          </Box>
        )}
      </Box>
    </>
  );

  if (compact) {
    return (
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          height: "100%",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          transition: "box-shadow 0.2s ease",
          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {cardContent}
        </Box>
      </Box>
    );
  }

  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
        {cardContent}
      </CardContent>
    </Card>
  );
}

function PieChartCard({ title, data, emptyMessage }) {
  const chartData = Array.isArray(data) ? data : objToPieData(data);
  const hasData = chartData.length > 0 && chartData.some((d) => d.value > 0);
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, ""]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage || "No data"}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartCard({ title, data, dataKey = "count", emptyMessage, formatValue }) {
  const hasData = Array.isArray(data) && data.length > 0;
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatValue} />
              <Tooltip formatter={formatValue ? (v) => [formatValue(v), ""] : undefined} />
              <Bar dataKey={dataKey} fill={BAR_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage || "No data"}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const TAB_CONFIG = [
  { id: "overview", label: "Overview" },
  { id: "appointmentsConsultations", label: "Appointments & Consultations" },
  { id: "laboratory", label: "Laboratory" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "billing", label: "Billing" },
  { id: "wardsBedsAdmissions", label: "Wards, Beds & Admissions" },
  { id: "inventory", label: "Inventory" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
const MONTHS = [
  { value: "", label: "All months" },
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [chartYear, setChartYear] = useState(currentYear);
  const [chartMonth, setChartMonth] = useState("");
  const [appointmentsChartData, setAppointmentsChartData] = useState([]);
  const [appointmentsChartLoading, setAppointmentsChartLoading] = useState(false);
  const [revenueChartYear, setRevenueChartYear] = useState(currentYear);
  const [revenueChartMonth, setRevenueChartMonth] = useState("");
  const [revenueChartData, setRevenueChartData] = useState([]);
  const [revenueChartLoading, setRevenueChartLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setError("Not authenticated");
      return;
    }
    fetchJson(API_STATISTICS, { token })
      .then((res) => {
        if (res.success && res.data) setStats(res.data);
        else setError(res.message || "Invalid response");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 1) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setAppointmentsChartLoading(true);
    const params = new URLSearchParams({ year: chartYear });
    if (chartMonth !== "") params.set("month", chartMonth);
    fetchJson(`${API_APPOINTMENTS_CHART}?${params}`, { token })
      .then((res) => {
        if (res.success && res.data?.bars) setAppointmentsChartData(res.data.bars);
        else setAppointmentsChartData([]);
      })
      .catch(() => setAppointmentsChartData([]))
      .finally(() => setAppointmentsChartLoading(false));
  }, [tab, chartYear, chartMonth]);

  useEffect(() => {
    if (tab !== 4) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setRevenueChartLoading(true);
    const params = new URLSearchParams({ year: revenueChartYear });
    if (revenueChartMonth !== "") params.set("month", revenueChartMonth);
    fetchJson(`${API_REVENUE_CHART}?${params}`, { token })
      .then((res) => {
        if (res.success && res.data?.bars) setRevenueChartData(res.data.bars);
        else setRevenueChartData([]);
      })
      .catch(() => setRevenueChartData([]))
      .finally(() => setRevenueChartLoading(false));
  }, [tab, revenueChartYear, revenueChartMonth]);

  // Always show page shell (title + tabs) so navigation doesn't cause full-page spinner → content blink
  const d = stats;
  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Hospital Statistics
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        {TAB_CONFIG.map((t, i) => (
          <Tab key={t.id} label={t.label} id={`stats-tab-${i}`} aria-controls={`stats-tabpanel-${i}`} />
        ))}
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", width: "100%" }}>
          <CircularProgress size={48} />
        </Box>
      ) : error || !stats ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error">{error || "Failed to load statistics"}</Typography>
        </Box>
      ) : (
        <>

      {/* Overview — 4 cards per row, equal size, full width (CSS Grid) + Staff/Users + Events & News */}
      {tab === 0 && (
        <Box role="tabpanel" id="stats-tabpanel-0" sx={{ width: "100%", maxWidth: "100%" }}>
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 2,
              mb: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            {[
              { title: "Hospitals", value: d.overview?.totalHospitals, icon: LocalHospital },
              { title: "Departments", value: d.overview?.totalDepartments ?? d.departments?.total, icon: Business },
              { title: "Services", value: d.overview?.totalServices ?? d.services?.total, icon: Category },
              { title: "Staff", value: d.overview?.totalStaff, icon: Person },
              { title: "Patients", value: d.overview?.totalPatients, icon: People },
              { title: "Appointments", value: d.overview?.totalAppointments, icon: EventNote },
              { title: "Consultations", value: d.overview?.totalConsultations, icon: RecordVoiceOver },
              { title: "Total Revenue", value: d.overview?.totalRevenue, icon: ReceiptLong, subtitle: "All time" },
              { title: "Active Admissions", value: d.overview?.activeAdmissions, icon: Hotel },
              { title: "Total Beds", value: d.overview?.totalBeds, icon: Bed },
            ].map((item) => (
              <StatCard
                key={item.title}
                compact
                title={item.title}
                value={item.value}
                icon={item.icon}
                subtitle={item.subtitle}
              />
            ))}
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Patients
          </Typography>
          <Box sx={{ width: "100%", mb: 2 }}>
            <StatCard title="Active Patients" value={d.patients?.active} icon={People} />
          </Box>
          <Box sx={{ width: "100%", mb: 2 }}>
            <PieChartCard title="Patients by Status" data={d.patients?.byStatus} />
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Medical Reports
          </Typography>
          <Box sx={{ width: "100%", mb: 2 }}>
            <StatCard title="Medical Reports" value={d.medicalReports?.total} icon={Description} />
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Users
          </Typography>
          <Box sx={{ width: "100%", mb: 2 }}>
            <StatCard title="Users" value={d.users?.total} icon={PersonOff} />
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Events & News
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Events" value={d.eventsAndNews?.totalEvents} icon={Campaign} />
            <StatCard title="News" value={d.eventsAndNews?.totalNews} />
          </Box>
        </Box>
      )}

      {/* Appointments & Consultations */}
      {tab === 1 && (
        <Box role="tabpanel" id="stats-tabpanel-1" sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
            Appointments
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 2,
              mb: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Total Appointments" value={d.appointments?.total} icon={EventNote} />
            <StatCard title="Today" value={d.appointments?.today} />
            <StatCard title="This Week" value={d.appointments?.thisWeek} />
            <StatCard title="This Month" value={d.appointments?.thisMonth} />
          </Box>
          <Box sx={{ width: "100%", mb: 2 }}>
            <PieChartCard title="Appointments by Status" data={d.appointments?.byStatus} />
          </Box>
          <Box sx={{ width: "100%", mb: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel id="chart-year-label">Year</InputLabel>
                <Select
                  labelId="chart-year-label"
                  value={chartYear}
                  label="Year"
                  onChange={(e) => setChartYear(Number(e.target.value))}
                >
                  {YEARS.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="chart-month-label">Month</InputLabel>
                <Select
                  labelId="chart-month-label"
                  value={chartMonth}
                  label="Month"
                  onChange={(e) => setChartMonth(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m.value === "" ? "all" : m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {appointmentsChartLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 220 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <BarChartCard
                title={chartMonth ? `Appointments by day (${chartYear}, ${MONTHS.find((m) => m.value === chartMonth)?.label ?? chartMonth})` : `Appointments by month (${chartYear})`}
                data={appointmentsChartData}
              />
            )}
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Consultations
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Total Consultations" value={d.consultations?.total} icon={RecordVoiceOver} />
            <StatCard title="Consultations This Month" value={d.consultations?.thisMonth} />
          </Box>
        </Box>
      )}

      {/* Laboratory */}
      {tab === 2 && (
        <Box role="tabpanel" id="stats-tabpanel-2" sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
            Laboratory
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 2,
              mb: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Lab Orders" value={d.laboratory?.totalOrders} icon={Science} />
            <StatCard title="Lab Results" value={d.laboratory?.totalResults} />
            <StatCard title="Lab Tests" value={d.laboratory?.totalTests} />
          </Box>
          <Box sx={{ width: "100%" }}>
            <PieChartCard title="Lab Orders by Status" data={d.laboratory?.byStatus} />
          </Box>
        </Box>
      )}

      {/* Pharmacy */}
      {tab === 3 && (
        <Box role="tabpanel" id="stats-tabpanel-3" sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
            Pharmacy
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Prescriptions" value={d.pharmacy?.totalPrescriptions} icon={LocalPharmacy} />
            <StatCard title="Dispensed" value={d.pharmacy?.totalDispensed} />
            <StatCard title="Medications" value={d.pharmacy?.totalMedications} />
          </Box>
        </Box>
      )}

      {/* Billing */}
      {tab === 4 && (
        <Box role="tabpanel" id="stats-tabpanel-4" sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
            Billing
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 2,
              mb: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Total Bills" value={d.billing?.totalBills} icon={ReceiptLong} />
            <StatCard title="Total Revenue" value={d.billing?.totalRevenue} />
            <StatCard title="Revenue This Month" value={d.billing?.revenueThisMonth} />
          </Box>
          <Box sx={{ width: "100%", mb: 2 }}>
            <PieChartCard title="Bills by Status" data={d.billing?.byStatus} />
          </Box>
          <Box sx={{ width: "100%", mb: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel id="revenue-year-label">Year</InputLabel>
                <Select
                  labelId="revenue-year-label"
                  value={revenueChartYear}
                  label="Year"
                  onChange={(e) => setRevenueChartYear(Number(e.target.value))}
                >
                  {YEARS.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="revenue-month-label">Month</InputLabel>
                <Select
                  labelId="revenue-month-label"
                  value={revenueChartMonth}
                  label="Month"
                  onChange={(e) => setRevenueChartMonth(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m.value === "" ? "all" : m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {revenueChartLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 220 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <BarChartCard
                title={revenueChartMonth ? `Revenue by day (${revenueChartYear}, ${MONTHS.find((m) => m.value === revenueChartMonth)?.label ?? revenueChartMonth})` : `Revenue by month (${revenueChartYear})`}
                data={revenueChartData}
                dataKey="amount"
                formatValue={(v) => (typeof v === "number" ? v.toLocaleString("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }) : v)}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Wards, Beds & Admissions */}
      {tab === 5 && (
        <Box role="tabpanel" id="stats-tabpanel-5" sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
            Wards & Beds
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 2,
              mb: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Wards" value={d.wardsAndBeds?.totalWards} icon={Hotel} />
            <StatCard title="Beds" value={d.wardsAndBeds?.totalBeds} icon={Bed} />
          </Box>
          <Box sx={{ width: "100%", mb: 2 }}>
            <PieChartCard title="Beds by Status" data={d.wardsAndBeds?.bedsByStatus} />
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Admissions
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 2,
              mb: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Total Admissions" value={d.admissions?.total} icon={Hotel} />
            <StatCard title="Currently Admitted" value={d.admissions?.currentlyAdmitted} />
            <StatCard title="Discharged This Month" value={d.admissions?.dischargedThisMonth} />
          </Box>
          <Box sx={{ width: "100%" }}>
            <PieChartCard title="Admissions by Status" data={d.admissions?.byStatus} />
          </Box>
        </Box>
      )}

      {/* Inventory */}
      {tab === 6 && (
        <Box role="tabpanel" id="stats-tabpanel-6" sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
            Inventory
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 2,
              mb: 2,
              "& > *": { minWidth: 0 },
              "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
              "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
            }}
          >
            <StatCard title="Inventory Items" value={d.inventory?.totalItems} icon={Inventory} />
            <StatCard title="Low Stock" value={d.inventory?.lowStockCount} />
            <StatCard title="Suppliers" value={d.inventory?.totalSuppliers} />
            <StatCard title="Purchase Orders" value={d.inventory?.totalPurchaseOrders} />
          </Box>
          <Box sx={{ width: "100%" }}>
            <PieChartCard title="Purchase Orders by Status" data={d.inventory?.purchaseOrdersByStatus} />
          </Box>
        </Box>
      )}
        </>
      )}
    </Box>
  );
}
