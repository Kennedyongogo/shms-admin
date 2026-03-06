import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import GuestNavbar from "./GuestNavbar";
import Footer from "./Footer";

const primary = "#0fb8b0";
const backgroundLight = "#f6f8f8";

const gradientMeshSx = {
  backgroundColor: backgroundLight,
  backgroundImage: `
    radial-gradient(at 0% 0%, rgba(15, 184, 176, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.1) 0px, transparent 50%)
  `,
};

export default function PrivacyPolicyPage() {
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
        {/* Hero — same as TermsOfServicePage */}
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
                Privacy{" "}
                <Box component="span" sx={{ color: primary }}>
                  Policy
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
                We respect your privacy. This policy describes how Carlvyne Smart
                Hospital Management System collects, uses, and protects your
                information when you use our services.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Content section — edge to edge like TermsOfServicePage */}
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
              1. Information We Collect
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              We collect information you provide when registering, using the
              Service, or contacting us. This may include name, email, organization
              details, and healthcare-related data necessary to operate the
              platform. We also collect technical data such as IP address and
              usage information to improve our services and security.
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
              2. How We Use Your Information
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              We use your information to provide, maintain, and improve the
              Service; to process transactions; to communicate with you; and to
              comply with legal and regulatory obligations. Healthcare data is
              used only as necessary to deliver hospital management and
              patient-care features in accordance with applicable law.
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
              3. Data Security
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              We implement appropriate technical and organizational measures to
              protect your personal and health data against unauthorized access,
              alteration, disclosure, or destruction. Access to sensitive data is
              restricted and audited in line with industry standards and
              applicable regulations.
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
              4. Sharing and Disclosure
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              We do not sell your personal information. We may share data with
              service providers who assist in operating the Service, subject to
              confidentiality and data protection agreements. We may also
              disclose information where required by law or to protect our
              rights, users, or the public.
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
              5. Your Rights
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}
            >
              Depending on applicable law, you may have the right to access,
              correct, or delete your personal data, object to or restrict
              processing, and request data portability. To exercise these rights
              or ask questions about our practices, contact us using the details
              below.
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
              6. Contact
            </Typography>
            <Typography
              sx={{ color: "text.secondary", lineHeight: 1.7 }}
            >
              For questions about this Privacy Policy or our data practices,
              please contact us using the contact details provided on our
              website or within the Service.
            </Typography>
          </Box>
        </Box>

        {/* Bottom section — same style as TermsOfServicePage */}
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
              variant="outlined"
              onClick={() => navigate("/refund-cancellation")}
              sx={{
                mt: 3,
                mb: "5px",
                px: 4,
                py: 1.5,
                borderColor: primary,
                color: primary,
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": {
                  borderColor: "rgba(15, 184, 176, 0.85)",
                  bgcolor: "rgba(15, 184, 176, 0.08)",
                },
              }}
            >
              view refund/cancellation
            </Button>
          </Box>
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
