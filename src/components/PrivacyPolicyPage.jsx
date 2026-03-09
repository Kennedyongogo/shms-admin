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
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We collect information in several categories when you or your organization
              use the Service:
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 2 }}>
              <strong>Account and organization data.</strong> This includes hospital or
              clinic details (name, address, contact information), and user account
              information (such as full name, email, phone number, role, and, where
              provided, profile image).
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 2 }}>
              <strong>Patient and clinical data.</strong> This includes patient
              demographics (for example, name, contact details, date of birth, gender),
              as well as operational and clinical records captured through the modules
              in the system (appointments, visits, consultations, lab and pharmacy
              records, vitals, ward/bed information, diet, inventory usage, and similar
              information you choose to store in the Service).
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 2 }}>
              <strong>Billing and payment data.</strong> We collect subscription and
              billing information related to your use of the Service, and payment
              transaction references or statuses from payment providers (such as
              M‑Pesa or other gateways). We do not store full card details if card
              payments are used; those are handled by the payment provider.
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              <strong>Technical and usage data.</strong> We collect log and audit data
              (for example, who performed which actions and when), as well as device,
              browser, and connection information such as IP address and basic usage
              analytics, to maintain, secure, and improve the Service.
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
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We use the information described above to:
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 2 }}>
              <strong>Provide and operate the Service.</strong> This includes creating
              and managing hospital/clinic accounts, enabling users and roles,
              supporting day‑to‑day operations (such as patient registration, visits,
              lab, pharmacy, and billing), and generating audit logs for traceability.
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 2 }}>
              <strong>Maintain security and compliance.</strong> We use data to monitor
              access, detect potential misuse, prevent fraud and security incidents,
              and comply with legal, regulatory, and professional obligations, including
              those related to health and data protection where applicable.
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 2 }}>
              <strong>Billing and communication.</strong> We use information to manage
              subscriptions, invoices, and payments and to send important notices
              related to the Service, such as security alerts, service changes, and
              updates to these terms or this Policy.
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We do not use patient data for unrelated advertising.
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
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We implement technical and organizational measures to help protect
              personal and health information against unauthorized access, alteration,
              disclosure, or destruction. These measures include role‑based access
              controls in the admin portal, authentication for users, and audit logs of
              key actions. While no system can be guaranteed completely secure, we work
              continuously to maintain and improve our security controls.
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
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We do not sell your personal information. We may share data with:
              service providers that help us operate the Service (such as hosting
              providers, payment processors, email/SMS gateways, and monitoring
              tools), subject to contractual obligations to protect the information and
              use it only for the services they provide to us. We may also disclose
              information where required by law, court order, or governmental request,
              or where necessary to protect our rights, users, or the public, and in
              connection with a merger, acquisition, or similar business transfer,
              subject to appropriate safeguards.
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
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              Depending on applicable law, individuals may have rights such as
              accessing their personal data, requesting corrections, requesting
              deletion or restriction of processing in certain cases, objecting to
              certain types of processing, and requesting data portability. Requests
              relating to patient or staff records stored for your hospital or clinic
              should normally be directed to that hospital or clinic as the primary
              data controller. You can also contact us using the details in the
              Service or on our website and we will coordinate with the relevant
              customer where appropriate.
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
              6. Data Retention and Transfers
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We retain information for as long as reasonably necessary to provide the
              Service to your organization, to comply with legal and regulatory
              obligations, to resolve disputes, and to enforce our agreements.
              Retention periods may differ by data type and jurisdiction. If data are
              stored or accessed from outside your country, we will take steps to help
              ensure that any international transfers are made in accordance with
              applicable data‑protection laws, using appropriate safeguards where
              required.
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
              7. Changes to This Policy
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
              We may update this Privacy Policy from time to time. When we do, we will
              post the updated version in the application and/or on our website and
              update the &quot;Last updated&quot; date where appropriate. Your continued
              use of the Service after the updated Policy becomes effective means you
              accept those changes.
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
              8. Contact
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              For questions about this Privacy Policy or our data practices, please
              contact us using the contact details provided on our website or within
              the Service.
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
