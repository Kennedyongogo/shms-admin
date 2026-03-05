import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  useTheme,
  IconButton,
} from "@mui/material";
import {
  PlayCircleOutline as PlayIcon,
  ArrowBack as ArrowBackIcon,
  VideoLibrary as VideoLibraryIcon,
} from "@mui/icons-material";

const demoConfigs = [
  {
    id: "silver",
    title: "Silver Package Demo",
    subtitle: "Clinic / Outpatient workflow",
    description:
      "Placeholder for a guided walkthrough of Carlvyne SHMS in a lean outpatient / clinic setup – appointments, consultations, and pharmacy in one smooth flow.",
  },
  {
    id: "gold",
    title: "Gold Package Demo",
    subtitle: "Full hospital workflow",
    description:
      "Placeholder for a deep-dive demo of the full hospital experience – wards, inventory, billing, and advanced reporting powered by Carlvyne SHMS.",
  },
];

export default function LiveDemoPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const primary = theme.palette.primary.main;
  const gradientBackground = {
    backgroundImage: `radial-gradient(circle at 0% 0%, rgba(0, 137, 123, 0.18), transparent 55%),
      radial-gradient(circle at 100% 100%, rgba(15, 184, 176, 0.12), transparent 55%)`,
    backgroundColor: theme.palette.background.default,
  };

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
          Watch Live Demo (Coming Soon)
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
          Two demo slots – one for each package. We&apos;ll plug in the real videos and API later.
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
          {demoConfigs.map((demo) => (
            <Card
              key={demo.id}
              sx={{
                flex: 1,
                minWidth: 0,
                borderRadius: 0,
                display: "flex",
                flexDirection: "column",
                border: "none",
                boxShadow: 0,
                bgcolor: "background.default",
                mb: "1px",
              }}
            >
              {/* Top placeholder "video" frame */}
              <Box
                sx={{
                  position: "relative",
                  flex: 1,
                  minHeight: 180,
                  maxHeight: 240,
                  borderRadius: { xs: 0, md: 0 },
                  borderBottomLeftRadius: 32,
                  borderBottomRightRadius: 32,
                  boxShadow: "0 20px 35px rgba(0,0,0,0.35)",
                  overflow: "hidden",
                  bgcolor: theme.palette.grey[900],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 0 0, rgba(255,255,255,0.08), transparent 55%)",
                  }}
                />
                <Stack
                  spacing={1}
                  alignItems="center"
                  sx={{ position: "relative", zIndex: 1 }}
                >
                  <IconButton
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.6)",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                    }}
                    disabled
                  >
                    <PlayIcon sx={{ fontSize: 42, color: primary }} />
                  </IconButton>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    Video placeholder &mdash; coming soon
                  </Typography>
                </Stack>
              </Box>

              {/* Bottom content */}
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
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 0.5 }}
                  >
                    <VideoLibraryIcon
                      fontSize="small"
                      sx={{ color: primary, opacity: 0.9 }}
                    />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {demo.title}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5 }}
                  >
                    {demo.subtitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {demo.description}
                  </Typography>
                </Box>

                <Box>
                  <Button
                    variant="outlined"
                    disabled
                    startIcon={<PlayIcon />}
                    sx={{
                      borderRadius: 999,
                      fontWeight: 700,
                      textTransform: "none",
                      px: 2.5,
                      py: 0.75,
                      opacity: 0.7,
                    }}
                  >
                    Watch demo (coming soon)
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

