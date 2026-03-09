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
        fontFamily: "'Inter', sans-serif",
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
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              By accessing or using the Carlvyne Smart Hospital Management System (the
              &quot;Service&quot;), including the admin portal, APIs, and operational modules
              (patients, appointments, laboratory, pharmacy, billing, wards, inventory,
              diet, users &amp; roles, audit logs), you agree to be bound by these Terms
              of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not
              use the Service. If you are accepting these Terms on behalf of a hospital,
              clinic, or other organization, you represent that you have authority to
              bind that organization, and &quot;you&quot; refers to that organization.
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
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              The Service is intended to support lawful hospital and clinic operations.
              You agree to use it only for legitimate healthcare and administrative
              purposes and in accordance with these Terms and applicable laws. You are
              responsible for keeping account credentials (particularly Super Admin and
              staff logins) secure, assigning appropriate roles and permissions to your
              users, and ensuring that data entered into the system is accurate and that
              you have a lawful basis to process it. You must not attempt to interfere
              with or disrupt the Service, reverse‑engineer it, bypass security
              controls, or use it in a way that infringes the rights or privacy of
              others.
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
              3. Accounts, Roles, and Access
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              The initial Super Admin account can configure hospitals or clinics, manage
              users and roles, and access sensitive configuration and billing
              information. You are responsible for protecting this account and for
              promptly revoking access for users who should no longer have it. The
              Service provides role‑based access (for example, admin, doctor, nurse,
              lab, pharmacy, billing) and audit logs of key actions to support
              traceability and accountability. You are responsible for any activity
              occurring under your accounts and for configuring roles in a way that
              aligns with your internal policies and legal obligations.
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
              4. Subscriptions, Billing, and Refunds
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              Access to certain features or environments may be provided on a
              subscription or plan basis. Pricing, billing cycles, and specific
              inclusions are described separately (for example, during registration or
              in your commercial agreement). Payments may be processed by third‑party
              providers (such as M‑Pesa or other gateways), and their terms also apply
              to the payment process. Our approach to cancellations and refunds is
              described in the Refund &amp; Cancellation policy within the Service; any
              refunds, where available, are handled in line with that policy and your
              agreed commercial terms.
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
              5. Privacy and Data Protection
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              Your use of the Service is also governed by our Privacy Policy, which
              explains how we collect, use, and protect personal and health information.
              By using the Service, you consent to the data practices described there.
              We implement technical and organizational measures (such as role‑based
              access and audit logging) to help protect data, but you remain responsible
              for configuring user access, securing the devices and networks used to
              access the Service, and ensuring that you have a lawful basis to process
              patient and staff data.
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
              6. Third‑Party Services
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              The Service may rely on or integrate with third‑party services such as
              hosting providers, payment processors, email/SMS gateways, and
              monitoring/logging tools. We aim to work only with reputable providers
              under appropriate contractual protections, but those providers&apos; terms
              and privacy policies also apply to their handling of data. We are not
              responsible for issues caused solely by those third‑party services, but we
              will make reasonable efforts to support you if an integration impacts the
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
              7. Service Availability and Changes
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We strive to keep the Service reliable and available, but we do not
              guarantee uninterrupted or error‑free operation. We may update, enhance,
              or modify the Service from time to time (for example, new features, UI
              improvements, or security updates) and may temporarily suspend or limit
              access for maintenance, security, or legal reasons. We will seek to
              minimize unnecessary disruption.
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
              8. Intellectual Property
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              The Service, including its underlying software, user interface, design,
              and content we provide, is owned by us or our licensors. We grant you a
              limited, non‑exclusive, non‑transferable license to use the Service for
              your internal hospital or clinic operations in accordance with these
              Terms. You may not copy, resell, or commercially exploit the Service
              beyond what is expressly permitted in your agreement with us.
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
              9. Disclaimers and Limitation of Liability
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              The Service is provided &quot;as is&quot; and &quot;as available&quot;. To the maximum
              extent permitted by law, we disclaim all warranties, whether express,
              implied, or statutory, including any implied warranties of
              merchantability, fitness for a particular purpose, and non‑infringement.
              The Service is a support tool and does not replace clinical judgment or
              professional obligations; you and your clinical staff remain fully
              responsible for medical decisions and patient care. To the extent
              permitted by law, our total aggregate liability arising out of or related
              to your use of the Service is limited to the fees you have paid for the
              Service in the twelve (12) months preceding the event giving rise to the
              claim.
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
              10. Termination
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We may suspend or terminate your access to the Service if you materially
              breach these Terms, fail to pay amounts due (where applicable), misuse
              the Service, or if continued service would create a legal or security
              risk. You may stop using the Service at any time; specific termination,
              data‑export, and post‑termination provisions may be described in your
              commercial agreement or in our Refund &amp; Cancellation policy.
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
              11. Governing Law and Disputes
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              These Terms are governed by the laws of Kenya, without regard to
              conflict‑of‑law principles. Any disputes arising out of or relating to
              the Service will be subject to the exclusive jurisdiction of the courts
              of Nairobi, Kenya, unless otherwise required by applicable law.
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
              12. Contact
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              For questions about these Terms of Service, please contact us using the
              contact details provided on our website or within the Service.
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
