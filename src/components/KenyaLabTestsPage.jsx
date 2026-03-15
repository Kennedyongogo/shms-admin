import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TablePagination,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Science as ScienceIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

const API_KENYA_LAB_TESTS = "/api/kenya-lab-tests";
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

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

export default function KenyaLabTestsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = getToken();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      const data = await fetchJson(`${API_KENYA_LAB_TESTS}?${qs.toString()}`, { token });
      setRows(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, rowsPerPage, search]);

  useEffect(() => {
    load();
  }, [load]);

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
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
              <IconButton
                onClick={() => navigate("/laboratory")}
                sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
                aria-label="Back to Laboratory"
              >
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                <ScienceIcon sx={{ fontSize: { xs: 28, md: 32 }, flexShrink: 0 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Kenya Lab Tests
                  </Typography>
                  <Typography sx={{ opacity: 0.9, fontSize: "0.9rem" }}>
                    Reference catalogue of laboratory tests (Kenya).
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, code, description, or category…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
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
              inputProps={{ "aria-label": "Search Kenya lab tests" }}
            />
          </Box>

          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Loading…
              </Typography>
            </Stack>
          ) : rows.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No Kenya lab tests found.
            </Typography>
          ) : (
            <>
              <Stack spacing={1} sx={{ mb: 1 }}>
                {rows.map((row) => (
                  <Accordion
                    key={row.id}
                    variant="outlined"
                    sx={{
                      "&:before": { display: "none" },
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        "& .MuiAccordionSummary-content": {
                          display: "grid",
                          gridTemplateColumns: { xs: "80px 1fr 120px", sm: "100px 1fr 160px" },
                          gap: { xs: 1, sm: 2 },
                          alignItems: "center",
                          minWidth: 0,
                        },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                        {fmt(row.code)}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                        {fmt(row.test_name)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {fmt(row.category)}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ bgcolor: "grey.50", borderTop: 1, borderColor: "divider" }}>
                      <Typography variant="body2" color="text.secondary">
                        {fmt(row.description)}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Rows:"
                sx={{ borderTop: 1, borderColor: "divider", mt: 1 }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
