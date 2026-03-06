import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
} from "@mui/material";
import GuestNavbar from "./GuestNavbar";
import Footer from "./Footer";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";

const primary = "#0fb8b0";
const backgroundLight = "#f6f8f8";

const gradientMeshSx = {
  backgroundColor: backgroundLight,
  backgroundImage: `
    radial-gradient(at 0% 0%, rgba(15, 184, 176, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.1) 0px, transparent 50%)
  `,
};

export default function TermsOfServicePage() {
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
        {/* Hero — same as AboutPage */}
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
                  Legal
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
                Terms of{" "}
                <Box component="span" sx={{ color: primary }}>
                  Service
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
                Please read these terms carefully before using Carlvyne Smart
                Hospital Management System. By accessing or using our services,
                you agree to be bound by these terms.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Content section — same paper/style as AboutPage capabilities */}
        <Box
          component="section"
          sx={{
            py: 5,
            bgcolor: "background.paper",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              width: "100%",
              boxSizing: "border-box",
              px: { xs: 2, sm: 3, lg: 4 },
            }}
          >
            <Typography
              component="h2"
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mb: 2,
              }}
            >
              1. Acceptance of Terms
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              By accessing or using the Carlvyne Smart Hospital Management
              System (“Service”), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the
              Service.
            </Typography>

            <Typography
              component="h2"
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mb: 2,
              }}
            >
              2. Use of the Service
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              You agree to use the Service only for lawful purposes and in
              accordance with these terms. You must not use the Service in any
              way that could damage, disable, or impair the Service or interfere
              with any other party’s use of the Service.
            </Typography>

            <Typography
              component="h2"
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mb: 2,
              }}
            >
              3. Privacy and Data
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              Your use of the Service is also governed by our Privacy Policy.
              You consent to the collection, use, and disclosure of information
              as described in that policy. Healthcare data is handled in
              accordance with applicable laws and our security practices.
            </Typography>

            <Typography
              component="h2"
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mb: 2,
              }}
            >
              4. Modifications
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              We may modify these Terms of Service from time to time. We will
              notify you of material changes by posting the updated terms on
              this page and updating the “Last updated” date. Your continued use
              of the Service after such changes constitutes acceptance of the
              updated terms.
            </Typography>

            <Typography
              component="h2"
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mb: 2,
              }}
            >
              5. Contact
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7 }}
            >
              For questions about these Terms of Service, please contact us
              using the contact details provided on our website or within the
              Service.
            </Typography>
          </Box>
        </Box>

        {/* Bottom section — same style as AboutPage final statement */}
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
              maxWidth: 960,
              mx: "auto",
              px: 3,
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Typography
              component="p"
              sx={{
                fontSize: { xs: "1rem", lg: "1.125rem" },
                color: "text.secondary",
                lineHeight: 1.6,
              }}
            >
              Thank you for using Carlvyne Smart Hospital Management System.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/")}
              endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
              sx={{
                mt: 3,
                mb: "5px",
                px: 4,
                py: 1.5,
                bgcolor: primary,
                color: "white",
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": {
                  bgcolor: "rgba(15, 184, 176, 0.9)",
                },
              }}
            >
              Get Started
            </Button>
          </Box>
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
