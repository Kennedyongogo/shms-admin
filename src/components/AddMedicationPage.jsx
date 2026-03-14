import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  LocalPharmacy as LocalPharmacyIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
} from "@mui/icons-material";

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
  if (!res.ok) throw new Error(data?.message || data?.error || "Request failed");
  return data;
}

function getDescendantIds(categories, rootId) {
  const ids = [rootId];
  let added = true;
  while (added) {
    added = false;
    for (const c of categories) {
      if (c.parent_id && ids.includes(c.parent_id) && !ids.includes(c.id)) {
        ids.push(c.id);
        added = true;
      }
    }
  }
  return ids;
}

export default function AddMedicationPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = getToken();

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dosage_form: "",
    unit_price: "",
    manufacturer: "",
    unit: "",
    pack_size: "",
    packs_in_stock: "",
    initial_quantity: "",
  });
  const [catalogueLink, setCatalogueLink] = useState({
    drug_id: null,
    drug_formulation_id: null,
  });

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [drugs, setDrugs] = useState([]);
  const [drugsLoading, setDrugsLoading] = useState(false);
  const [selectedDoseForm, setSelectedDoseForm] = useState("");
  const [selectedDrugFormulationId, setSelectedDrugFormulationId] = useState("");

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  // Auto-calculate Init qty from Packs in stock × Pack size when both are set
  useEffect(() => {
    if (form.pack_size === "" || form.packs_in_stock === "") return;
    const packSize = Number(form.pack_size);
    const packsInStock = Number(form.packs_in_stock);
    if (Number.isFinite(packSize) && packSize >= 0 && Number.isFinite(packsInStock) && packsInStock >= 0) {
      const total = packsInStock * packSize;
      setForm((p) => (p.initial_quantity === String(total) ? p : { ...p, initial_quantity: String(total) }));
    }
  }, [form.pack_size, form.packs_in_stock]);

  useEffect(() => {
    let cancelled = false;
    fetchJson("/api/drug-categories?limit=500&minimal=1", { token })
      .then((res) => { if (!cancelled) setCategories(res?.data ?? []); })
      .catch(() => { if (!cancelled) setCategories([]); })
      .finally(() => { if (!cancelled) setCategoriesLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setDrugs([]);
      setSelectedDoseForm("");
      setSelectedDrugFormulationId("");
      return;
    }
    let cancelled = false;
    setDrugsLoading(true);
    const ids = getDescendantIds(categories, selectedCategoryId);
    const qs = new URLSearchParams({ limit: "500", drug_category_id: ids.join(",") });
    fetchJson(`/api/drugs?${qs.toString()}`, { token })
      .then((res) => { if (!cancelled) setDrugs(res?.data ?? []); })
      .catch(() => { if (!cancelled) setDrugs([]); })
      .finally(() => {
        if (!cancelled) setDrugsLoading(false);
        setSelectedDoseForm("");
        setSelectedDrugFormulationId("");
      });
    return () => { cancelled = true; };
  }, [token, selectedCategoryId, categories]);

  const formulationTypes = useMemo(() => {
    const set = new Set();
    drugs.forEach((d) => {
      const forms = d.formulations || d.drugFormulations;
      if (Array.isArray(forms)) forms.forEach((f) => f.dose_form && set.add(f.dose_form));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [drugs]);

  const drugFormulationOptions = useMemo(() => {
    if (!selectedDoseForm) return [];
    const out = [];
    drugs.forEach((drug) => {
      const forms = drug.formulations || drug.drugFormulations;
      if (!Array.isArray(forms)) return;
      forms.forEach((f) => {
        if (f.dose_form === selectedDoseForm) {
          out.push({
            drug_id: drug.id,
            drug_name: drug.name,
            formulation_id: f.id,
            dose_form: f.dose_form,
            strength_size: f.strength_size || "",
          });
        }
      });
    });
    return out.sort((a, b) => a.drug_name.localeCompare(b.drug_name));
  }, [drugs, selectedDoseForm]);

  const applyCatalogueSelection = (option) => {
    if (!option) {
      setCatalogueLink({ drug_id: null, drug_formulation_id: null });
      return;
    }
    setCatalogueLink({ drug_id: option.drug_id, drug_formulation_id: option.formulation_id });
    update("name", option.drug_name);
    update("dosage_form", option.strength_size ? `${option.dose_form} ${option.strength_size}`.trim() : option.dose_form);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await fetchJson("/api/medications", {
        method: "POST",
        token,
        body: {
          name: form.name.trim(),
          dosage_form: form.dosage_form.trim() || null,
          manufacturer: form.manufacturer.trim() || null,
          unit_price: form.unit_price === "" ? null : form.unit_price,
          unit: form.unit.trim() || null,
          pack_size: form.pack_size === "" ? null : Number(form.pack_size),
          initial_quantity: form.initial_quantity === "" ? null : Number(form.initial_quantity),
          inventory_item_id: null,
          drug_id: catalogueLink.drug_id || null,
          drug_formulation_id: catalogueLink.drug_formulation_id || null,
        },
      });
      navigate("/pharmacy");
    } catch (err) {
      alert(err.message || "Failed to add medication");
    } finally {
      setSubmitting(false);
    }
  };

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark || "#00695C"} 0%, ${theme.palette.primary.main} 100%)`;

  return (
    <Box sx={{ pb: 4 }}>
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: "hidden",
          color: "white",
          background: heroGradient,
          boxShadow: theme.shadows[4],
        }}
      >
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" alignItems="center" gap={2}>
            <IconButton
              onClick={() => navigate("/pharmacy")}
              sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
              aria-label="Back to Pharmacy"
            >
              <ArrowBackIcon />
            </IconButton>
            <LocalPharmacyIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Add medication
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          p: 3,
          borderRadius: 2,
          bgcolor: "background.paper",
          boxShadow: theme.shadows[2],
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LinkIcon fontSize="small" />
            Link from catalogue (optional) — or leave empty to create without linking
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="add-med-category-label">Category</InputLabel>
            <Select
              labelId="add-med-category-label"
              label="Category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={categoriesLoading}
            >
              <MenuItem value="">None</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedCategoryId && (
            <>
              <FormControl fullWidth size="small">
                <InputLabel id="add-med-formulation-label">Dosage form</InputLabel>
                <Select
                  labelId="add-med-formulation-label"
                  label="Dosage form"
                  value={selectedDoseForm}
                  onChange={(e) => {
                    setSelectedDoseForm(e.target.value);
                    setSelectedDrugFormulationId("");
                    setCatalogueLink({ drug_id: null, drug_formulation_id: null });
                  }}
                  disabled={drugsLoading}
                >
                  <MenuItem value="">Select…</MenuItem>
                  {formulationTypes.map((doseForm) => (
                    <MenuItem key={doseForm} value={doseForm}>{doseForm}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedDoseForm && (
                <FormControl fullWidth size="small">
                  <InputLabel id="add-med-drug-label">Drug</InputLabel>
                  <Select
                    labelId="add-med-drug-label"
                    label="Drug"
                    value={selectedDrugFormulationId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedDrugFormulationId(id);
                      const option = drugFormulationOptions.find((o) => `${o.drug_id}:${o.formulation_id}` === id);
                      applyCatalogueSelection(option || null);
                    }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {drugFormulationOptions.map((o) => (
                      <MenuItem key={`${o.drug_id}-${o.formulation_id}`} value={`${o.drug_id}:${o.formulation_id}`}>
                        {o.drug_name}{o.strength_size ? ` · ${o.strength_size}` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {(catalogueLink.drug_id || selectedDrugFormulationId) && (
                <Button
                  type="button"
                  size="small"
                  startIcon={<LinkOffIcon />}
                  onClick={() => {
                    setSelectedDrugFormulationId("");
                    setCatalogueLink({ drug_id: null, drug_formulation_id: null });
                  }}
                >
                  Clear catalogue selection
                </Button>
              )}
            </>
          )}

          <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
            Medication details (edit if pre-filled from catalogue)
          </Typography>
          <TextField
            label="Name"
            fullWidth
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <TextField
            label="Dosage form"
            fullWidth
            value={form.dosage_form}
            onChange={(e) => update("dosage_form", e.target.value)}
          />
          <TextField
            label="Unit price"
            fullWidth
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            value={form.unit_price}
            onChange={(e) => update("unit_price", e.target.value)}
          />
          <TextField
            label="Manufacturer"
            fullWidth
            value={form.manufacturer}
            onChange={(e) => update("manufacturer", e.target.value)}
          />
          <TextField
            label="Unit (e.g. tablet, bottle)"
            fullWidth
            placeholder="e.g. tablet, bottle"
            value={form.unit}
            onChange={(e) => update("unit", e.target.value)}
          />
          <TextField
            label="Pack size"
            fullWidth
            type="number"
            inputProps={{ min: 0 }}
            value={form.pack_size}
            onChange={(e) => update("pack_size", e.target.value)}
            helperText="Units per pack (e.g. 20 tablets per box)"
          />
          <TextField
            label="Packs in stock"
            fullWidth
            type="number"
            inputProps={{ min: 0 }}
            value={form.packs_in_stock}
            onChange={(e) => update("packs_in_stock", e.target.value)}
            helperText="Optional: with Pack size, calculates Init qty automatically (Packs × Pack size)"
          />
          <TextField
            label="Init qty (pharmacy stock)"
            fullWidth
            type="number"
            inputProps={{ min: 0 }}
            value={form.initial_quantity}
            onChange={(e) => update("initial_quantity", e.target.value)}
            helperText={form.pack_size && form.packs_in_stock ? "Auto-calculated from Packs in stock × Pack size (you can override)" : "Total quantity in pharmacy, or leave empty"}
          />
          <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => navigate("/pharmacy")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !form.name.trim()}
            >
              {submitting ? "Saving…" : "Add medication"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
