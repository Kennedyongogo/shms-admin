import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Stack,
  IconButton,
  CircularProgress,
  useTheme,
  Button,
} from "@mui/material";
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  Language as LanguageIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";

const API = {
  owners: "/api/carlvyne-accounts",
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

const buildImageUrl = (path) => {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  if (String(path).startsWith("uploads/")) return `/${path}`;
  if (String(path).startsWith("/uploads/")) return path;
  return path;
};

export default function CarlvyneOwners() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchJson(`${API.owners}?page=1&limit=2&is_active=true`);
        const rows = Array.isArray(res?.data) ? res.data : [];
        setOwners(rows.slice(0, 2));
      } catch (e) {
        setError(e.message || "Unable to load Carlvyne owners.");
        setOwners([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const primary = theme.palette.primary.main;
  const gradientBackground = {
    backgroundImage: `radial-gradient(circle at 0% 0%, rgba(0, 137, 123, 0.18), transparent 55%),
      radial-gradient(circle at 100% 100%, rgba(15, 184, 176, 0.12), transparent 55%)`,
    backgroundColor: theme.palette.background.default,
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...gradientBackground,
          overflowY: { xs: "auto", md: "hidden" },
          overflowX: "hidden",
        }}
      >
        <CircularProgress sx={{ color: primary }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        ...gradientBackground,
        p: "1px",
        overflowY: { xs: "auto", md: "hidden" },
        overflowX: "hidden",
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, sm: 3 },
          pt: 2,
          pb: 1.5,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/about")}
          sx={{
            mb: 1,
            fontWeight: 700,
            color: theme.palette.primary.main,
            "&:hover": {
              bgcolor: "rgba(0,0,0,0.02)",
            },
          }}
        >
          Back to About Us
        </Button>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            letterSpacing: 0.2,
            color: theme.palette.text.primary,
          }}
        >
          Carlvyne SHMS Founders
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          px: 0,
          pb: 1,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{
            width: "100%",
            maxWidth: "none",
            alignItems: "stretch",
            justifyContent: "center",
          }}
        >
          {owners.map((owner) => {
            const avatarUrl = buildImageUrl(owner.profile_picture_path);
            const accent = owner.primary_color || primary;
            return (
              <Card
                key={owner.id}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 0,
                  display: "flex",
                  flexDirection: "column",
                  border: "none",
                  boxShadow: 0,
                  overflow: "hidden",
                  bgcolor: "background.default",
                  mb: "1px",
                }}
              >
                {/* Top image occupying half card height */}
                <Box
                  sx={{
                    position: "relative",
                    flex: 1,
                    minHeight: 180,
                    maxHeight: 240,
                    backgroundImage: avatarUrl ? `url(${avatarUrl})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: { xs: 0, md: 0 },
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    boxShadow: "0 20px 35px rgba(0,0,0,0.35)",
                    overflow: "hidden",
                    bgcolor: avatarUrl ? "transparent" : "grey.900",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background: avatarUrl
                        ? "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.65))"
                        : "radial-gradient(circle at 0 0, rgba(255,255,255,0.1), transparent 55%)",
                    }}
                  />
                  {!avatarUrl && (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Avatar
                        alt={owner.name}
                        sx={{
                          width: 96,
                          height: 96,
                          bgcolor: theme.palette.primary.main,
                          fontWeight: 900,
                          fontSize: 32,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                        }}
                      >
                        {owner.name?.charAt(0)?.toUpperCase() || "C"}
                      </Avatar>
                    </Box>
                  )}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 16,
                      left: 24,
                      right: 24,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        letterSpacing: 0.4,
                        color: "white",
                        textShadow: "0 3px 10px rgba(0,0,0,0.7)",
                      }}
                    >
                      {owner.name}
                    </Typography>
                  </Box>
                </Box>

                {/* Bottom details */}
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    p: 2.25,
                    pt: 1.5,
                    gap: 1.5,
                  }}
                >
                  <Box>
                    {owner.bio && (
                      <Typography
                        variant="body2"
                        sx={{ mb: 1.5, color: "text.secondary" }}
                      >
                        {owner.bio}
                      </Typography>
                    )}
                    <Stack spacing={0.5}>
                      {owner.email && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EmailIcon fontSize="small" sx={{ color: primary }} />
                          <Typography variant="body2">{owner.email}</Typography>
                        </Stack>
                      )}
                      {owner.phone_number && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PhoneIcon fontSize="small" sx={{ color: primary }} />
                          <Typography variant="body2">{owner.phone_number}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mt: 1.5 }}
                    alignItems="center"
                  >
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!owner.facebook_url) return;
                        window.open(owner.facebook_url, "_blank", "noopener,noreferrer");
                      }}
                      sx={{ "& svg": { color: "#1877F2" } }}
                    >
                      <FacebookIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!owner.twitter_url) return;
                        window.open(owner.twitter_url, "_blank", "noopener,noreferrer");
                      }}
                      sx={{ "& svg": { color: "#1DA1F2" } }}
                    >
                      <TwitterIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!owner.linkedin_url) return;
                        window.open(owner.linkedin_url, "_blank", "noopener,noreferrer");
                      }}
                      sx={{ "& svg": { color: "#0A66C2" } }}
                    >
                      <LinkedInIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!owner.instagram_url) return;
                        window.open(owner.instagram_url, "_blank", "noopener,noreferrer");
                      }}
                      sx={{ "& svg": { color: "#E1306C" } }}
                    >
                      <InstagramIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!owner.website_url) return;
                        window.open(owner.website_url, "_blank", "noopener,noreferrer");
                      }}
                      sx={{ "& svg": { color: primary } }}
                    >
                      <LanguageIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ ml: "auto", "& svg": { color: "#25D366" } }}
                      onClick={() => {
                        if (!owner.phone_number) return;
                        const digits = String(owner.phone_number).replace(/\D/g, "");
                        if (!digits) return;
                        const url = `https://wa.me/${digits}`;
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <WhatsAppIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          {owners.length === 0 && !error && (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">
                No Carlvyne owners configured yet.
              </Typography>
            </Box>
          )}
          {error && (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="error.main">{error}</Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

