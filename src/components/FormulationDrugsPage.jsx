import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  LocalPharmacy as LocalPharmacyIcon,
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

export default function FormulationDrugsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const doseForm = searchParams.get("dose_form") || "";

  const token = getToken();
  const [category, setCategory] = useState(null);
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark || "#00695C"} 0%, ${theme.palette.primary.main} 100%)`;

  const drugsWithFormulation = useMemo(() => {
    return drugs
      .filter((d) => Array.isArray(d.formulations))
      .flatMap((drug) =>
        (drug.formulations || [])
          .filter((f) => f.dose_form === doseForm)
          .map((formulation) => ({ drug, formulation }))
      )
      .sort((a, b) => a.drug.name.localeCompare(b.drug.name));
  }, [drugs, doseForm]);

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
        if (!cancelled) setCategory(cat || null);
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

  const backToFormulations = () =>
    navigate(`/pharmacy/medicine-catalogue/category/${categoryId}`);

  if (!doseForm) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography color="text.secondary" align="center">
          No formulation selected.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <IconButton onClick={backToFormulations} color="primary" size="large">
            <ArrowBackIcon />
          </IconButton>
        </Box>
      </Box>
    );
  }

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
              onClick={backToFormulations}
              sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
              aria-label="Back to formulations"
            >
              <ArrowBackIcon />
            </IconButton>
            <LocalPharmacyIcon sx={{ fontSize: 28 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {doseForm}
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
        {!loading && !error && drugsWithFormulation.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
            No medicines for this formulation in this category.
          </Typography>
        )}
        {!loading && !error && drugsWithFormulation.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <List disablePadding>
              {drugsWithFormulation.map(({ drug, formulation }, idx) => (
                <ListItem
                  key={`${drug.id}-${formulation.id ?? idx}`}
                  divider={idx < drugsWithFormulation.length - 1}
                  sx={{ py: 1.5, px: 2 }}
                >
                  <ListItemText
                    primary={drug.name}
                    secondary={formulation.strength_size || null}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  {formulation.lou != null && (
                    <Chip label={`LOU ${formulation.lou}`} size="small" color="primary" variant="outlined" sx={{ ml: 1 }} />
                  )}
                </ListItem>
              ))}
            </List>
          </Card>
        )}
      </Box>
    </Box>
  );
}
