import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  LocalPharmacy as LocalPharmacyIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
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

export default function MedicineCataloguePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = getToken();
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const contentRef = useRef(null);

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark || "#00695C"} 0%, ${theme.palette.primary.main} 100%)`;

  // Load all categories once; filter happens on the client as user types
  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchJson(`/api/drug-categories?limit=500&minimal=1`, { token })
      .then((res) => {
        if (!cancelled) setAllCategories(res?.data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load categories");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  // Filter in memory: show categories partly related to what the user types (name or code)
  const q = (searchInput || "").trim().toLowerCase();
  const filteredCategories = q
    ? allCategories.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q))
      )
    : allCategories;

  // Scroll to search/cards only when user types or clears search (not on initial open)
  useEffect(() => {
    if (searchInput === "") return;
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchInput]);

  return (
    <Box sx={{ pb: 4 }}>
      {/* Hero */}
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
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
              <IconButton
                onClick={() => navigate("/pharmacy")}
                sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
                aria-label="Back to Pharmacy"
              >
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                <LocalPharmacyIcon sx={{ fontSize: { xs: 28, md: 32 }, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      whiteSpace: "nowrap",
                      fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                    }}
                  >
                    Medicine Catalogue
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Browse by category
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Box ref={contentRef} sx={{ px: 0 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search categories by name or code…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "background.paper",
                boxShadow: theme.shadows[1],
                "&:hover": { bgcolor: "action.hover" },
                "&.Mui-focused": { bgcolor: "background.paper" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            inputProps={{ "aria-label": "Search categories" }}
          />
          {!loading && allCategories.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, px: 0.5 }}>
              {q ? `${filteredCategories.length} of ${allCategories.length} categories` : `${allCategories.length} categories`}
            </Typography>
          )}
        </Box>
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
        {!loading && !error && filteredCategories.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
            {allCategories.length === 0 ? "No categories found." : "No categories match your search."}
          </Typography>
        )}
        {!loading && !error && filteredCategories.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
                lg: "repeat(5, 1fr)",
              },
              gap: 2,
            }}
          >
            {filteredCategories.map((cat) => (
              <Card
                key={cat.id}
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  transition: "all 0.2s ease",
                  minWidth: 0,
                  "&:hover": {
                    boxShadow: theme.shadows[4],
                    borderColor: "primary.main",
                    "& .card-view-icon": { color: "primary.main", opacity: 1 },
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/pharmacy/medicine-catalogue/category/${cat.id}`)}
                  sx={{ height: "100%", display: "block", textAlign: "left" }}
                  aria-label={`View ${cat.name}`}
                >
                  <CardContent sx={{ py: 2.5, px: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, minHeight: 48 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.35, minWidth: 0, flex: 1 }} component="span">
                        {cat.name}
                      </Typography>
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
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
