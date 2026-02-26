import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Description as ReportIcon, GetApp as DownloadIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  patients: "/api/patients",
  medicalReports: "/api/medical-reports",
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
    const err = new Error(data?.message || data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function fetchPdfBlob(url, token) {
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load PDF");
  return res.blob();
}

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const truncate = (str, maxLen = 80) => {
  if (!str || typeof str !== "string") return "—";
  return str.length <= maxLen ? str : str.slice(0, maxLen) + "…";
};

export default function PatientReportsPage() {
  const theme = useTheme();
  const { patientId } = useParams();
  const navigate = useNavigate();
  const token = getToken();

  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark || "#00695C"} 0%, ${theme.palette.primary.main} 100%)`;

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    if (!patientId) {
      navigate("/patients", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [patientRes, reportsRes] = await Promise.all([
          fetchJson(`${API.patients}/${patientId}`, { token }),
          fetchJson(`${API.medicalReports}?patient_id=${patientId}&page=1&limit=100`, { token }),
        ]);
        if (!cancelled) {
          setPatient(patientRes?.data || null);
          setReports(Array.isArray(reportsRes?.data) ? reportsRes.data : []);
          setPagination({
            total: reportsRes?.pagination?.total ?? reportsRes?.data?.length ?? 0,
            page: reportsRes?.pagination?.page ?? 1,
            limit: reportsRes?.pagination?.limit ?? 100,
            totalPages: reportsRes?.pagination?.totalPages ?? 1,
          });
        }
      } catch (e) {
        if (!cancelled) {
          Swal.fire({ icon: "error", title: "Failed to load", text: e?.message });
          navigate("/patients", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, token, navigate]);

  const downloadPdf = async (reportId) => {
    if (!token) return;
    try {
      const blob = await fetchPdfBlob(`${API.medicalReports}/${reportId}/pdf`, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medical-report-${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Download failed", text: e?.message });
    }
  };

  const openViewDialog = (report) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const openConsultation = (consultationId) => {
    if (consultationId) navigate(`/appointments/consultation/${consultationId}`);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const patientName = patient?.full_name || patient?.user?.full_name || "Patient";

  return (
    <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/patients")}
          variant="outlined"
          sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
        >
          Back to patients
        </Button>
      </Stack>

      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <Box sx={{ p: 2.5, color: "white", background: heroGradient }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <ReportIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Medical reports — {patientName}
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                {reports.length} report{reports.length !== 1 ? "s" : ""} on file
              </Typography>
            </Box>
          </Stack>
        </Box>
        <CardContent>
          {reports.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3 }}>
              No medical reports for this patient yet.
            </Typography>
          ) : (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", overflowX: "auto", maxWidth: "100%" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, width: 50, maxWidth: { xs: "14vw", sm: 50 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" }, maxWidth: { sm: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Doctor</TableCell>
                    <TableCell sx={{ fontWeight: 900, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 280 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Report preview</TableCell>
                    <TableCell sx={{ fontWeight: 900, width: 140, maxWidth: { xs: "22vw", sm: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" }, textAlign: "right" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((r, idx) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{formatDateTime(r.created_at || r.createdAt)}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{r.doctor?.user?.full_name || r.doctor?.staff_type || "—"}</TableCell>
                      <TableCell sx={{ maxWidth: 280, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" }, display: { xs: "none", md: "table-cell" } }} title={r.report_text}>
                        <Typography variant="body2" noWrap>
                          {truncate(r.report_text, 60)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <Tooltip title="View report">
                            <IconButton size="small" onClick={() => openViewDialog(r)}>
                              <VisibilityIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download PDF">
                            <IconButton size="small" onClick={() => downloadPdf(r.id)}>
                              <DownloadIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Medical report
          {selectedReport && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block", fontWeight: 500, mt: 0.5 }}>
              {formatDateTime(selectedReport.created_at || selectedReport.createdAt)} • {selectedReport.doctor?.user?.full_name || selectedReport.doctor?.staff_type || "—"}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: "auto" }}>
          {selectedReport && (
            <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.95rem", lineHeight: 1.6 }}>
              {selectedReport.report_text || "—"}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {selectedReport?.consultation_id && (
            <Button variant="outlined" onClick={() => { setViewDialogOpen(false); openConsultation(selectedReport.consultation_id); }} sx={{ fontWeight: 700 }}>
              Open consultation
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          {selectedReport && (
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadPdf(selectedReport.id)} sx={{ fontWeight: 700 }}>
              Download PDF
            </Button>
          )}
          <Button variant="outlined" onClick={() => setViewDialogOpen(false)} sx={{ fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
