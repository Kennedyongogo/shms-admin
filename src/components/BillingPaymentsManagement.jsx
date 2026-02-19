import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
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
} from "@mui/material";
import {
  Payments as PaymentsIcon,
  ReceiptLong as ReceiptLongIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  billing: "/api/billing",
  payments: "/api/payments",
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

function money(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "0");
  return n.toFixed(2);
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function BillingPaymentsManagement() {
  const theme = useTheme();
  const token = getToken();

  const [tab, setTab] = useState(0); // 0 billing, 1 payments

  // Bills (paginated)
  const billsReqId = useRef(0);
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsPage, setBillsPage] = useState(0);
  const [billsRowsPerPage, setBillsRowsPerPage] = useState(10);
  const [billsTotal, setBillsTotal] = useState(0);
  const [billsSearch, setBillsSearch] = useState("");
  const [billsStatus, setBillsStatus] = useState("");

  // Payments (paginated)
  const paysReqId = useRef(0);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [paymentsRowsPerPage, setPaymentsRowsPerPage] = useState(10);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsMethod, setPaymentsMethod] = useState("");

  // Payment form
  const [payBillId, setPayBillId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentError, setPaymentError] = useState("");

  const loadBills = async () => {
    const reqId = ++billsReqId.current;
    setBillsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(billsPage + 1),
        limit: String(billsRowsPerPage),
      });
      if (billsSearch.trim()) qs.set("search", billsSearch.trim());
      if (billsStatus) qs.set("status", billsStatus);

      const resp = await fetchJson(`${API.billing}?${qs.toString()}`, { token });
      if (reqId !== billsReqId.current) return;
      setBills(resp?.data || []);
      setBillsTotal(resp?.pagination?.total || 0);
    } catch (e) {
      if (reqId !== billsReqId.current) return;
      setBills([]);
      setBillsTotal(0);
    } finally {
      if (reqId === billsReqId.current) setBillsLoading(false);
    }
  };

  const loadPayments = async () => {
    const reqId = ++paysReqId.current;
    setPaymentsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(paymentsPage + 1),
        limit: String(paymentsRowsPerPage),
      });
      if (paymentsSearch.trim()) qs.set("search", paymentsSearch.trim());
      if (paymentsMethod) qs.set("payment_method", paymentsMethod);

      const resp = await fetchJson(`${API.payments}?${qs.toString()}`, { token });
      if (reqId !== paysReqId.current) return;
      setPayments(resp?.data || []);
      setPaymentsTotal(resp?.pagination?.total || 0);
    } catch {
      if (reqId !== paysReqId.current) return;
      setPayments([]);
      setPaymentsTotal(0);
    } finally {
      if (reqId === paysReqId.current) setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 0) loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, billsPage, billsRowsPerPage, billsSearch, billsStatus]);

  useEffect(() => {
    if (tab === 1) loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, paymentsPage, paymentsRowsPerPage, paymentsSearch, paymentsMethod]);

  const markBillPaidById = async (billId) => {
    if (!billId) return;
    try {
      await fetchJson(`${API.billing}/${billId}/status`, {
        method: "PATCH",
        token,
        body: { status: "paid" },
      });
      Swal.fire({ icon: "success", title: "Updated", text: "Bill marked as paid." });
      await loadBills();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    }
  };

  const takePaymentForBill = async (bill) => {
    if (!bill?.id) return;
    const total = Number(bill.total_amount || 0);
    const paid = Number(bill.paid_amount || 0);
    const balance = Math.max(0, total - paid);

    const ask = await Swal.fire({
      icon: "question",
      title: "Take payment (test)",
      input: "text",
      inputLabel: "Amount to pay",
      inputValue: String(balance > 0 ? balance : total),
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
    if (!ask.isConfirmed) return;
    const amount = Number(ask.value);

    try {
      await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: bill.id,
          amount_paid: amount,
          payment_method: "cash",
          payment_date: new Date().toISOString(),
        },
      });
      Swal.fire({ icon: "success", title: "Paid", text: "Payment recorded." });
      await loadBills();
      if (billing?.bill_id && billing.bill_id === bill.id) await runLookup();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment failed", text: e.message });
    }
  };

  const submitPayment = async () => {
    setPaymentError("");
    setPaymentResult(null);
    setPaymentLoading(true);
    try {
      const data = await fetchJson(`${API.payments}/process`, {
        method: "POST",
        token,
        body: {
          bill_id: payBillId.trim(),
          amount_paid: payAmount === "" ? 0 : Number(payAmount),
          payment_method: payMethod,
          payment_date: new Date().toISOString(),
        },
      });
      setPaymentResult(data?.data || null);
      Swal.fire({ icon: "success", title: "Success", text: "Payment processed." });
    } catch (e) {
      setPaymentError(e.message);
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      <Box
        sx={{
          p: 2.5,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: "white",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
              Billing & Payments
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setPaymentResult(null);
              setPaymentError("");
              if (tab === 0) loadBills();
              if (tab === 1) loadPayments();
            }}
            sx={{
              borderColor: "rgba(255,255,255,0.55)",
              color: "white",
              fontWeight: 800,
              "&:hover": { borderColor: "rgba(255,255,255,0.85)", bgcolor: "rgba(255,255,255,0.08)" },
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <CardContent sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main } }}
        >
          <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Billing" />
          <Tab icon={<PaymentsIcon />} iconPosition="start" label="Payments" />
        </Tabs>
        <Divider />

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Search (patient name/email/phone)"
                value={billsSearch}
                onChange={(e) => {
                  setBillsSearch(e.target.value);
                  setBillsPage(0);
                }}
              />
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 200 } }}>
                <InputLabel id="bill-status-filter">Status</InputLabel>
                <Select
                  labelId="bill-status-filter"
                  value={billsStatus}
                  label="Status"
                  onChange={(e) => {
                    setBillsStatus(e.target.value);
                    setBillsPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Patient</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Paid</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 900 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading bills…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : bills.length ? (
                    bills.map((b, idx) => {
                      const patientName = b?.patient?.full_name || b?.patient?.user?.full_name || "—";
                      const status = b?.paid ? "paid" : b?.status || "unpaid";
                      return (
                        <TableRow key={b.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                            {billsPage * billsRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 800 }}>{patientName}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {b?.patient?.phone || b?.patient?.email || b?.patient?.user?.phone || b?.patient?.user?.email || ""}
                            </Typography>
                          </TableCell>
                          <TableCell>{money(b.total_amount)}</TableCell>
                          <TableCell>{money(b.paid_amount)}</TableCell>
                          <TableCell>{money(b.balance)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={status}
                              color={status === "paid" ? "success" : status === "cancelled" ? "error" : "default"}
                              variant={status === "paid" ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell>{formatDateTime(b.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Take payment (test)">
                                <span>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    disabled={Boolean(b.paid)}
                                    onClick={() => takePaymentForBill(b)}
                                    sx={{ fontWeight: 800 }}
                                  >
                                    Pay
                                  </Button>
                                </span>
                              </Tooltip>
                              <Tooltip title="Mark paid">
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={Boolean(b.paid)}
                                    onClick={() => markBillPaidById(b.id)}
                                    sx={{ fontWeight: 800 }}
                                  >
                                    Mark paid
                                  </Button>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No bills found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={billsTotal}
              page={billsPage}
              onPageChange={(_, p) => setBillsPage(p)}
              rowsPerPage={billsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setBillsRowsPerPage(parseInt(e.target.value, 10));
                setBillsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Search (patient or bill id)"
                value={paymentsSearch}
                onChange={(e) => {
                  setPaymentsSearch(e.target.value);
                  setPaymentsPage(0);
                }}
              />
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
                <InputLabel id="payment-method-filter">Method</InputLabel>
                <Select
                  labelId="payment-method-filter"
                  value={paymentsMethod}
                  label="Method"
                  onChange={(e) => {
                    setPaymentsMethod(e.target.value);
                    setPaymentsPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="test">Test</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="mpesa">M-Pesa</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadPayments}
                disabled={paymentsLoading}
                sx={{ fontWeight: 800, minWidth: { xs: "100%", md: 140 } }}
              >
                Refresh
              </Button>
            </Stack>

            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableCell sx={{ fontWeight: 900, width: 64 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Patient</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Bill</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography color="text.secondary">Loading payments…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : payments.length ? (
                    payments.map((p, idx) => {
                      const bill = p?.bill;
                      const patientName = bill?.patient?.full_name || bill?.patient?.user?.full_name || "—";
                      return (
                        <TableRow key={p.id} hover>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                            {paymentsPage * paymentsRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell>{formatDateTime(p.payment_date)}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 800 }}>{patientName}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {bill?.patient?.phone || bill?.patient?.email || bill?.patient?.user?.phone || bill?.patient?.user?.email || ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                              {p.bill_id}
                            </Typography>
                          </TableCell>
                          <TableCell>{money(p.amount_paid)}</TableCell>
                          <TableCell>{p.payment_method}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3 }}>
                        <Typography color="text.secondary">No payments found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={paymentsTotal}
              page={paymentsPage}
              onPageChange={(_, p) => setPaymentsPage(p)}
              rowsPerPage={paymentsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setPaymentsRowsPerPage(parseInt(e.target.value, 10));
                setPaymentsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
              <Typography sx={{ fontWeight: 900 }}>Process payment</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Uses `POST /api/payments/process` (no real payment gateway; this records a payment and updates bill status).
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  fullWidth
                  label="Bill ID"
                  value={payBillId}
                  onChange={(e) => setPayBillId(e.target.value)}
                  autoComplete="off"
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Amount paid"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  inputMode="decimal"
                />
              </Stack>

              <FormControl size="small" sx={{ maxWidth: 320 }}>
                <InputLabel id="pay-method-label">Payment method</InputLabel>
                <Select
                  labelId="pay-method-label"
                  value={payMethod}
                  label="Payment method"
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="test">Test</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="mpesa">M-Pesa</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={submitPayment}
                disabled={paymentLoading || !payBillId.trim()}
                sx={{ fontWeight: 800, alignSelf: "flex-start" }}
              >
                {paymentLoading ? <CircularProgress size={18} sx={{ color: "white" }} /> : "Process Payment"}
              </Button>

              {!!paymentError && <Alert severity="error">{paymentError}</Alert>}

              {paymentResult?.bill?.id && (
                <Alert severity="success">
                  Payment recorded. Bill status: <b>{paymentResult.bill.status}</b> (Total: {money(paymentResult.bill.total_amount)})
                </Alert>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

