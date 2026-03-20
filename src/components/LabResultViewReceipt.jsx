import React, { useMemo, useRef, useState } from "react";
import { Box, Button, Checkbox, Chip, Paper, Stack, Typography } from "@mui/material";
import { Download as DownloadIcon, Print as PrintIcon } from "@mui/icons-material";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Standalone "receipt-style" view for a single lab result.
 * Shows hospital header + filled template fields + interpretation.
 * Includes Print and Download (PDF) actions.
 */
export default function LabResultViewReceipt({
  open,
  onClose,
  hospital,
  patientName,
  testName,
  technicianName,
  resultDateLabel,
  resultTemplate,
  resultValues,
  interpretation,
  shouldShowTemplateField,
}) {
  const printRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const fields = useMemo(() => resultTemplate?.fields || [], [resultTemplate]);

  const onPrint = () => {
    if (!printRef.current) return;
    window.print();
  };

  const onDownloadPdf = async () => {
    if (!printRef.current) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = 210; // a4 width in mm
      const pdfHeight = 297; // a4 height in mm
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const fileName = `lab-result-${String(testName || "result").slice(0, 40)}.pdf`
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9_-]/g, "");

      pdf.save(fileName || "lab-result.pdf");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Paper
      elevation={0}
      ref={printRef}
      sx={{
        mt: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Print-only CSS */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .lab-result-view-no-print { display: none !important; }
          #lab-result-view-root { box-shadow: none !important; }
        }
      `}</style>

      <Box id="lab-result-view-root">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography sx={{ fontWeight: 1000, fontSize: 18 }}>
              {hospital?.hospital_name || hospital?.name || "Hospital"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View lab result
            </Typography>
          </Box>

          <Stack className="lab-result-view-no-print" direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PrintIcon />}
              onClick={onPrint}
              disabled={busy}
              sx={{ fontWeight: 800 }}
            >
              Print
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={onDownloadPdf}
              disabled={busy}
              sx={{ fontWeight: 800 }}
            >
              {busy ? "Preparing…" : "Download PDF"}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={onClose}
              sx={{ fontWeight: 800 }}
              disabled={busy}
            >
              Close
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ mt: 1.5, borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
          <Stack spacing={0.75}>
            <Typography variant="body2">
              <b>Patient:</b> {patientName || "—"}
            </Typography>
            <Typography variant="body2">
              <b>Test:</b> {testName || "—"}
            </Typography>
            <Typography variant="body2">
              <b>Technician:</b> {technicianName || "—"}
            </Typography>
            <Typography variant="body2">
              <b>Date:</b> {resultDateLabel || "—"}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 1000, mb: 1 }}>Results</Typography>
          <Stack spacing={1.25}>
            {Array.isArray(fields) && fields.length ? (
              fields.map((q, i) => {
                const key = q?.key || q?.name || `q_${i}`;
                const visible = shouldShowTemplateField ? shouldShowTemplateField(q, resultValues) : true;
                if (!visible) return null;

                const type = String(q?.type || "text").toLowerCase();
                const label = q?.label || q?.key || `Question ${i + 1}`;
                const required = !!q?.required;
                const options = Array.isArray(q?.options) ? q.options : [];
                const value = resultValues?.[key];

                // Checkbox/boolean
                if (type === "checkbox" || type === "boolean") {
                  return (
                    <Box key={key} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Checkbox checked={Boolean(value)} disabled />
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {label}
                      </Typography>
                    </Box>
                  );
                }

                // Select
                if (type === "select") {
                  return (
                    <Box key={key}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {value != null && String(value).trim() !== "" ? String(value) : "—"}
                      </Typography>
                    </Box>
                  );
                }

                // Multi-select
                if (type === "multi_select") {
                  const arr = Array.isArray(value) ? value.map(String) : [];
                  return (
                    <Box key={key}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {label}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", mt: 0.5 }}>
                        {arr.length ? arr.map((v) => <Chip key={v} size="small" label={v} />) : <Typography color="text.secondary">—</Typography>}
                      </Stack>
                    </Box>
                  );
                }

                // Multi-text
                if (type === "multi_text") {
                  const lines = Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : [];
                  return (
                    <Box key={key}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                        {lines.length ? lines.join("\n") : "—"}
                      </Typography>
                    </Box>
                  );
                }

                // number/text/default
                return (
                  <Box key={key}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {value != null && String(value).trim() !== "" ? String(value) : options.length && options.includes(value) ? String(value) : "—"}
                    </Typography>
                  </Box>
                );
              })
            ) : (
              <Typography color="text.secondary">No template fields.</Typography>
            )}
          </Stack>
        </Box>

        <Box sx={{ mt: 2, borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
          <Typography sx={{ fontWeight: 1000 }}>Interpretation</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-line" }}>
            {interpretation ? String(interpretation) : "—"}
          </Typography>
        </Box>

        <Box sx={{ mt: 2, pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            Thank you for your visit.
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

