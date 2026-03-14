import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  LocalPharmacy as LocalPharmacyIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";

const getToken = () => localStorage.getItem("token");

async function fetchJson(url, { method = "GET", token } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
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

const FORMULATION_ICONS = {
  Tablet: "💊",
  Injection: "💉",
  "Oral liquid": "🧪",
  Syrup: "🧪",
  Capsule: "💊",
  PFI: "📦",
  Suppository: "💊",
  Inhalation: "🌬️",
};

function getFormulationIcon(doseForm) {
  for (const [key, icon] of Object.entries(FORMULATION_ICONS)) {
    if (doseForm && String(doseForm).toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "📋";
}

export default function CategoryFormulationsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const token = getToken();
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark || "#00695C"} 0%, ${theme.palette.primary.main} 100%)`;

  const formulationTypes = useMemo(() => {
    const set = new Set();
    drugs.forEach((d) => {
      const forms = d.formulations;
      if (Array.isArray(forms)) forms.forEach((f) => f.dose_form && set.add(f.dose_form));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [drugs]);

  // Grid columns: 1 card = full row, 2 = 2 cols, 3 = 3 cols, 4+ = max 4 per row
  const gridColumns =
    formulationTypes.length === 1
      ? "1fr"
      : formulationTypes.length === 2
        ? "repeat(2, 1fr)"
        : formulationTypes.length === 3
          ? "repeat(3, 1fr)"
          : "repeat(4, 1fr)";

  const drugsByFormulation = useMemo(() => {
    const map = new Map();
    drugs.forEach((drug) => {
      const forms = drug.formulations;
      if (!Array.isArray(forms)) return;
      forms.forEach((f) => {
        if (!f.dose_form) return;
        const key = f.dose_form;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ drug, formulation: f });
      });
    });
    return map;
  }, [drugs]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token || !categoryId) return;
      setLoading(true);
      setError(null);
      try {
        const [catRes, listRes] = await Promise.all([
          fetchJson(`/api/drug-categories/${categoryId}?minimal=1`, { token }),
          fetchJson(`/api/drug-categories?limit=500&minimal=1`, { token }),
        ]);
        const cat = catRes?.data;
        const list = listRes?.data ?? [];
        if (!cancelled) {
          setCategory(cat || null);
          setAllCategories(list);
        }
        if (!cat) return;
        const ids = getDescendantIds(list, categoryId);
        const qs = new URLSearchParams({ limit: "500", drug_category_id: ids.join(",") });
        const drugsRes = await fetchJson(`/api/drugs?${qs.toString()}`, { token });
        if (!cancelled) setDrugs(drugsRes?.data ?? []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token, categoryId]);

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
              onClick={() => navigate("/pharmacy/medicine-catalogue")}
              sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
              aria-label="Back to catalogue"
            >
              <ArrowBackIcon />
            </IconButton>
            <LocalPharmacyIcon sx={{ fontSize: { xs: 24, md: 28 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.25rem" },
                }}
              >
                {category?.name ?? "Category"}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Box>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            {error}
          </Typography>
        )}
        {!loading && !error && formulationTypes.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
            No formulations in this category.
          </Typography>
        )}
        {!loading && !error && formulationTypes.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: gridColumns,
                md: gridColumns,
                lg: gridColumns,
              },
              gap: 2,
            }}
          >
            {formulationTypes.map((doseForm) => {
              const count = (drugsByFormulation.get(doseForm) ?? []).length;
              return (
                <Card
                  key={doseForm}
                  elevation={0}
                  sx={{
                    minWidth: 0,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: theme.shadows[4],
                      borderColor: "primary.main",
                      "& .card-view-icon": { color: "primary.main", opacity: 1 },
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() =>
                      navigate(`/pharmacy/medicine-catalogue/category/${categoryId}/formulation?dose_form=${encodeURIComponent(doseForm)}`)
                    }
                    sx={{ height: "100%", display: "block", textAlign: "left" }}
                    aria-label={`View ${doseForm} medicines`}
                  >
                    <CardContent sx={{ py: 2.5, px: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, minHeight: 48 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: "1.75rem" }}>{getFormulationIcon(doseForm)}</Typography>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {doseForm}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {count} medicine{count !== 1 ? "s" : ""}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flexShrink: 0, width: 28, display: "flex", justifyContent: "flex-end" }}>
                          <VisibilityIcon
                            className="card-view-icon"
                            sx={{ color: "text.secondary", opacity: 0.6, transition: "all 0.2s", fontSize: 22 }}
                            aria-hidden
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
