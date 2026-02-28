import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";

const primaryTealDark = "#00695C";

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <Box
      component="main"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        minWidth: "100%",
        minHeight: "100%",
        overflow: "auto",
        boxSizing: "border-box",
        bgcolor: "#fff",
      }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/", { replace: true })}
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          color: primaryTealDark,
          fontWeight: 700,
          "&:hover": { bgcolor: "rgba(0,105,92,0.08)" },
        }}
      >
        Back to home
      </Button>
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          minHeight: "100%",
          boxSizing: "border-box",
          px: 0,
          py: { xs: 7, sm: 8 },
          pt: { xs: 8, sm: 9 },
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: "text.primary", width: "100%" }}>
          About Carlvyne SHMS
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.9, width: "100%", color: "text.primary", margin: 0, mb: 2 }}>
          Carlvyne Smart Hospital Management System (SHMS) is an integrated platform designed to streamline healthcare operations. It brings together patient management, staff scheduling, appointments, laboratory, pharmacy, billing, and inpatient care in one unified system.
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.9, width: "100%", color: "text.primary", margin: 0 }}>
          The system helps healthcare providers deliver smart care with streamlined operations, reducing administrative overhead and improving coordination across departments.
        </Typography>
      </Box>
    </Box>
  );
}
