import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = { auditLogs: "/api/audit-logs", users: "/api/users" };

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
    const err = new Error(data?.message || data?.error || `Request failed (${res.status})`);
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

export default function AuditLogsPage() {
  const theme = useTheme();
  const token = getToken();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [users, setUsers] = useState([]);

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark || "#00695C"} 0%, ${theme.palette.primary.main} 100%)`;

  const loadUsers = async () => {
    if (!token) return;
    try {
      const data = await fetchJson(`${API.users}?page=1&limit=500`, { token });
      setUsers(data?.data || []);
    } catch {
      setUsers([]);
    }
  };

  const loadLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(limit),
      });
      if (filterAction) params.set("action", filterAction);
      if (filterTable) params.set("table_name", filterTable);
      if (filterUserId) params.set("user_id", filterUserId);
      const data = await fetchJson(`${API.auditLogs}?${params.toString()}`, { token });
      setRows(data?.data || []);
      setTotal(data?.pagination?.total ?? 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      Swal.fire({ icon: "error", title: "Failed to load audit logs", text: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  useEffect(() => {
    loadLogs();
  }, [token, page, limit, filterAction, filterTable, filterUserId]);

  const uniqueActions = [...new Set(rows.map((r) => r.action).concat(filterAction ? [filterAction] : []))].filter(Boolean).sort();
  const uniqueTables = [...new Set(rows.map((r) => r.table_name).concat(filterTable ? [filterTable] : []))].filter(Boolean).sort();

  return (
    <Box sx={{ width: "100%" }}>
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <Box sx={{ p: { xs: 2.5, md: 3 }, color: "white", background: heroGradient }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <HistoryIcon sx={{ fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Audit log
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                All system activity: who did what and when.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>User</InputLabel>
              <Select
                value={filterUserId}
                label="User"
                onChange={(e) => { setFilterUserId(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All users</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {fmt(u.full_name)} {u.email ? `(${u.email})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={filterAction}
                label="Action"
                onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All actions</MenuItem>
                {uniqueActions.map((a) => (
                  <MenuItem key={a} value={a}>{a}</MenuItem>
                ))}
                {uniqueActions.length === 0 && filterAction && (
                  <MenuItem value={filterAction}>{filterAction}</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Resource</InputLabel>
              <Select
                value={filterTable}
                label="Resource"
                onChange={(e) => { setFilterTable(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                {uniqueTables.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
                {uniqueTables.length === 0 && filterTable && (
                  <MenuItem value={filterTable}>{filterTable}</MenuItem>
                )}
              </Select>
            </FormControl>
          </Stack>

          <TableContainer
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              overflowX: "auto",
              maxWidth: "100%",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Table size="medium" stickyHeader sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0, 137, 123, 0.06)",
                    "& th": {
                      fontWeight: 800,
                      fontSize: "0.8125rem",
                      letterSpacing: "0.02em",
                      color: "text.primary",
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      py: 1.5,
                      px: 2,
                    },
                  }}
                >
                  <TableCell align="center" sx={{ width: 64, minWidth: 0, maxWidth: { xs: "16vw", sm: 64 }, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                    No
                  </TableCell>
                  <TableCell sx={{ width: 165, minWidth: 0, maxWidth: { md: 165 }, display: { xs: "none", md: "table-cell" }, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Date & time</TableCell>
                  <TableCell sx={{ minWidth: 0, maxWidth: { sm: 150, md: 180 }, display: { xs: "none", sm: "table-cell" }, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>User</TableCell>
                  <TableCell sx={{ minWidth: 0, maxWidth: { xs: "28vw", sm: 160 }, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Action</TableCell>
                  <TableCell sx={{ width: 120, minWidth: 0, maxWidth: { md: 120 }, display: { xs: "none", md: "table-cell" }, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Resource</TableCell>
                  <TableCell sx={{ width: 130, minWidth: 0, maxWidth: { md: 130 }, display: { xs: "none", md: "table-cell" }, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Record ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} />
                        <Typography color="text.secondary">Loading audit logs…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                        No audit entries found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((log, idx) => (
                    <TableRow
                      key={log.id}
                      hover
                      sx={{
                        "&:nth-of-type(even)": {
                          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                        },
                        "&:hover": {
                          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0, 137, 123, 0.04)",
                        },
                        "& td": {
                          py: 1.25,
                          px: 2,
                          borderColor: "divider",
                          fontSize: "0.875rem",
                        },
                      }}
                    >
                      <TableCell align="center" sx={{ fontWeight: 700, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                        {page * limit + idx + 1}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums", display: { xs: "none", md: "table-cell" } }}>
                        {formatDateTime(log.createdAt ?? log.timestamp)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 140, md: 180 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                        {log.user ? (log.user.full_name || log.user.email || log.user_id) : fmt(log.user_id)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: { xs: "28vw", sm: 160 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                        <Typography component="span" noWrap sx={{ fontWeight: 600, color: "primary.dark" }}>
                          {fmt(log.action)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", display: { xs: "none", md: "table-cell" }, maxWidth: { md: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>{fmt(log.table_name)}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem", color: "text.secondary", display: { xs: "none", md: "table-cell" } }} title={log.record_id}>
                        {log.record_id ? (log.record_id.length > 12 ? `${log.record_id.slice(0, 8)}…` : log.record_id) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              width: "100%",
              overflow: "hidden",
              borderTop: "1px solid",
              borderColor: "divider",
              mt: 0,
              "& .MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 0.5, px: { xs: 1, sm: 2 }, minHeight: 52 },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
              "& .MuiTablePagination-select": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
