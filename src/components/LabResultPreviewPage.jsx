import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Download as DownloadIcon, Print as PrintIcon } from "@mui/icons-material";

export default function LabResultPreviewPage() {
  const navigate = useNavigate();
  const { resultId } = useParams();

  const API_LAB_RESULTS = "/api/lab-results";
  const token = localStorage.getItem("token");

  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const urlRef = useRef(null);

  const fetchPdfBlob = async (url) => {
    const res = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to load lab result receipt PDF");
    return res.blob();
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!resultId) {
        setError("Missing result id.");
        return;
      }
      setError(null);
      setLoading(true);
      setPdfUrl(null);
      try {
        const blob = await fetchPdfBlob(`${API_LAB_RESULTS}/${encodeURIComponent(resultId)}/receipt/pdf`);
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPdfUrl(url);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load lab result receipt.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [resultId]);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else if (pdfUrl) {
      const w = window.open(pdfUrl, "_blank", "noopener");
      if (w) w.onload = () => w.print();
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await fetchPdfBlob(`${API_LAB_RESULTS}/${encodeURIComponent(resultId)}/receipt/pdf?download=1`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lab-result-${String(resultId).slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Download failed.");
    }
  };

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 900 }}>Lab Result</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<PrintIcon />} variant="outlined" onClick={handlePrint} disabled={!pdfUrl || loading}>
            Print
          </Button>
          <Button size="small" startIcon={<DownloadIcon />} variant="contained" onClick={handleDownload} disabled={!resultId || loading}>
            {loading ? "Preparing…" : "Download PDF"}
          </Button>
          <Button size="small" variant="text" onClick={() => navigate("/laboratory", { state: { tab: 2 } })} disabled={loading}>
            Back
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", height: "75vh", bgcolor: "grey.100" }}>
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Failed to load PDF</Typography>
            <Typography color="text.secondary">{error}</Typography>
          </Box>
        ) : (
          pdfUrl && (
            <iframe
              ref={iframeRef}
              title="Lab Result Receipt PDF"
              src={pdfUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          )
        )}
      </Box>
    </Box>
  );
}

