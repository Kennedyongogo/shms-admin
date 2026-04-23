import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Science as ScienceIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import Swal from "sweetalert2";

const API_KENYA_LAB_TESTS = "/api/kenya-lab-tests";
const API_LAB_TESTS = "/api/lab-tests";
const getToken = () => localStorage.getItem("token");

async function fetchJson(url, { method = "GET", token, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  return data;
}

function parseOptionsCsv(f) {
  return String(f.options || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function defaultPreviewValueForField(f) {
  const t = String(f.type || "text").toLowerCase();
  const a = f.answer;
  const opts = parseOptionsCsv(f);

  if (t === "checkbox" || t === "boolean") {
    if (opts.length) {
      if (a == null || String(a).trim() === "") return [];
      if (Array.isArray(a)) return a.map(String);
      return String(a)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => opts.includes(s));
    }
    return String(a).toLowerCase() === "true";
  }
  if (t === "multi_select") {
    if (Array.isArray(a)) return a.map(String);
    if (typeof a === "string" && a.trim()) {
      return a
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }
  if (t === "select") {
    if (a != null && String(a).trim() !== "") return String(a);
    return "";
  }
  if (t === "multi_text") {
    if (Array.isArray(a)) return a.map(String);
    if (a != null && String(a).trim() !== "") return [String(a)];
    return [];
  }
  if (t === "number") {
    if (a == null || String(a).trim() === "") return "";
    const n = Number(a);
    return Number.isFinite(n) ? n : "";
  }
  return a != null ? String(a) : "";
}

function previewValueMatchesFieldType(val, f) {
  const t = String(f.type || "text").toLowerCase();
  const opts = parseOptionsCsv(f);
  if (t === "checkbox" || t === "boolean") {
    if (opts.length) return Array.isArray(val);
    return typeof val === "boolean";
  }
  if (t === "number") {
    return val === "" || typeof val === "number";
  }
  if (t === "multi_text" || t === "multi_select") {
    return Array.isArray(val);
  }
  if (t === "select" || t === "text") {
    return typeof val === "string";
  }
  return true;
}

export default function CreateLabTestPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = getToken();

  const [kenyaTests, setKenyaTests] = useState([]);
  const [kenyaPagination, setKenyaPagination] = useState(null);
  const [kenyaPage, setKenyaPage] = useState(1);
  const [existingTestCodes, setExistingTestCodes] = useState(new Set());
  const [existingCodesLoaded, setExistingCodesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({ test_name: "", test_code: "", price: "" });
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateFields, setTemplateFields] = useState([
    { key: "result", label: "Result", type: "text", required: true, options: "", unit: "", rangeLow: "", rangeHigh: "", answer: "" },
  ]);
  const [templateUiError, setTemplateUiError] = useState("");
  const [saving, setSaving] = useState(false);
  /** Sample answers for the template preview (one entry per template row). */
  const [previewByRow, setPreviewByRow] = useState([]);

  const templateTypeSignature = useMemo(
    () => (templateFields || []).map((f) => `${String(f.type || "text")}|${f.options || ""}`).join(";"),
    [templateFields]
  );

  useEffect(() => {
    if (!useTemplate) return;
    setPreviewByRow((prev) =>
      (templateFields || []).map((f, i) => {
        if (i < prev.length && previewValueMatchesFieldType(prev[i], f)) return prev[i];
        return defaultPreviewValueForField(f);
      })
    );
  }, [useTemplate, templateTypeSignature, templateFields.length]);

  // Load this hospital's lab tests first so we never show already-added tests in the cards
  const loadExistingLabTests = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchJson(`${API_LAB_TESTS}?limit=500&page=1`, { token });
      const list = data.data ?? [];
      setExistingTestCodes(
        new Set(list.map((t) => (t.test_code ?? t.testCode ?? "").toString().trim()).filter(Boolean))
      );
    } catch {
      setExistingTestCodes(new Set());
    } finally {
      setExistingCodesLoaded(true);
    }
  }, [token]);

  const loadKenyaTests = useCallback(
    async (page) => {
      if (!token) return;
      setLoading(true);
      try {
        const limit = search.trim() ? "30" : "10";
        const qs = new URLSearchParams({
          limit,
          page: String(page),
          exclude_added: "1",
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        const data = await fetchJson(`${API_KENYA_LAB_TESTS}?${qs.toString()}`, { token });
        setKenyaTests(data.data ?? []);
        setKenyaPagination(data.pagination ?? null);
      } catch (e) {
        setKenyaTests([]);
        setKenyaPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [token, search]
  );

  useEffect(() => {
    loadExistingLabTests();
  }, [loadExistingLabTests]);

  useEffect(() => {
    setKenyaPage(1);
  }, [search]);

  useEffect(() => {
    loadKenyaTests(kenyaPage);
  }, [kenyaPage, search, loadKenyaTests]);

  useEffect(() => {
    if (selected) {
      setForm((p) => ({
        ...p,
        test_name: selected.test_name ?? "",
        test_code: selected.code ?? "",
      }));
    }
  }, [selected]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.test_name.trim()) {
      Swal.fire({ icon: "warning", title: "Missing name", text: "Test name is required." });
      return;
    }
    if (!form.test_code.trim()) {
      Swal.fire({ icon: "warning", title: "Missing code", text: "Test code is required." });
      return;
    }
    const priceVal = String(form.price ?? "").trim();
    let parsedTemplate = null;
    if (useTemplate) {
      const slugifyKey = (s) =>
        String(s || "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 64);

      const clean = (templateFields || []).map((f) => ({
        key: String(f.key || "").trim(),
        label: String(f.label || "").trim(),
        type: String(f.type || "text").trim(),
        required: !!f.required,
        // "answer" is an example/default answer the admin can set (optional)
        answer: String(f.answer || "").trim() || undefined,
        unit: String(f.unit || "").trim() || undefined,
        range:
          (String(f.rangeLow || "").trim() || String(f.rangeHigh || "").trim())
            ? {
                low: String(f.rangeLow || "").trim() === "" ? undefined : Number(f.rangeLow),
                high: String(f.rangeHigh || "").trim() === "" ? undefined : Number(f.rangeHigh),
              }
            : undefined,
        options:
          String(f.options || "").trim() &&
          (() => {
            const ty = String(f.type || "").toLowerCase();
            return ty === "select" || ty === "multi_select" || ty === "checkbox";
          })()
            ? String(f.options)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
      }));

      for (let i = 0; i < clean.length; i++) {
        const fld = clean[i];
        if (!fld.key && fld.label) fld.key = slugifyKey(fld.label);
      }
      {
        const seen = new Set();
        for (let i = 0; i < clean.length; i++) {
          let k = String(clean[i].key || "").trim();
          if (!k) continue;
          const base = k;
          let n = 2;
          while (seen.has(k)) {
            k = `${base}_${n}`;
            n += 1;
          }
          clean[i].key = k;
          seen.add(k);
        }
      }

      const errors = [];
      for (let i = 0; i < clean.length; i++) {
        const fld = clean[i];
        const rawRow = (templateFields || [])[i];
        if (!fld.key) errors.push("Each question must have text (used to generate a key)");
        if (!fld.label) errors.push(`Each question must have text`);
        const t = String(fld.type || "").toLowerCase();
        if ((t === "select" || t === "multi_select") && (!Array.isArray(fld.options) || fld.options.length === 0)) {
          errors.push(`Field "${fld.key}" needs options (comma separated)`);
        }
        if (
          t === "checkbox" &&
          String(rawRow?.options || "").trim() &&
          (!Array.isArray(fld.options) || fld.options.length === 0)
        ) {
          errors.push(
            `Field "${fld.key}": add at least one option, or clear options to use a single yes/no checkbox`,
          );
        }
        if (fld.range) {
          const lo = fld.range.low;
          const hi = fld.range.high;
          if (lo !== undefined && !Number.isFinite(lo)) errors.push(`Field "${fld.key}" range low must be a number`);
          if (hi !== undefined && !Number.isFinite(hi)) errors.push(`Field "${fld.key}" range high must be a number`);
        }
      }
      if (clean.length === 0) errors.push("Add at least one template field, or turn off templates");
      if (errors.length) {
        setTemplateUiError(errors[0]);
        Swal.fire({ icon: "error", title: "Template error", text: errors[0] });
        return;
      }
      setTemplateUiError("");
      parsedTemplate = { version: 1, fields: clean.map((f) => {
        const out = { key: f.key, label: f.label, type: f.type, required: f.required };
        if (f.unit) out.unit = f.unit;
        if (f.range && (f.range.low !== undefined || f.range.high !== undefined)) out.range = f.range;
        if (Array.isArray(f.options)) out.options = f.options;
        if (f.answer) out.answer = f.answer;
        return out;
      }) };
    }
    const payload = {
      test_name: form.test_name.trim(),
      test_code: form.test_code.trim(),
      price: priceVal ? Number(priceVal) : null,
      ...(selected?.id ? { kenya_lab_test_id: selected.id } : {}),
      ...(parsedTemplate ? { template: parsedTemplate } : {}),
    };
    setSaving(true);
    try {
      await fetchJson(API_LAB_TESTS, { method: "POST", token, body: payload });
      Swal.fire({ icon: "success", title: "Lab test created", timer: 1200, showConfirmButton: false });
      setForm({ test_name: "", test_code: "", price: "" });
      setSelected(null);
      await loadExistingLabTests();
      navigate("/laboratory");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark || "#00695C"} 0%, ${theme.palette.primary.main} 100%)`;

  const getPreviewValue = (i) => {
    const f = (templateFields || [])[i];
    if (!f) return null;
    if (i < previewByRow.length && previewValueMatchesFieldType(previewByRow[i], f)) {
      return previewByRow[i];
    }
    return defaultPreviewValueForField(f);
  };

  const setPreviewAt = (i, v) => {
    setPreviewByRow((prev) => {
      const tfs = templateFields || [];
      return tfs.map((f, j) => {
        if (j === i) return v;
        if (j < prev.length && previewValueMatchesFieldType(prev[j], f)) return prev[j];
        return defaultPreviewValueForField(f);
      });
    });
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 3, borderRadius: 3, overflow: "hidden", color: "white", background: heroGradient, boxShadow: theme.shadows[4] }}>
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
              <IconButton
                onClick={() => navigate("/laboratory")}
                sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
                aria-label="Back to Laboratory"
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
                  <ScienceIcon sx={{ fontSize: 28 }} />
                  Create Lab Test
                </Typography>
                <Typography sx={{ opacity: 0.9, mt: 0.5, fontSize: "0.95rem" }}>
                  Pick a test from the Kenya catalogue or enter your own, then set your hospital&apos;s charge.
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Select from Kenya lab tests (optional)
        </Typography>
        {kenyaPagination != null && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {search.trim()
              ? `Searching all Kenya tests. Showing ${kenyaTests.length} of ${kenyaPagination.total} matches.`
              : `Showing ${kenyaTests.length} of ${kenyaPagination.total} Kenya tests not yet in your lab. Use search or pagination for more.`}
          </Typography>
        )}
        <TextField
          fullWidth
          size="medium"
          placeholder="Search by test name, code, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "action.active" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              bgcolor: "background.paper",
              borderRadius: 2,
              "&:hover": { bgcolor: "grey.50" },
            },
          }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 2,
            mb: 4,
            "& > *": { minWidth: 0 },
            "@media (max-width: 1200px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
            "@media (max-width: 768px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
            "@media (max-width: 500px)": { gridTemplateColumns: "1fr" },
          }}
        >
          {!existingCodesLoaded || loading ? (
            <Box sx={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (() => {
              const notYetAdded = kenyaTests.filter(
                    (item) => !existingTestCodes.has((item.code ?? item.test_code ?? "").toString().trim())
                  );
              return notYetAdded.length === 0 ? (
                <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 3 }}>
                  <Typography color="text.secondary">
                    {kenyaTests.length === 0
                      ? kenyaPagination?.total > 0
                        ? "No results on this page. Use Next below or search to find more."
                        : "No Kenya lab tests found. Enter test details manually below."
                      : "All tests in this list are already in your lab. Try Next page, a different search, or enter details manually below."}
                  </Typography>
                </Box>
              ) : (
                notYetAdded.map((item) => {
              const isSelected = selected?.id === item.id;
              return (
                <Card
                  key={item.id}
                  variant="outlined"
                  onClick={() => setSelected(item)}
                  sx={{
                    cursor: "pointer",
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: isSelected ? theme.palette.primary.main : "divider",
                    bgcolor: isSelected ? theme.palette.primary.main + "08" : "background.paper",
                    transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
                    "&:hover": {
                      borderColor: theme.palette.primary.main,
                      boxShadow: theme.shadows[2],
                      bgcolor: theme.palette.primary.main + "06",
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block" }}>
                          {item.code || "—"}
                        </Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.3, mt: 0.25 }} noWrap>
                          {item.test_name}
                        </Typography>
                        {item.category && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                            {item.category}
                          </Typography>
                        )}
                      </Box>
                      {isSelected && (
                        <CheckCircleIcon sx={{ color: theme.palette.primary.main, fontSize: 22, flexShrink: 0 }} />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
                })
              );
            })()}
        </Box>

        {kenyaPagination && kenyaPagination.totalPages > 1 && (
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={kenyaPage <= 1 || loading}
              onClick={() => setKenyaPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Typography variant="body2" color="text.secondary">
              Page {kenyaPage} of {kenyaPagination.totalPages}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={kenyaPage >= kenyaPagination.totalPages || loading}
              onClick={() => setKenyaPage((p) => p + 1)}
            >
              Next
            </Button>
          </Stack>
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Lab test details & charge
        </Typography>
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5} sx={{ width: "100%" }}>
                <TextField
                  label="Test name"
                  fullWidth
                  required
                  value={form.test_name}
                  onChange={(e) => setForm((p) => ({ ...p, test_name: e.target.value }))}
                  placeholder="e.g. Full Blood Count"
                  helperText={selected ? "Filled from selected Kenya test (you can edit)" : "Enter name or select a card above"}
                />
                <TextField
                  label="Test code"
                  fullWidth
                  required
                  value={form.test_code}
                  onChange={(e) => setForm((p) => ({ ...p, test_code: e.target.value }))}
                  placeholder="e.g. FBC"
                  helperText={selected ? "Filled from selected Kenya test (you can edit)" : "Enter code or select a card above"}
                />
                <TextField
                  label="Price (charges)"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  fullWidth
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                  helperText="Your hospital&apos;s charge for this test"
                />

                <Box sx={{ pt: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                    Result template
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Build the result entry form for this test (no JSON needed). <b>checkbox</b> can be a single yes/no, or
                    add <b>Options (comma separated)</b> for multiple checkboxes. Other types: <b>text</b>, <b>multi_text</b>,{" "}
                    <b>number</b>, <b>select</b>, <b>multi_select</b>. Use the <b>Preview</b> below to try the form before creating.
                  </Typography>

                  <FormControlLabel
                    control={<Switch checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} />}
                    label={useTemplate ? "Template enabled" : "No template (simple result only)"}
                    sx={{ mb: 1 }}
                  />

                  {useTemplate && (
                    <>
                      {templateUiError && (
                        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                          {templateUiError}
                        </Typography>
                      )}

                      <Stack spacing={1.25}>
                        {(templateFields || []).map((f, idx) => {
                          const type = String(f.type || "text");
                          const showOptions = type === "select" || type === "multi_select" || type === "checkbox";
                          const showRange = type === "number";
                          return (
                            <Card key={`${idx}-${f.key || "field"}`} variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                                <Stack spacing={1.5}>
                                  <TextField
                                    label="Question"
                                    size="small"
                                    value={f.label}
                                    onChange={(e) =>
                                      setTemplateFields((prev) =>
                                        prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                                      )
                                    }
                                    placeholder="e.g. Malaria"
                                    fullWidth
                                  />
                                  <TextField
                                    label="Answer (optional)"
                                    size="small"
                                    value={f.answer || ""}
                                    onChange={(e) =>
                                      setTemplateFields((prev) =>
                                        prev.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)),
                                      )
                                    }
                                    placeholder={
                                      type === "checkbox" && String(f.options || "").trim()
                                        ? "e.g. first option, second (as default selected)"
                                        : type === "checkbox"
                                          ? "e.g. true"
                                          : type === "number"
                                            ? "e.g. 13.5"
                                            : "e.g. Negative"
                                    }
                                    fullWidth
                                  />
                                  <TextField
                                    select
                                    label="Expected answer type"
                                    size="small"
                                    value={type}
                                    onChange={(e) =>
                                      setTemplateFields((prev) =>
                                        prev.map((x, i) =>
                                          i === idx
                                            ? {
                                                ...x,
                                                type: e.target.value,
                                                options:
                                                  e.target.value === "select" || e.target.value === "multi_select" || e.target.value === "checkbox"
                                                    ? x.options
                                                    : "",
                                              }
                                            : x,
                                        ),
                                      )
                                    }
                                    fullWidth
                                  >
                                    <MenuItem value="text">text</MenuItem>
                                    <MenuItem value="multi_text">multi_text</MenuItem>
                                    <MenuItem value="number">number</MenuItem>
                                    <MenuItem value="checkbox">checkbox</MenuItem>
                                    <MenuItem value="select">select</MenuItem>
                                    <MenuItem value="multi_select">multi_select</MenuItem>
                                  </TextField>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={!!f.required}
                                        onChange={(e) =>
                                          setTemplateFields((prev) =>
                                            prev.map((x, i) => (i === idx ? { ...x, required: e.target.checked } : x)),
                                          )
                                        }
                                      />
                                    }
                                    label="Required"
                                  />
                                  <Button
                                    type="button"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => setTemplateFields((prev) => prev.filter((_, i) => i !== idx))}
                                    sx={{ alignSelf: "flex-start" }}
                                  >
                                    Remove
                                  </Button>
                                </Stack>

                                {/* Unit/range removed from UI as requested */}

                                {showOptions && (
                                  <TextField
                                    label="Options (comma separated)"
                                    size="small"
                                    fullWidth
                                    sx={{ mt: 1 }}
                                    value={f.options}
                                    onChange={(e) =>
                                      setTemplateFields((prev) =>
                                        prev.map((x, i) => (i === idx ? { ...x, options: e.target.value } : x)),
                                      )
                                    }
                                    placeholder="e.g. Positive, Negative"
                                  />
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}

                        <Button
                          type="button"
                          variant="outlined"
                          onClick={() =>
                            setTemplateFields((prev) => [
                              ...prev,
                              { key: "", label: "", type: "text", required: false, options: "", unit: "", rangeLow: "", rangeHigh: "", answer: "" },
                            ])
                          }
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Add question
                        </Button>

                        <Card
                          variant="outlined"
                          sx={{ mt: 1.5, borderRadius: 2, borderStyle: "dashed", borderColor: "divider", bgcolor: "action.selected" }}
                        >
                          <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                            <Stack
                              direction="row"
                              alignItems="flex-start"
                              justifyContent="space-between"
                              flexWrap="wrap"
                              gap={1}
                              sx={{ mb: 1.5 }}
                            >
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                  Preview
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  How the result form will look for staff. Try it before you create the test.
                                </Typography>
                              </Box>
                              <Button
                                type="button"
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  setPreviewByRow((templateFields || []).map((f) => defaultPreviewValueForField(f)))
                                }
                              >
                                Reset preview
                              </Button>
                            </Stack>
                            <Stack spacing={1.5}>
                              {(templateFields || []).map((f, idx) => {
                                const t = String(f.type || "text").toLowerCase();
                                const label = f.label || "(no question text yet)";
                                const options = parseOptionsCsv(f);
                                const required = !!f.required;
                                const v = getPreviewValue(idx);
                                return (
                                  <Box
                                    key={idx}
                                    sx={{
                                      p: 1.5,
                                      borderRadius: 2,
                                      bgcolor: "background.paper",
                                      border: "1px solid",
                                      borderColor: "divider",
                                    }}
                                  >
                                    {t === "checkbox" || t === "boolean" ? (
                                      options.length ? (
                                        <>
                                          <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                            {label}
                                            {required ? " *" : ""}
                                          </Typography>
                                          <FormGroup>
                                            {options.map((opt) => {
                                              const arr = Array.isArray(v) ? v.map(String) : [];
                                              return (
                                                <FormControlLabel
                                                  key={opt}
                                                  control={
                                                    <Checkbox
                                                      size="small"
                                                      checked={arr.indexOf(opt) > -1}
                                                      onChange={() => {
                                                        const next = new Set(arr);
                                                        if (next.has(opt)) next.delete(opt);
                                                        else next.add(opt);
                                                        setPreviewAt(idx, Array.from(next));
                                                      }}
                                                    />
                                                  }
                                                  label={opt}
                                                />
                                              );
                                            })}
                                          </FormGroup>
                                        </>
                                      ) : (
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              size="small"
                                              checked={Boolean(v)}
                                              onChange={(e) => setPreviewAt(idx, e.target.checked)}
                                            />
                                          }
                                          label={
                                            <Typography component="span" sx={{ fontWeight: 800 }}>
                                              {label}
                                              {required ? " *" : ""}
                                            </Typography>
                                          }
                                        />
                                      )
                                    ) : t === "select" ? (
                                      <FormControl fullWidth size="small">
                                        <InputLabel>{required ? `${label} *` : label}</InputLabel>
                                        <Select
                                          label={required ? `${label} *` : label}
                                          value={options.includes(String(v)) ? String(v) : ""}
                                          onChange={(e) => setPreviewAt(idx, e.target.value)}
                                        >
                                          <MenuItem value="">
                                            <em>None</em>
                                          </MenuItem>
                                          {options.map((opt) => (
                                            <MenuItem key={opt} value={opt}>
                                              {opt}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    ) : t === "multi_select" ? (
                                      <FormControl fullWidth size="small">
                                        <InputLabel>{required ? `${label} *` : label}</InputLabel>
                                        <Select
                                          multiple
                                          label={required ? `${label} *` : label}
                                          value={Array.isArray(v) ? v.map(String) : []}
                                          onChange={(e) => setPreviewAt(idx, e.target.value)}
                                          renderValue={(selected) => (
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                                              {(selected || []).map((x) => (
                                                <Chip key={x} size="small" label={x} />
                                              ))}
                                            </Box>
                                          )}
                                        >
                                          {options.map((opt) => (
                                            <MenuItem key={opt} value={opt}>
                                              <Checkbox
                                                size="small"
                                                checked={Array.isArray(v) && v.map(String).indexOf(opt) > -1}
                                              />
                                              <ListItemText primary={opt} />
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    ) : t === "multi_text" ? (
                                      <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        minRows={2}
                                        label={required ? `${label} *` : label}
                                        value={Array.isArray(v) ? v.join("\n") : ""}
                                        onChange={(e) => {
                                          const lines = e.target.value
                                            .split("\n")
                                            .map((s) => s.trim())
                                            .filter((s) => s.length);
                                          setPreviewAt(idx, lines);
                                        }}
                                      />
                                    ) : t === "number" ? (
                                      <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label={required ? `${label} *` : label}
                                        value={v === "" || v === null || v === undefined ? "" : v}
                                        onChange={(e) => {
                                          const s = e.target.value;
                                          if (s === "") {
                                            setPreviewAt(idx, "");
                                            return;
                                          }
                                          const n = Number(s);
                                          setPreviewAt(idx, Number.isFinite(n) ? n : "");
                                        }}
                                        inputProps={{ step: "any" }}
                                      />
                                    ) : (
                                      <TextField
                                        fullWidth
                                        size="small"
                                        label={required ? `${label} *` : label}
                                        value={v != null ? String(v) : ""}
                                        onChange={(e) => setPreviewAt(idx, e.target.value)}
                                      />
                                    )}
                                  </Box>
                                );
                              })}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Stack>
                    </>
                  )}
                </Box>
                <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => navigate("/laboratory")}
                    sx={{ fontWeight: 700 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    sx={{
                      fontWeight: 800,
                      bgcolor: theme.palette.primary.main,
                      "&:hover": { bgcolor: theme.palette.primary.dark },
                    }}
                  >
                    {saving ? "Creating…" : "Create lab test"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
