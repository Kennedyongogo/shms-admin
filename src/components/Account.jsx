import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress,
  useTheme,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import {
  Person as PersonIcon,
  Work as WorkIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Insights as InsightsIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_ME = "/api/auth/me";
const API_MY_ACTIVITY = "/api/statistics/my-activity";
const API_MY_ACTIVITY_CHART = "/api/statistics/my-activity/chart";
const API_MY_ACTIVITY_DETAIL = "/api/statistics/my-activity/detail";

const getToken = () => localStorage.getItem("token");

async function fetchJson(url, { token } = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  return data;
}

const BAR_COLOR = "#00897b";
const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
const MONTHS = [
  { value: "", label: "All months (by month)" },
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function Account() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [activity, setActivity] = useState(null);
  const [chartYear, setChartYear] = useState(currentYear);
  const [chartMonth, setChartMonth] = useState("");
  const [chartData, setChartData] = useState({ bars: [], year: currentYear, month: null });
  const [chartLoading, setChartLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLabel, setDetailLabel] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [meRes, activityRes] = await Promise.all([
          fetchJson(API_ME, { token }),
          fetchJson(API_MY_ACTIVITY, { token }),
        ]);
        setUser(meRes?.data?.user || null);
        setRole(meRes?.data?.role || null);
        setActivity(activityRes?.data || null);
      } catch (e) {
        setUser(null);
        setActivity(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    const loadChart = async () => {
      if (!token) return;
      setChartLoading(true);
      try {
        const params = new URLSearchParams({ year: String(chartYear) });
        if (chartMonth !== "") params.set("month", String(chartMonth));
        const res = await fetchJson(`${API_MY_ACTIVITY_CHART}?${params}`, { token });
        setChartData(res?.data || { bars: [], year: chartYear, month: chartMonth || null });
      } catch (e) {
        setChartData({ bars: [], year: chartYear, month: chartMonth || null });
      } finally {
        setChartLoading(false);
      }
    };
    loadChart();
  }, [token, chartYear, chartMonth]);

  const cardSx = {
    borderRadius: 2,
    boxShadow: "0 4px 20px rgba(0, 137, 123, 0.08)",
    border: "1px solid",
    borderColor: "rgba(0, 137, 123, 0.12)",
  };

  const buildImageUrl = (imageUrl) => {
    if (!imageUrl) return "";
    if (String(imageUrl).startsWith("http")) return imageUrl;
    if (String(imageUrl).startsWith("uploads/")) return `/${imageUrl}`;
    if (String(imageUrl).startsWith("/uploads/")) return imageUrl;
    return imageUrl;
  };

  const bars = Array.isArray(chartData.bars) ? chartData.bars : [];
  const chartLabel =
    chartData.month != null
      ? `Day of month (${MONTHS.find((m) => m.value === chartData.month)?.label || chartData.month})`
      : "Month of year";

  const handleBarClick = async (data) => {
    if (!data || data.activeLabel == null) return;
    const name = data.activeLabel;
    let year = chartYear;
    let month = null;
    let day = null;

    if (chartData.month != null) {
      month = chartData.month;
      day = Number(name);
      if (!Number.isFinite(day) || day <= 0) return;
      setDetailLabel(`Actions on ${name} ${MONTHS.find((m) => m.value === month)?.label || month} ${year}`);
    } else {
      const monthIndex = MONTHS.findIndex((m) => m.value && m.label.startsWith(name));
      if (monthIndex === -1) return;
      month = MONTHS[monthIndex].value;
      setDetailLabel(`Actions in ${MONTHS[monthIndex].label} ${year}`);
    }

    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (day != null) params.set("day", String(day));
      const res = await fetchJson(`${API_MY_ACTIVITY_DETAIL}?${params.toString()}`, { token });
      setDetailRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
    } catch {
      setDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseAccount = () => {
    try {
      const prev = sessionStorage.getItem("prevRouteBeforeAccount");
      if (prev && !prev.includes("/account")) {
        navigate(prev);
        return;
      }
    } catch (_) {}
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, gap: 1 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
          <Typography variant="h5" fontWeight={800} color="text.primary">
            My account
          </Typography>
        </Stack>
        {isSmall ? (
          <IconButton
            aria-label="Close account"
            onClick={handleCloseAccount}
            size="small"
            sx={{ ml: 1 }}
          >
            <CloseIcon />
          </IconButton>
        ) : (
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloseIcon />}
            onClick={handleCloseAccount}
          >
            Close
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your profile and personal activity dashboard for this hospital and subscription package.
      </Typography>

      <Stack spacing={3}>
        {/* User card */}
        <Card elevation={0} sx={cardSx}>
          <CardHeader
            title="Account details"
            titleTypographyProps={{ fontWeight: 700, color: "text.primary" }}
            sx={{ pb: 0 }}
          />
          <Divider sx={{ borderColor: "divider" }} />
          <CardContent>
            {user ? (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <Avatar
                    src={
                      user.profile_image_path
                        ? buildImageUrl(user.profile_image_path) +
                          (user.updatedAt ? `?t=${new Date(user.updatedAt).getTime()}` : "")
                        : ""
                    }
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: theme.palette.primary.main,
                      fontSize: 28,
                      fontWeight: 800,
                    }}
                  >
                    {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800}>
                      {user.full_name || "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {role?.name || "—"} • {user.status || "—"}
                    </Typography>
                  </Box>
                </Stack>

                <Divider />

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.email || "—"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.phone || "—"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WorkIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {role?.name || "—"}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Unable to load account information.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Activity: year/month filters + bar chart */}
        <Card elevation={0} sx={cardSx}>
          <CardHeader
            avatar={<InsightsIcon sx={{ color: theme.palette.primary.main }} />}
            title="My activity stats"
            subheader="Filter by year and optionally by month to see actions per month or per day."
            titleTypographyProps={{ fontWeight: 700, color: "text.primary" }}
            subheaderTypographyProps={{ color: "text.secondary", variant: "body2" }}
            sx={{ pb: 0 }}
          />
          <Divider sx={{ borderColor: "divider" }} />
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={{ xs: 1, sm: 2 }}
                alignItems="center"
                sx={{
                  flexWrap: { xs: "nowrap", sm: "nowrap" },
                }}
              >
                <FormControl
                  size="small"
                  sx={{
                    flex: { xs: 1, sm: "0 0 auto" },
                    minWidth: { xs: 0, sm: 140 },
                  }}
                >
                  <InputLabel>Year</InputLabel>
                  <Select
                    label="Year"
                    value={chartYear}
                    onChange={(e) => setChartYear(Number(e.target.value))}
                  >
                    {YEARS.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  sx={{
                    flex: { xs: 1, sm: "0 0 auto" },
                    minWidth: { xs: 0, sm: 200 },
                  }}
                >
                  <InputLabel>Month</InputLabel>
                  <Select
                    label="Month"
                    value={chartMonth}
                    onChange={(e) => setChartMonth(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <MenuItem key={m.value || "all"} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Typography variant="subtitle2" color="text.secondary">
                {chartLabel}
              </Typography>
              {chartLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={28} sx={{ color: theme.palette.primary.main }} />
                </Box>
              ) : bars.length > 0 ? (
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bars}
                      margin={{ top: 8, right: 16, left: 8, bottom: chartData.month != null ? 24 : 60 }}
                      onClick={handleBarClick}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        angle={chartData.month != null ? 0 : -35}
                        textAnchor={chartData.month != null ? "middle" : "end"}
                        interval={0}
                        height={chartData.month != null ? 24 : 56}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                      <Tooltip />
                      <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No activity in the selected period.
                </Typography>
              )}

              {detailLabel && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {detailLabel}
                  </Typography>
                  {detailLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                      <CircularProgress size={22} sx={{ color: theme.palette.primary.main }} />
                    </Box>
                  ) : detailRows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No actions in this period.
                    </Typography>
                  ) : (
                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{ borderRadius: 1, overflow: "hidden", mt: 1 }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "grey.100" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Count</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detailRows.map((row) => (
                            <TableRow key={row.table_name || "other"} hover>
                              <TableCell>{row.table_name || "other"}</TableCell>
                              <TableCell>{row.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

      </Stack>
    </Box>
  );
}
