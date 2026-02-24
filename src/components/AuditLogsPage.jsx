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
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { History as HistoryIcon, Refresh as RefreshIcon } from "@mui/icons-material";
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
            <Tooltip title="Refresh">
              <IconButton
                onClick={() => loadLogs()}
                sx={{ color: "white", border: "1px solid rgba(255,255,255,0.25)" }}
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
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

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, width: 155 }}>Date & time</TableCell>
                  <TableCell sx={{ fontWeight: 900, minWidth: 140 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 900, minWidth: 180 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 120 }}>Resource</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 120 }}>Record ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }}>
                        <CircularProgress size={22} />
                        <Typography color="text.secondary">Loading audit logs…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No audit entries found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatDateTime(log.createdAt ?? log.timestamp)}
                      </TableCell>
                      <TableCell>
                        {log.user ? (log.user.full_name || log.user.email || log.user_id) : fmt(log.user_id)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{fmt(log.action)}</TableCell>
                      <TableCell>{fmt(log.table_name)}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }} title={log.record_id}>
                        {log.record_id ? (log.record_id.length > 12 ? `${log.record_id.slice(0, 8)}…` : log.record_id) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

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
          />
        </CardContent>
      </Card>
    </Box>
  );
}
