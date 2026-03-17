import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  IconButton,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const API = {
  appointments: "/api/appointments",
  billing: "/api/billing",
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

const getToken = () => localStorage.getItem("token");

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

export default function AppointmentViewPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState("");
  const [innerTab, setInnerTab] = useState(0);
  const [billItemAmount, setBillItemAmount] = useState("");
  const [billItemNote, setBillItemNote] = useState("");
  const [billItemSaving, setBillItemSaving] = useState(false);
  const [cashSaving, setCashSaving] = useState(false);
  const [mpesaDialog, setMpesaDialog] = useState({
    open: false,
    phone: "",
    amount: "",
    billId: null,
    apptId: null,
  });
  const [mpesaSubmitting, setMpesaSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const token = getToken();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const apptRes = await fetchJson(
          `${API.appointments}/by-slug/${encodeURIComponent(slug)}`,
          { token },
        );
        if (!active) return;
        const apptData = apptRes?.data || null;
        setAppointment(apptData);

        if (apptData?.id) {
          const billRes = await fetchJson(
            `${API.billing}/by-reference?` +
              new URLSearchParams({
                item_type: "appointment",
                reference_id: String(apptData.id),
              }).toString(),
            { token },
          ).catch(() => null);
          if (!active) return;
          setBilling(billRes?.data || null);
        } else {
          setBilling(null);
        }
      } catch (e) {
        if (!active) return;
        setError(e?.message || "Failed to load appointment.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (slug) load();

    return () => {
      active = false;
    };
  }, [slug]);

  const appt = appointment;

  const patientName =
    appt?.patient?.full_name ||
    appt?.patient?.user?.full_name ||
    "Patient";

  const doctorName =
    appt?.doctor?.user?.full_name ||
    appt?.doctor?.staff_type ||
    "—";

  const serviceName = appt?.service?.name || "—";
  const servicePrice =
    billing && billing.total_amount != null
      ? Number(billing.total_amount).toFixed(2)
      : appt?.service?.price != null && appt?.service?.price !== ""
      ? String(appt.service.price)
      : appt?.bill_amount != null
      ? String(appt.bill_amount)
      : null;

  return (
    <Box
      sx={{
        maxWidth: "100%",
        mx: { xs: 0, sm: 0.25 },
        mt: { xs: 0, sm: 0.25 },
      }}
    >
      <Card
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: (theme) =>
            theme.shadows[3],
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 1.5,
            bgcolor: "#ffffff",
            color: "#00695c",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <IconButton
            onClick={() => navigate("/appointments")}
            edge="start"
            sx={{
              mr: 1,
              color: "#00695c",
              bgcolor: "transparent",
              "&:hover": { bgcolor: "rgba(0,105,92,0.06)" },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{ opacity: 0.9, fontWeight: 500 }}
            >
              Appointment
            </Typography>
            <Typography
              variant="h6"
              noWrap
              sx={{ fontWeight: 900, lineHeight: 1.3 }}
            >
              {patientName}
            </Typography>
          </Box>
          {appt?.status && (
            <Chip
              size="small"
              label={appt.status}
              sx={{
                ml: 1,
                textTransform: "capitalize",
                bgcolor:
                  appt.status === "completed"
                    ? "success.main"
                    : appt.status === "confirmed"
                    ? "primary.main"
                    : appt.status === "cancelled"
                    ? "grey.700"
                    : "warning.main",
                color: "common.white",
                fontWeight: 700,
              }}
            />
          )}
        </Box>

        <CardContent
          sx={{
            px: { xs: 1, sm: 1.5 },
            py: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === "light" ? "grey.50" : "background.default",
          }}
        >
          {loading ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ py: 2 }}
            >
              <CircularProgress size={18} />
              <Typography color="text.secondary">
                Loading appointment…
              </Typography>
            </Stack>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : !appt ? (
            <Typography color="text.secondary">No data.</Typography>
          ) : (
            <Box>
              <Tabs
                value={innerTab}
                onChange={(_, v) => setInnerTab(v)}
                sx={{
                  mb: 2,
                  minHeight: 40,
                  borderBottom: 1,
                  borderColor: "divider",
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 700,
                    minHeight: 40,
                  },
                  "& .MuiTabs-indicator": {
                    height: 3,
                    borderRadius: "999px 999px 0 0",
                  },
                }}
              >
                <Tab label="Details" />
                <Tab label="Billing & payment" />
              </Tabs>

              {innerTab === 0 && (
                <Stack
                  spacing={2}
                  sx={{
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        Patient
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {patientName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        Doctor
                      </Typography>
                      <Typography>{doctorName}</Typography>
                    </Box>
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        Date & time
                      </Typography>
                      <Typography>
                        {formatDateTime(appt.appointment_date)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        Service
                      </Typography>
                      <Typography>
                        {serviceName}
                        {servicePrice ? ` • ${servicePrice}` : ""}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              )}

              {innerTab === 1 && (
                <Stack spacing={2}>
                  {!billing || !billing.bill_id ? (
                    <Stack spacing={1.5}>
                      <Alert severity="info">
                        No bill for this appointment yet. Create one below to add charges and record payment.
                      </Alert>
                      <Button
                        variant="contained"
                        onClick={async () => {
                          if (!appt?.id) return;
                          const token = getToken();
                          const patientId =
                            appt?.patient?.id || appt?.patient_id;
                          if (!patientId) return;
                          const amount = Number(
                            appt?.service?.price ??
                              appt?.bill_amount ??
                              0,
                          );
                          if (!Number.isFinite(amount) || amount < 0) return;
                          try {
                            const billRes = await fetchJson(
                              `${API.billing}/generate`,
                              {
                                method: "POST",
                                token,
                                body: { patient_id: patientId },
                              },
                            );
                            const billId = billRes?.data?.id;
                            if (!billId) throw new Error("No bill id");
                            await fetchJson(
                              `${API.billing}/${billId}/items`,
                              {
                                method: "POST",
                                token,
                                body: {
                                  items: [
                                    {
                                      item_type: "appointment",
                                      reference_id: String(appt.id),
                                      amount,
                                    },
                                  ],
                                },
                              },
                            );
                            const billRes2 = await fetchJson(
                              `${API.billing}/by-reference?` +
                                new URLSearchParams({
                                  item_type: "appointment",
                                  reference_id: String(appt.id),
                                }).toString(),
                              { token },
                            );
                            setBilling(billRes2?.data || null);
                            setBillItemAmount("");
                            setBillItemNote("");
                          } catch {
                            // ignore
                          }
                        }}
                        disabled={!(appt?.patient?.id || appt?.patient_id)}
                        startIcon={<PaymentIcon />}
                        sx={{ fontWeight: 800 }}
                      >
                        Create bill for this appointment
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <Box
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          p: 2,
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >{`Bill #${billing.bill_id}`}</Typography>
                          <Typography sx={{ fontWeight: 800 }}>
                            Total:{" "}
                            {Number(billing.total_amount ?? 0).toFixed(2)} •
                            Paid:{" "}
                            {Number(billing.paid_amount ?? 0).toFixed(2)} •
                            Balance:{" "}
                            {Number(billing.balance ?? 0).toFixed(2)}
                          </Typography>
                          <Chip
                            size="small"
                            label={billing.status || "unpaid"}
                            color={
                              billing.status === "paid"
                                ? "success"
                                : billing.status === "partial"
                                ? "warning"
                                : "default"
                            }
                            sx={{ alignSelf: "flex-start", mt: 0.5 }}
                          />
                        </Stack>
                      </Box>

                      {Array.isArray(billing.items) &&
                        billing.items.length > 0 && (
                          <Box
                            sx={{
                              border: { xs: "none", sm: "1px solid" },
                              borderColor: "divider",
                              borderRadius: 2,
                              overflow: "hidden",
                              boxShadow: isSmall ? 1 : 0,
                              bgcolor: "background.paper",
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              sx={{ px: 2, pt: 1.5, pb: 0.5 }}
                            >
                              Breakdown
                            </Typography>

                            {isSmall ? (
                              <Stack sx={{ px: 1.5, pb: 1.5 }} spacing={0.75}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    mb: 0.5,
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.3,
                                        color: "text.secondary",
                                      }}
                                    >
                                      Description
                                    </Typography>
                                  </Box>
                                  <Box
                                    sx={{
                                      width: 80,
                                      textAlign: "center",
                                      px: 0.5,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.3,
                                        color: "text.secondary",
                                      }}
                                    >
                                      Amount
                                    </Typography>
                                  </Box>
                                  <Box
                                    sx={{
                                      width: 64,
                                      textAlign: "right",
                                      pl: 0.5,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.3,
                                        color: "text.secondary",
                                      }}
                                    >
                                      Actions
                                    </Typography>
                                  </Box>
                                </Box>
                                {billing.items.map((it, idx) => {
                                  const label =
                                    it.item_type === "appointment"
                                      ? "Appointment fee"
                                      : it.item_type === "service" &&
                                        it.reference_id
                                      ? `Extra: ${it.reference_id}`
                                      : it.item_type === "service"
                                      ? "Extra charge"
                                      : it.item_type === "lab_order"
                                      ? "Lab order"
                                      : it.item_type === "prescription"
                                      ? "Prescription"
                                      : it.item_type || "Item";
                                  const handleEdit = async () => {
                                    if (!it.id) return;
                                    const { value: formValues } = await Swal.fire({
                                      title: "Edit item",
                                      html: `
                                        <label for="swal-amount" style="display:block; text-align:left; margin-bottom:4px;">Amount</label>
                                        <input id="swal-amount" class="swal2-input" type="number" min="0" step="0.01" value="${Number(it.amount ?? 0).toFixed(2)}" />
                                        <label for="swal-note" style="display:block; text-align:left; margin-bottom:4px;">Note</label>
                                        <input id="swal-note" class="swal2-input" type="text" value="${(it.reference_id || "").toString()}" />
                                      `,
                                      focusConfirm: false,
                                      showCancelButton: true,
                                      preConfirm: () => {
                                        const amountRaw =
                                          document.getElementById("swal-amount")
                                            ?.value;
                                        const noteRaw =
                                          document.getElementById("swal-note")
                                            ?.value || "";
                                        const n = Number(amountRaw);
                                        if (!Number.isFinite(n) || n < 0) {
                                          Swal.showValidationMessage(
                                            "Enter a valid amount",
                                          );
                                          return undefined;
                                        }
                                        return {
                                          amount: n,
                                          reference_id: noteRaw.trim() || null,
                                        };
                                      },
                                    });
                                    if (!formValues) return;
                                    try {
                                      const token = getToken();
                                      await fetchJson(
                                        `${API.billing}/items/${it.id}`,
                                        {
                                          method: "PATCH",
                                          token,
                                          body: formValues,
                                        },
                                      );
                                      const billRes = await fetchJson(
                                        `${API.billing}/by-reference?` +
                                          new URLSearchParams({
                                            item_type: "appointment",
                                            reference_id: String(appt.id),
                                          }).toString(),
                                        { token },
                                      );
                                      setBilling(billRes?.data || null);
                                      Swal.fire({
                                        icon: "success",
                                        title: "Item updated",
                                        timer: 900,
                                        showConfirmButton: false,
                                      });
                                    } catch (e) {
                                      Swal.fire({
                                        icon: "error",
                                        title: "Failed",
                                        text:
                                          e?.message || "Could not update item.",
                                      });
                                    }
                                  };

                                  const handleRemove = async () => {
                                    if (!it.id) return;
                                    const confirm = await Swal.fire({
                                      icon: "warning",
                                      title: "Remove item?",
                                      text: "This will remove the item from the bill.",
                                      showCancelButton: true,
                                      confirmButtonText: "Yes, remove",
                                      cancelButtonText: "Cancel",
                                    });
                                    if (!confirm.isConfirmed) return;
                                    try {
                                      const token = getToken();
                                      await fetchJson(
                                        `${API.billing}/items/${it.id}`,
                                        {
                                          method: "DELETE",
                                          token,
                                        },
                                      );
                                      const billRes = await fetchJson(
                                        `${API.billing}/by-reference?` +
                                          new URLSearchParams({
                                            item_type: "appointment",
                                            reference_id: String(appt.id),
                                          }).toString(),
                                        { token },
                                      );
                                      setBilling(billRes?.data || null);
                                      Swal.fire({
                                        icon: "success",
                                        title: "Item removed",
                                        timer: 900,
                                        showConfirmButton: false,
                                      });
                                    } catch (e) {
                                      Swal.fire({
                                        icon: "error",
                                        title: "Failed",
                                        text:
                                          e?.message || "Could not remove item.",
                                      });
                                    }
                                  };

                                  return (
                                    <Box
                                      key={it.id || idx}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography
                                          noWrap
                                          sx={{
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {label}
                                        </Typography>
                                      </Box>
                                      <Box
                                        sx={{
                                          width: 80,
                                          textAlign: "center",
                                          px: 0.5,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {Number(it.amount ?? 0).toFixed(2)}
                                        </Typography>
                                      </Box>
                                      <Box
                                        sx={{
                                          width: 64,
                                          display: "flex",
                                          justifyContent: "flex-end",
                                        }}
                                      >
                                        <Stack
                                          direction="row"
                                          spacing={0.25}
                                        >
                                          <IconButton
                                            size="small"
                                            onClick={handleEdit}
                                          >
                                            <EditIcon fontSize="inherit" />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={handleRemove}
                                          >
                                            <DeleteIcon fontSize="inherit" />
                                          </IconButton>
                                        </Stack>
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Stack>
                            ) : (
                              <Table
                                size="small"
                                sx={{
                                  tableLayout: "fixed",
                                  width: "100%",
                                  minWidth: "100%",
                                }}
                              >
                                <TableHead>
                                  <TableRow
                                    sx={{ bgcolor: "rgba(0,0,0,0.03)" }}
                                  >
                                    <TableCell
                                      sx={{
                                        fontWeight: 700,
                                        width: { xs: "60%", sm: 220 },
                                      }}
                                    >
                                      Description
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        fontWeight: 700,
                                        width: { xs: "20%", sm: 100 },
                                      }}
                                    >
                                      Amount
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        fontWeight: 700,
                                        width: { xs: "20%", sm: 140 },
                                      }}
                                    >
                                      Actions
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {billing.items.map((it, idx) => {
                                  const label =
                                    it.item_type === "appointment"
                                      ? "Appointment fee"
                                      : it.item_type === "service" &&
                                        it.reference_id
                                      ? `Extra: ${it.reference_id}`
                                      : it.item_type === "service"
                                      ? "Extra charge"
                                      : it.item_type === "lab_order"
                                      ? "Lab order"
                                      : it.item_type === "prescription"
                                      ? "Prescription"
                                      : it.item_type || "Item";
                                    const handleEdit = async () => {
                                    if (!it.id) return;
                                    const { value: formValues } = await Swal.fire({
                                      title: "Edit item",
                                      html: `
                                        <label for="swal-amount" style="display:block; text-align:left; margin-bottom:4px;">Amount</label>
                                        <input id="swal-amount" class="swal2-input" type="number" min="0" step="0.01" value="${Number(it.amount ?? 0).toFixed(2)}" />
                                        <label for="swal-note" style="display:block; text-align:left; margin-bottom:4px;">Note</label>
                                        <input id="swal-note" class="swal2-input" type="text" value="${(it.reference_id || "").toString()}" />
                                      `,
                                      focusConfirm: false,
                                      showCancelButton: true,
                                      preConfirm: () => {
                                        const amountRaw = document.getElementById("swal-amount")?.value;
                                        const noteRaw = document.getElementById("swal-note")?.value || "";
                                        const n = Number(amountRaw);
                                        if (!Number.isFinite(n) || n < 0) {
                                          Swal.showValidationMessage("Enter a valid amount");
                                          return undefined;
                                        }
                                        return { amount: n, reference_id: noteRaw.trim() || null };
                                      },
                                    });
                                    if (!formValues) return;
                                    try {
                                      const token = getToken();
                                      await fetchJson(
                                        `${API.billing}/items/${it.id}`,
                                        {
                                          method: "PATCH",
                                          token,
                                          body: formValues,
                                        },
                                      );
                                      const billRes = await fetchJson(
                                        `${API.billing}/by-reference?` +
                                          new URLSearchParams({
                                            item_type: "appointment",
                                            reference_id: String(appt.id),
                                          }).toString(),
                                        { token },
                                      );
                                      setBilling(billRes?.data || null);
                                      Swal.fire({
                                        icon: "success",
                                        title: "Item updated",
                                        timer: 900,
                                        showConfirmButton: false,
                                      });
                                    } catch (e) {
                                      Swal.fire({
                                        icon: "error",
                                        title: "Failed",
                                        text: e?.message || "Could not update item.",
                                      });
                                    }
                                  };

                                    const handleRemove = async () => {
                                    if (!it.id) return;
                                    const confirm = await Swal.fire({
                                      icon: "warning",
                                      title: "Remove item?",
                                      text: "This will remove the item from the bill.",
                                      showCancelButton: true,
                                      confirmButtonText: "Yes, remove",
                                      cancelButtonText: "Cancel",
                                    });
                                    if (!confirm.isConfirmed) return;
                                    try {
                                      const token = getToken();
                                      await fetchJson(
                                        `${API.billing}/items/${it.id}`,
                                        {
                                          method: "DELETE",
                                          token,
                                        },
                                      );
                                      const billRes = await fetchJson(
                                        `${API.billing}/by-reference?` +
                                          new URLSearchParams({
                                            item_type: "appointment",
                                            reference_id: String(appt.id),
                                          }).toString(),
                                        { token },
                                      );
                                      setBilling(billRes?.data || null);
                                      Swal.fire({
                                        icon: "success",
                                        title: "Item removed",
                                        timer: 900,
                                        showConfirmButton: false,
                                      });
                                    } catch (e) {
                                      Swal.fire({
                                        icon: "error",
                                        title: "Failed",
                                        text: e?.message || "Could not remove item.",
                                      });
                                    }
                                  };

                                    return (
                                      <TableRow key={it.id || idx}>
                                        <TableCell>{label}</TableCell>
                                        <TableCell align="right">
                                          {Number(it.amount ?? 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell
                                          align="right"
                                          sx={{ width: 160 }}
                                        >
                                          <Stack
                                            direction="row"
                                            spacing={0.5}
                                            justifyContent="flex-end"
                                          >
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={handleEdit}
                                              startIcon={
                                                <EditIcon fontSize="small" />
                                              }
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              color="error"
                                              onClick={handleRemove}
                                              startIcon={
                                                <DeleteIcon fontSize="small" />
                                              }
                                            >
                                              Remove
                                            </Button>
                                          </Stack>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </Box>
                        )}

                      {billing.status !== "paid" &&
                        Number(billing.balance ?? 0) > 0 && (
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ sm: "center" }}
                            sx={{ flexWrap: "wrap" }}
                          >
                            <TextField
                              size="small"
                              label="Amount"
                              type="number"
                              value={billItemAmount}
                              onChange={(e) =>
                                setBillItemAmount(e.target.value)
                              }
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: { xs: "100%", sm: 130 } }}
                            />
                            <TextField
                              size="small"
                              label="Note (optional)"
                              placeholder="e.g. extra service"
                              value={billItemNote}
                              onChange={(e) =>
                                setBillItemNote(e.target.value)
                              }
                              sx={{
                                flex: { xs: "none", sm: "1 1 180px" },
                                minWidth: 0,
                              }}
                            />
                            <Button
                              variant="outlined"
                              onClick={async () => {
                                if (!billing?.bill_id) return;
                                const amount = Number(billItemAmount);
                                if (
                                  !Number.isFinite(amount) ||
                                  amount < 0
                                )
                                  return;
                                setBillItemSaving(true);
                                try {
                                  const token = getToken();
                                  await fetchJson(
                                    `${API.billing}/${billing.bill_id}/items`,
                                    {
                                      method: "POST",
                                      token,
                                      body: {
                                        items: [
                                          {
                                            item_type: "service",
                                            reference_id:
                                              (billItemNote || "")
                                                .trim() || null,
                                            amount,
                                          },
                                        ],
                                      },
                                    },
                                  );
                                  const billRes = await fetchJson(
                                    `${API.billing}/by-reference?` +
                                      new URLSearchParams({
                                        item_type: "appointment",
                                        reference_id: String(appt.id),
                                      }).toString(),
                                    { token },
                                  );
                                  setBilling(billRes?.data || null);
                                  setBillItemAmount("");
                                  setBillItemNote("");
                                  Swal.fire({
                                    icon: "success",
                                    title: "Item added",
                                    timer: 900,
                                    showConfirmButton: false,
                                  });
                                } finally {
                                  setBillItemSaving(false);
                                }
                              }}
                              disabled={billItemSaving}
                              sx={{ fontWeight: 800, flexShrink: 0 }}
                            >
                              {billItemSaving ? "Adding…" : "Add billing item"}
                            </Button>
                          </Stack>
                        )}

                      {billing?.bill_id &&
                        billing.status !== "paid" &&
                        Number(billing.balance ?? 0) > 0 && (
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            sx={{
                              flexWrap: "wrap",
                              pt: 1,
                              borderTop: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              sx={{ width: "100%", fontWeight: 700 }}
                            >
                              Record payment
                            </Typography>
                            <TextField
                              size="small"
                              label="Amount due"
                              type="number"
                              value={String(
                                billing.balance ??
                                  billing.total_amount ??
                                  0,
                              )}
                              InputProps={{ readOnly: true }}
                              sx={{ width: { xs: "100%", sm: 130 } }}
                            />
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<PaymentIcon />}
                              onClick={async () => {
                                if (!appt?.id) return;
                                const patientId =
                                  appt?.patient?.id || appt?.patient_id;
                                if (!patientId) return;
                                const amount = Number(
                                  billing?.balance ??
                                    billing?.total_amount ??
                                    0,
                                );
                                if (
                                  !Number.isFinite(amount) ||
                                  amount <= 0
                                )
                                  return;
                                setCashSaving(true);
                                try {
                                  const token = getToken();
                                  await fetchJson(
                                    `${API.payments}/process`,
                                    {
                                      method: "POST",
                                      token,
                                      body: {
                                        bill_id: billing.bill_id,
                                        amount_paid: amount,
                                        payment_method: "cash",
                                        payment_date:
                                          new Date().toISOString(),
                                      },
                                    },
                                  );
                                  const billRes = await fetchJson(
                                    `${API.billing}/by-reference?` +
                                      new URLSearchParams({
                                        item_type: "appointment",
                                        reference_id: String(appt.id),
                                      }).toString(),
                                    { token },
                                  );
                                  setBilling(billRes?.data || null);
                                } finally {
                                  setCashSaving(false);
                                }
                              }}
                              disabled={cashSaving}
                              sx={{ fontWeight: 800 }}
                            >
                              {cashSaving ? "Recording…" : "Record cash"}
                            </Button>
                            <Button
                              variant="contained"
                              sx={{
                                fontWeight: 800,
                                bgcolor: "#00A651",
                                "&:hover": { bgcolor: "#008C44" },
                              }}
                              startIcon={<PaymentIcon />}
                              onClick={async () => {
                                if (!appt?.id) return;
                                const patientId =
                                  appt?.patient?.id || appt?.patient_id;
                                if (!patientId) return;
                                const defaultAmount = String(
                                  billing?.balance ??
                                    billing?.total_amount ??
                                    appt?.bill_amount ??
                                    "0",
                                );
                                let phone =
                                  appt?.patient?.phone ||
                                  appt?.patient?.user?.phone ||
                                  "";
                                const token = getToken();
                                try {
                                  const billRes = await fetchJson(
                                    `${API.billing}/by-reference?` +
                                      new URLSearchParams({
                                        item_type: "appointment",
                                        reference_id: String(appt.id),
                                      }).toString(),
                                    { token },
                                  );
                                  let billId =
                                    billRes?.data?.bill_id ?? null;
                                  if (!billId) {
                                    const genRes = await fetchJson(
                                      `${API.billing}/generate`,
                                      {
                                        method: "POST",
                                        token,
                                        body: { patient_id: patientId },
                                      },
                                    );
                                    billId = genRes?.data?.id;
                                  }
                                  if (!billId) return;
                                  setMpesaDialog({
                                    open: true,
                                    phone: phone || "",
                                    amount: defaultAmount,
                                    billId,
                                    apptId: appt.id,
                                  });
                                } catch {
                                  // ignore
                                }
                              }}
                            >
                              Pay with M-Pesa
                            </Button>
                          </Stack>
                        )}
                    </>
                  )}
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={mpesaDialog.open}
        onClose={() => {
          if (mpesaSubmitting) return;
          setMpesaDialog((prev) => ({ ...prev, open: false }));
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Pay with M-Pesa</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              An M-Pesa prompt will be sent to the patient's phone. They must
              enter their PIN to complete payment.
            </Typography>
            <TextField
              label="Phone (2547XXXXXXXX or 07…)"
              size="small"
              fullWidth
              value={mpesaDialog.phone}
              onChange={(e) =>
                setMpesaDialog((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
            />
            <TextField
              label="Amount"
              size="small"
              type="number"
              fullWidth
              value={mpesaDialog.amount}
              onChange={(e) =>
                setMpesaDialog((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (mpesaSubmitting) return;
              setMpesaDialog((prev) => ({ ...prev, open: false }));
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const phoneInput = (mpesaDialog.phone || "").trim();
              const amountNumber = Number(mpesaDialog.amount);
              if (!phoneInput) return;
              if (
                !Number.isFinite(amountNumber) ||
                amountNumber <= 0
              )
                return;
              if (!mpesaDialog.billId) return;
              setMpesaSubmitting(true);
              try {
                const token = getToken();
                const rawPhone = phoneInput.replace(/^\++/, "");
                await fetchJson(`${API.appointments.replace("appointments","mpesa")}/pay`, {
                  method: "POST",
                  token,
                  body: {
                    phone: rawPhone,
                    amount: amountNumber,
                    bill_id: mpesaDialog.billId,
                  },
                }).catch(() =>
                  fetchJson(`/api/mpesa/pay`, {
                    method: "POST",
                    token,
                    body: {
                      phone: rawPhone,
                      amount: amountNumber,
                      bill_id: mpesaDialog.billId,
                    },
                  }),
                );
              } finally {
                setMpesaSubmitting(false);
                setMpesaDialog((prev) => ({ ...prev, open: false }));
              }
            }}
            disabled={mpesaSubmitting}
          >
            {mpesaSubmitting ? "Sending…" : "Send STK push"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

