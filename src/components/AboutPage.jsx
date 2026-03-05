import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import GuestNavbar from "./GuestNavbar";
import {
  ArrowForward as ArrowForwardIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarMonthIcon,
  Biotech as BiotechIcon,
  Medication as MedicationIcon,
  Description as DescriptionIcon,
  ReceiptLong as ReceiptLongIcon,
  Inventory2 as Inventory2Icon,
  Videocam as VideocamIcon,
} from "@mui/icons-material";

const primary = "#0fb8b0";
const secondary = "#1E3A8A";
const backgroundLight = "#f6f8f8";
const backgroundDark = "#102221";

const gradientMeshSx = {
  backgroundColor: backgroundLight,
  backgroundImage: `
    radial-gradient(at 0% 0%, rgba(15, 184, 176, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.1) 0px, transparent 50%)
  `,
};

const glassCardSx = {
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(15, 184, 176, 0.1)",
};

const flipCardOuterSx = {
  minHeight: 220,
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "action.hover",
  perspective: "1000px",
  "&:hover": {
    borderColor: "rgba(15, 184, 176, 0.3)",
    boxShadow: "0 20px 25px -5px rgba(15, 184, 176, 0.08)",
  },
  "&:hover .flip-card-inner": {
    transform: "rotateY(180deg)",
  },
};

const flipCardInnerSx = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: 220,
  transition: "transform 0.6s ease",
  transformStyle: "preserve-3d",
};

const flipFaceSx = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 2,
  backfaceVisibility: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  p: 2,
};

const flipCardFrontSx = {
  ...flipFaceSx,
  bgcolor: "action.hover",
  borderTop: "4px solid",
  borderTopColor: primary,
};

const flipCardBackSx = {
  ...flipFaceSx,
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  transform: "rotateY(180deg)",
};

const capabilityIconSx = {
  width: 56,
  height: 56,
  borderRadius: 1,
  bgcolor: "background.paper",
  boxShadow: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: primary,
  mb: 2,
};

const capabilityCards = [
  {
    icon: BadgeIcon,
    title: "Patient Management",
    description:
      "Full lifecycle patient data tracking, secure records, and encrypted history management.",
  },
  {
    icon: CalendarMonthIcon,
    title: "Smart Scheduling",
    description:
      "AI-driven appointment booking, staff rotation, and automated resource allocation.",
  },
  {
    icon: BiotechIcon,
    title: "Integrated Lab",
    description:
      "Seamless laboratory information systems integration with real-time result reporting.",
  },
  {
    icon: MedicationIcon,
    title: "Pharmacy Management",
    description:
      "Real-time stock management, automatic refills, and prescription tracking.",
  },
  {
    icon: DescriptionIcon,
    title: "Electronic Records",
    description:
      "Consolidated health records accessible by authorized personnel anywhere, anytime.",
  },
  {
    icon: ReceiptLongIcon,
    title: "Billing & Invoicing",
    description:
      "Automated financial workflows, insurance claims processing, and revenue analytics.",
  },
  {
    icon: Inventory2Icon,
    title: "Inventory Tracking",
    description:
      "Advanced monitoring for medical supplies, surgical equipment, and facility assets.",
  },
  {
    icon: VideocamIcon,
    title: "Telemedicine Hub",
    description:
      "Secure high-definition remote consultations and post-op patient monitoring.",
  },
];

export default function AboutPage() {
  const navigate = useNavigate();

  // Prevent viewport scroll so only the inner scroll container scrolls.
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  return (
    <Box
      component="main"
      sx={{
        fontFamily: "'Manrope', sans-serif",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        p: "1px",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <GuestNavbar />
        {/* Section 1: Hero — full-width, no cards */}
      <Box
        component="section"
        sx={{
          position: "relative",
          minHeight: "34vh",
          display: "flex",
          alignItems: "flex-start",
          overflow: "hidden",
          ...gradientMeshSx,
        }}
      >
        <Box
          sx={{
            width: "100%",
            px: { xs: 2, sm: 3, lg: 4 },
            pt: 1,
            pb: 4,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: "9999px",
                bgcolor: "rgba(15, 184, 176, 0.1)",
                border: "1px solid rgba(15, 184, 176, 0.2)",
                width: "fit-content",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: primary,
                  animation: "pulse 2s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: primary,
                }}
              >
                Next-Gen Healthcare SaaS
              </Typography>
            </Box>

            {/* Title in one row */}
            <Typography
              component="h1"
              variant="h3"
              sx={{
                fontSize: { xs: "1.75rem", lg: "2.5rem" },
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "text.primary",
                mt: -1.5,
              }}
            >
              Carlvyne Smart Hospital{" "}
              <Box component="span" sx={{ color: primary }}>
                Management System
              </Box>
            </Typography>

            {/* Full-width content below */}
            <Typography
              sx={{
                fontSize: "1.25rem",
                color: "text.secondary",
                lineHeight: 1.7,
                width: "100%",
                maxWidth: "100%",
              }}
            >
              Our digital integration platform prioritizes patient care
              through seamless hospital management. We empower medical
              institutions with smart, integrated solutions for modern
              healthcare operations, ensuring every touchpoint is
              data-driven and patient-centric.
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => navigate("/")}
                endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                sx={{
                  px: 3,
                  py: 1.5,
                  bgcolor: primary,
                  color: "white",
                  fontWeight: 700,
                  borderRadius: 2,
                  boxShadow: `0 10px 15px -3px rgba(15, 184, 176, 0.2)`,
                  "&:hover": {
                    bgcolor: "rgba(15, 184, 176, 0.9)",
                  },
                }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate("/about/demo")}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderColor: "divider",
                  color: "text.primary",
                  fontWeight: 700,
                  borderRadius: 2,
                  "&:hover": {
                    borderColor: primary,
                    bgcolor: "rgba(15, 184, 176, 0.04)",
                  },
                }}
              >
                View Demo
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Section 2: Key Capabilities - 4 cards per row, 2 rows */}
      <Box
        component="section"
        sx={{
          py: 5,
          bgcolor: "background.paper",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ width: "100%", px: { xs: 2, sm: 3 }, mb: 4 }}>
          <Box sx={{ textAlign: "center", mb: 0 }}>
            <Typography
              component="h2"
              variant="h4"
              sx={{
                fontSize: { xs: "2rem", lg: "3rem" },
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "text.primary",
                mb: 1,
              }}
            >
              Key Capabilities
            </Typography>
            <Box
              sx={{
                width: 96,
                height: 6,
                bgcolor: primary,
                borderRadius: 1,
                mx: "auto",
                mb: 2,
              }}
            />
            <Typography
              sx={{
                color: "text.secondary",
                maxWidth: 672,
                mx: "auto",
                fontSize: "1.125rem",
              }}
            >
              CSHMS provides a comprehensive suite of tools designed to
              streamline every department within your medical facility.
            </Typography>
          </Box>
        </Box>

        {/* Single row: first 4 cards — flip on hover to show description */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 3,
            width: "100%",
            boxSizing: "border-box",
            px: { xs: 2, sm: 3 },
            "& > *": { minWidth: 0 },
            "@media (max-width: 900px)": {
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            },
            "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
          }}
        >
          {capabilityCards
            .slice(0, 4)
            .map(({ icon: Icon, title, description }) => (
              <Box key={title} sx={flipCardOuterSx}>
                <Box className="flip-card-inner" sx={flipCardInnerSx}>
                  <Box sx={flipCardFrontSx}>
                    <Box className="capability-icon" sx={capabilityIconSx}>
                      <Icon sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, textAlign: "center" }}
                    >
                      {title}
                    </Typography>
                  </Box>
                  <Box sx={flipCardBackSx}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center", lineHeight: 1.6 }}
                    >
                      {description}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
        </Box>

        {/* Second row: cards 5–8 — same gap as between cards (24px) above */}
        <Box
          style={{ marginTop: "24px" }}
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 3,
            width: "100%",
            boxSizing: "border-box",
            px: { xs: 2, sm: 3 },
            "& > *": { minWidth: 0 },
            "@media (max-width: 900px)": {
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            },
            "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
          }}
        >
          {capabilityCards
            .slice(4, 8)
            .map(({ icon: Icon, title, description }) => (
              <Box key={title} sx={flipCardOuterSx}>
                <Box className="flip-card-inner" sx={flipCardInnerSx}>
                  <Box sx={flipCardFrontSx}>
                    <Box className="capability-icon" sx={capabilityIconSx}>
                      <Icon sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, textAlign: "center" }}
                    >
                      {title}
                    </Typography>
                  </Box>
                  <Box sx={flipCardBackSx}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center", lineHeight: 1.6 }}
                    >
                      {description}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
        </Box>
      </Box>

      {/* Section 3: Final Statement */}
      <Box
        component="section"
        sx={{
          py: 12,
          bgcolor: "rgba(15, 184, 176, 0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 256,
            height: 256,
            borderRadius: "50%",
            bgcolor: "rgba(15, 184, 176, 0.1)",
            transform: "translate(-50%, -50%)",
            filter: "blur(48px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 384,
            height: 384,
            borderRadius: "50%",
            bgcolor: "rgba(30, 58, 138, 0.05)",
            transform: "translate(33%, 33%)",
            filter: "blur(48px)",
          }}
        />

        <Box
          sx={{
            maxWidth: 960,
            mx: "auto",
            px: 3,
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontSize: { xs: "1.125rem", lg: "1.5rem" },
              fontWeight: 200,
              fontStyle: "italic",
              lineHeight: 1.4,
              color: "text.primary",
              mb: 4,
            }}
          >
            "Carlvyne Smart Hospital Management System{" "}
            <Box component="span" sx={{ fontWeight: 700, fontStyle: "normal" }}>
              empowers healthcare facilities
            </Box>{" "}
            to run smarter operations, revolutionize staff productivity, and
            ultimately deliver{" "}
            <Box
              component="span"
              sx={{ color: primary, fontWeight: 700, fontStyle: "normal" }}
            >
              superior patient outcomes
            </Box>{" "}
            through premium SaaS technology."
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 4,
                bgcolor: primary,
                borderRadius: 1,
              }}
            />
            <Button
              variant="contained"
              onClick={() => navigate("/about/founders")}
              sx={{
                px: 4,
                py: 2,
                bgcolor: primary,
                color: "white",
                fontSize: "1.125rem",
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: "0 20px 25px -5px rgba(15, 184, 176, 0.3)",
                mb: 1,
                "&:hover": {
                  bgcolor: "rgba(15, 184, 176, 0.9)",
                },
              }}
            >
              Meet the Carlvyne SHMS Founders
            </Button>
          </Box>
        </Box>
      </Box>
      </Box>
    </Box>
  );
}
