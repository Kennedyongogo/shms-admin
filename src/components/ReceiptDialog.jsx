import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { GetApp as DownloadIcon, Print as PrintIcon, Receipt as ReceiptIcon } from "@mui/icons-material";
import Swal from "sweetalert2";

const API_PAYMENTS = "/api/payments";

async function fetchPdfBlob(url, token) {
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load receipt PDF");
  return res.blob();
}

/**
 * Dialog that shows receipt PDF (like medical report) with Print and Download.
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string|null} paymentId - Payment UUID
 * @param {() => string|null} getToken - e.g. () => localStorage.getItem("token")
 */
export default function ReceiptDialog({ open, onClose, paymentId, getToken }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef(null);
  const urlRef = useRef(null);

  useEffect(() => {
    if (!open || !paymentId || !getToken?.()) return;
    let cancelled = false;
    setLoading(true);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPdfUrl(null);
    const token = getToken();
    fetchPdfBlob(`${API_PAYMENTS}/${paymentId}/receipt/pdf`, token)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPdfUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPdfUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setPdfUrl(null);
    };
  }, [open, paymentId, getToken]);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else if (pdfUrl) {
      const w = window.open(pdfUrl, "_blank", "noopener");
      if (w) w.onload = () => w.print();
    }
  };

  const handleDownload = async () => {
    if (!paymentId || !getToken?.()) return;
    try {
      const token = getToken();
      const blob = await fetchPdfBlob(`${API_PAYMENTS}/${paymentId}/receipt/pdf?download=1`, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${paymentId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Download failed", text: e?.message || "Could not download receipt." });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800 }}>
        <ReceiptIcon color="primary" />
        Payment Receipt
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, overflowY: "auto" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", p: 1.5, display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button size="small" startIcon={<PrintIcon />} variant="outlined" onClick={handlePrint} disabled={!pdfUrl} sx={{ fontWeight: 700 }}>
            Print
          </Button>
          <Button size="small" startIcon={<DownloadIcon />} variant="contained" onClick={handleDownload} disabled={!paymentId} sx={{ fontWeight: 700 }}>
            Download PDF
          </Button>
        </Box>
        <Box sx={{ height: 520, bgcolor: "grey.100" }}>
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={1}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">Loading receipt…</Typography>
            </Stack>
          ) : pdfUrl ? (
            <iframe
              ref={iframeRef}
              title="Receipt PDF"
              src={pdfUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : paymentId && !loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
              <Typography variant="body2" color="text.secondary">Could not load receipt.</Typography>
            </Stack>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ fontWeight: 700 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
