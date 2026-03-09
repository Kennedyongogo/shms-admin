import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
} from "@mui/material";
import GuestNavbar from "./GuestNavbar";
import Footer from "./Footer";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  MoneyOff as MoneyOffIcon,
  Cancel as CancelIcon,
  AssignmentReturn as AssignmentReturnIcon,
  Schedule as ScheduleIcon,
  ContactSupport as ContactSupportIcon,
  Policy as PolicyIcon,
  Help as HelpIcon,
} from "@mui/icons-material";

const primary = "#0fb8b0";
const secondary = "#1E3A8A";
const backgroundLight = "#f6f8f8";

const gradientMeshSx = {
  backgroundColor: backgroundLight,
  backgroundImage: `
    radial-gradient(at 0% 0%, rgba(15, 184, 176, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.1) 0px, transparent 50%)
  `,
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

const policyCards = [
  {
    icon: MoneyOffIcon,
    title: "Subscription Refunds",
    description:
      "Request a refund within the period specified in your plan. Refunds are processed to the original payment method.",
  },
  {
    icon: CancelIcon,
    title: "Cancellation",
    description:
      "Cancel at any time via account settings or by contacting us. Access continues until the end of the paid period.",
  },
  {
    icon: AssignmentReturnIcon,
    title: "Refund Requests",
    description:
      "Submit refund requests in writing. Approved refunds are processed within a reasonable timeframe.",
  },
  {
    icon: ScheduleIcon,
    title: "Billing Period",
    description:
      "Cancellation takes effect at the end of the current billing period. No further charges after cancellation.",
  },
  {
    icon: ContactSupportIcon,
    title: "Contact Us",
    description:
      "For refund or cancellation requests, use the contact details on our website or within the Service.",
  },
  {
    icon: PolicyIcon,
    title: "Policy Updates",
    description:
      "We may update this policy from time to time. Continued use after changes constitutes acceptance.",
  },
  {
    icon: HelpIcon,
    title: "Questions",
    description:
      "For questions about refunds or cancellation, please reach out using the details provided.",
  },
  {
    icon: MoneyOffIcon,
    title: "Eligibility",
    description:
      "Refund eligibility depends on your plan and the timing of your request. See your agreement for details.",
  },
];

export default function RefundCancellationPage() {
  const navigate = useNavigate();
  const [showNavbar, setShowNavbar] = useState(true);
  const scrollContainerRef = useRef(null);
  const heroSectionRef = useRef(null);

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    const heroEl = heroSectionRef.current;
    if (!scrollEl || !heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowNavbar(entry.isIntersecting);
      },
      {
        root: scrollEl,
        threshold: 0.6,
      }
    );

    observer.observe(heroEl);

    return () => observer.disconnect();
  }, []);

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
        ref={scrollContainerRef}
      >
        {showNavbar && <GuestNavbar />}
        {/* Section 1: Hero — same structure as AboutPage */}
        <Box
          component="section"
          ref={heroSectionRef}
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
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/privacy")}
                sx={{
                  color: "text.secondary",
                  mb: 1,
                  alignSelf: "flex-start",
                  "&:hover": { bgcolor: "action.hover", color: primary },
                }}
              >
                Back to Privacy Policy
              </Button>

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
                  Policy
                </Typography>
              </Box>

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
                Refund &{" "}
                <Box component="span" sx={{ color: primary }}>
                  Cancellation
                </Box>
              </Typography>

              <Typography
                sx={{
                  fontSize: "1.25rem",
                  color: "text.secondary",
                  lineHeight: 1.7,
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                Our refund and cancellation policy for Carlvyne Smart Hospital
                Management System. Cancel anytime or request a refund within
                the terms of your plan.
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
                  onClick={() => navigate("/privacy")}
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
                  Privacy Policy
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Section 2: Policy at a Glance — same layout as AboutPage Key Capabilities (2 rows of 4 flip cards) */}
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
                Refund & Cancellation Policy
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
                Key points about refunds, cancellation, and billing for
                Carlvyne SHMS subscriptions.
              </Typography>
            </Box>
          </Box>

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
            {policyCards.slice(0, 4).map(({ icon: Icon, title, description }) => (
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
            {policyCards.slice(4, 8).map(({ icon: Icon, title, description }) => (
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

        {/* Section 3: Final Statement — same as AboutPage */}
        <Box
          component="section"
          sx={{
            pt: 12,
            pb: 0,
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
              "We aim to make refunds and cancellations{" "}
              <Box component="span" sx={{ fontWeight: 700, fontStyle: "normal" }}>
                straightforward and fair
              </Box>
              . If you have questions about your subscription or need support,{" "}
              <Box
                component="span"
                sx={{ color: primary, fontWeight: 700, fontStyle: "normal" }}
              >
                we're here to help
              </Box>
              ."
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
                onClick={() => navigate("/")}
                sx={{
                  px: 4,
                  py: 2,
                  bgcolor: primary,
                  color: "white",
                  fontSize: { xs: "0.8rem", sm: "1.125rem" },
                  fontWeight: 700,
                  borderRadius: 2,
                  boxShadow: "0 20px 25px -5px rgba(15, 184, 176, 0.3)",
                  mb: "7px",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    bgcolor: "rgba(15, 184, 176, 0.9)",
                  },
                }}
              >
                Get Started
              </Button>
            </Box>
          </Box>
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
