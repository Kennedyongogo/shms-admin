import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Tooltip,
  Typography,
  Stack,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Person,
  Email,
  Lock,
  Business,
  Place,
  Phone,
  Image as ImageIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  EmojiEvents as EmojiEventsIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { completeSubscriptionPaymentReturn } from "../utils/subscriptionPaymentReturn";
import GuestNavbar from "./GuestNavbar";

const primaryTeal = "#00897B";
const primaryTealDark = "#00695C";

const SILVER_LIGHT = "#E8E8E8";
const SILVER_MAIN = "#C0C0C0";
const SILVER_DARK = "#9E9E9E";
const SILVER_BORDER = "#A8A8A8";

const GOLD_LIGHT = "#FFF8E7";
const GOLD_MAIN = "#FFD700";
const GOLD_DARK = "#DAA520";
const GOLD_BORDER = "#B8860B";

/** Labels must match Navbar (adminItems[].text) and AdminUsersManagement MENU_KEY_LABELS. Order matches backend SILVER_PACKAGE_KEYS. */
const SILVER_MENU_ITEMS = [
  "Dashboard",
  "Hospital",
  "Patients",
  "Appointments",
  "Laboratory",
  "Pharmacy",
  "Billing & Payments",
  "Users & Roles",
  "Audit log",
  "Settings",
];
/** Labels must match Navbar and backend ALL_MENU_KEYS order. */
const GOLD_MENU_ITEMS = [
  "Dashboard",
  "Hospital",
  "Appointments",
  "Patients",
  "Laboratory",
  "Pharmacy",
  "Ward & Admissions",
  "Diet & Meals",
  "Inventory",
  "Billing & Payments",
  "Users & Roles",
  "Audit log",
  "Settings",
];

const SILVER_DESCRIPTION =
  "Essential clinic management: patient records, appointments, lab, pharmacy, and billing. Manage your facility profile, users, and roles. Best for small clinics, GP practices, and single-location outpatient centers.";
const GOLD_DESCRIPTION =
  "Complete hospital system: everything in Silver plus ward admissions, diet & meals, inventory, and audit log. Full traceability and multi-department support. Best for hospitals, multi-ward facilities, and organizations that need in-patient and inventory management.";

const REG_DRAFT_KEY = "shms_reg_draft";
/** ~3MB cap — sessionStorage limit varies by browser */
const MAX_LOGO_DATA_URL_CHARS = 3 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read logo file"));
    r.readAsDataURL(file);
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} ref - Paystack transaction reference
 * @param {object} fields - flat fields including package, hospital_*, full_name, email, phone, password, confirm_password
 * @param {File | null} logoFile
 */
async function postRegisterOrganization(ref, fields, logoFile) {
  const pkg = fields.package;
  const payRef = ref && String(ref).trim() ? String(ref).trim() : null;
  if (logoFile) {
    const fd = new FormData();
    fd.append("hospital_name", String(fields.hospital_name || "").trim());
    fd.append("hospital_address", String(fields.hospital_address || "").trim());
    fd.append("hospital_phone", String(fields.hospital_phone || "").trim());
    fd.append("hospital_email", String(fields.hospital_email || "").trim());
    fd.append("full_name", String(fields.full_name || "").trim());
    fd.append("email", String(fields.email || "").trim().toLowerCase());
    fd.append("phone", String(fields.phone || "").trim());
    fd.append("password", fields.password);
    fd.append("confirm_password", fields.confirm_password);
    fd.append("package", pkg);
    if (payRef) fd.append("paystack_reference", payRef);
    fd.append("hospital_logo", logoFile);
    return fetch("/api/auth/register-organization", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: fd,
    });
  }
  const body = {
    hospital: {
      name: String(fields.hospital_name || "").trim(),
      address: fields.hospital_address?.trim() || undefined,
      phone: fields.hospital_phone?.trim() || undefined,
      email: fields.hospital_email?.trim() || undefined,
    },
    full_name: String(fields.full_name || "").trim(),
    email: String(fields.email || "").trim().toLowerCase(),
    phone: fields.phone?.trim() || undefined,
    password: fields.password,
    confirm_password: fields.confirm_password,
    package: pkg,
  };
  if (payRef) body.paystack_reference = payRef;
  return fetch("/api/auth/register-organization", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

function isSubscriptionRenewalReturnFromPaystack() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("reference") || params.get("trxref");
  return Boolean(ref?.trim() && sessionStorage.getItem("shms_subscription_pay_pending"));
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [subscriptionReturnBusy, setSubscriptionReturnBusy] = useState(isSubscriptionRenewalReturnFromPaystack);
  const [step, setStep] = useState(0);
  const [packageSelected, setPackageSelected] = useState(null);
  const [paystackReference, setPaystackReference] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completingRegistration, setCompletingRegistration] = useState(false);
  const [form, setForm] = useState({
    hospital_name: "",
    hospital_address: "",
    hospital_phone: "",
    hospital_email: "",
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [hospitalLogoFile, setHospitalLogoFile] = useState(null);
  const [hospitalLogoPreview, setHospitalLogoPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const scrollContainerRef = useRef(null);
  const registerHeaderRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (!ref) return;

    /** Super Admin paying after trial — same Paystack callback URL may land on /register */
    if (sessionStorage.getItem("shms_subscription_pay_pending")) {
      const procKeySub = `shms_sub_pay_proc_${ref}`;
      if (sessionStorage.getItem(procKeySub)) return;
      sessionStorage.setItem(procKeySub, "1");
      (async () => {
        try {
          const result = await completeSubscriptionPaymentReturn(ref);
          window.history.replaceState({}, "", "/register");
          sessionStorage.removeItem(procKeySub);
          if (result.noPending) {
            setSubscriptionReturnBusy(false);
            return;
          }
          if (result.ok) {
            await Swal.fire({
              icon: "success",
              title: "Payment recorded",
              text: "Your subscription is active. Sign in from the home page.",
              confirmButtonColor: primaryTeal,
            });
            navigate("/", { replace: true });
          } else {
            setSubscriptionReturnBusy(false);
            await Swal.fire({
              icon: "error",
              title: "Could not confirm payment",
              text: result.message || "Try again or contact support.",
              confirmButtonColor: primaryTeal,
            });
          }
        } catch (err) {
          sessionStorage.removeItem(procKeySub);
          window.history.replaceState({}, "", "/register");
          setSubscriptionReturnBusy(false);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err?.message || "Something went wrong.",
            confirmButtonColor: primaryTeal,
          });
        }
      })();
      return;
    }

    const procKey = `shms_reg_processing_${ref}`;
    if (sessionStorage.getItem(procKey)) return;
    sessionStorage.setItem(procKey, "1");

    const draftRaw = sessionStorage.getItem(REG_DRAFT_KEY);
    if (!draftRaw) {
      sessionStorage.removeItem(procKey);
      window.history.replaceState({}, "", "/register");
      Swal.fire({
        icon: "warning",
        title: "Session expired",
        text: "We could not find your registration details. Fill the form again, then register.",
        confirmButtonColor: primaryTeal,
      });
      return;
    }

    let draft;
    try {
      draft = JSON.parse(draftRaw);
    } catch {
      sessionStorage.removeItem(procKey);
      window.history.replaceState({}, "", "/register");
      Swal.fire({
        icon: "error",
        title: "Invalid session",
        text: "Please start registration again.",
        confirmButtonColor: primaryTeal,
      });
      return;
    }
    window.history.replaceState({}, "", "/register");
    sessionStorage.setItem("shms_reg_paystack_ref", ref);
    setPaystackReference(ref);
    setPackageSelected(draft.package || "silver");
    setStep(1);

    (async () => {
      setCompletingRegistration(true);
      try {
        let logoFile = null;
        if (draft.hospital_logo_data_url) {
          const imgRes = await fetch(draft.hospital_logo_data_url);
          const blob = await imgRes.blob();
          logoFile = new File([blob], draft.hospital_logo_name || "logo.png", { type: blob.type || "image/jpeg" });
        }
        const response = await postRegisterOrganization(ref, draft, logoFile);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Registration failed");
        }
        if (!data.success || !data.data) {
          throw new Error(data.message || "Registration failed");
        }
        sessionStorage.removeItem(REG_DRAFT_KEY);
        sessionStorage.removeItem("shms_reg_paystack_ref");
        sessionStorage.removeItem(procKey);
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("role", JSON.stringify(data.data.role ?? null));
        localStorage.setItem("menuItems", JSON.stringify(data.data.menuItems ?? []));
        if (data.data.hospital) {
          localStorage.setItem("hospital", JSON.stringify(data.data.hospital));
        }
        const inv = data.data.registration_invoice;
        const trialMsg =
          inv?.status === "unpaid"
            ? "You are signed in as Super Admin. Use your trial; when it ends, sign in again to pay with Paystack and restore access."
            : "You are signed in as Super Admin. You can now create users and roles for your hospital.";
        Swal.fire({
          icon: "success",
          title: "Registration complete",
          text: trialMsg,
          confirmButtonColor: primaryTeal,
        });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        sessionStorage.removeItem(procKey);
        Swal.fire({
          icon: "error",
          title: "Registration failed",
          text: err?.message || "Something went wrong.",
          confirmButtonColor: primaryTeal,
        });
      } finally {
        setCompletingRegistration(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (step !== 1) {
      setShowNavbar(true);
      return;
    }
    const scrollEl = scrollContainerRef.current;
    const headerEl = registerHeaderRef.current;
    if (!scrollEl || !headerEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowNavbar(entry.isIntersecting),
      { root: scrollEl, threshold: 0.5 }
    );
    observer.observe(headerEl);
    return () => observer.disconnect();
  }, [step]);

  useEffect(() => {
    if (!hospitalLogoFile) {
      setHospitalLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(hospitalLogoFile);
    setHospitalLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [hospitalLogoFile]);

  const handlePackageChange = (pkg) => {
    setPackageSelected((prev) => (prev === pkg ? null : pkg));
  };

  const handleProceed = () => {
    if (!packageSelected) {
      Swal.fire({
        icon: "warning",
        title: "Select a package",
        text: "Tick one package (Silver or Gold) to continue.",
        confirmButtonColor: primaryTeal,
      });
      return;
    }
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      Swal.fire({
        icon: "warning",
        title: "Passwords do not match",
        confirmButtonColor: primaryTeal,
      });
      return;
    }
    if (form.password.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "Password must be at least 6 characters",
        confirmButtonColor: primaryTeal,
      });
      return;
    }
    if (!form.hospital_name?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Hospital name is required",
        confirmButtonColor: primaryTeal,
      });
      return;
    }
    if (!form.full_name?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Full name is required",
        confirmButtonColor: primaryTeal,
      });
      return;
    }
    const loginEmail = form.email.trim().toLowerCase();
    if (!loginEmail || !EMAIL_RE.test(loginEmail)) {
      Swal.fire({
        icon: "warning",
        title: "Super Admin email",
        text: "Enter a valid email — you will use it to sign in.",
        confirmButtonColor: primaryTeal,
      });
      return;
    }

    const ref =
      paystackReference ||
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("shms_reg_paystack_ref") : null);

    setLoading(true);
    try {
      const fields = {
        package: packageSelected,
        hospital_name: form.hospital_name.trim(),
        hospital_address: form.hospital_address?.trim() || "",
        hospital_phone: form.hospital_phone?.trim() || "",
        hospital_email: form.hospital_email?.trim() || "",
        full_name: form.full_name.trim(),
        email: loginEmail,
        phone: form.phone?.trim() || "",
        password: form.password,
        confirm_password: form.confirm_password,
      };
      const response = await postRegisterOrganization(ref || null, fields, hospitalLogoFile);
      const data = await response.json();
      if (!response.ok) {
        Swal.fire({
          icon: "error",
          title: "Registration failed",
          text: data.message || "Something went wrong.",
          confirmButtonColor: primaryTeal,
        });
        return;
      }
      if (data.success && data.data) {
        sessionStorage.removeItem(REG_DRAFT_KEY);
        sessionStorage.removeItem("shms_reg_paystack_ref");
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("role", JSON.stringify(data.data.role ?? null));
        localStorage.setItem("menuItems", JSON.stringify(data.data.menuItems ?? []));
        if (data.data.hospital) {
          localStorage.setItem("hospital", JSON.stringify(data.data.hospital));
        }
        const inv = data.data.registration_invoice;
        const trialMsg =
          inv?.status === "unpaid"
            ? "You are signed in as Super Admin. Use your trial; when it ends, sign in again to pay with Paystack and restore access."
            : "You are signed in as Super Admin. You can now create users and roles for your hospital.";
        Swal.fire({
          icon: "success",
          title: "Registration complete",
          text: trialMsg,
          confirmButtonColor: primaryTeal,
        });
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Something went wrong.",
        confirmButtonColor: primaryTeal,
      });
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      transition: "box-shadow 0.2s, border-color 0.2s",
      "&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline": { borderColor: primaryTeal },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: primaryTeal },
    "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: primaryTeal, borderWidth: 2 },
    "& .MuiFormHelperText-root": { color: "text.secondary" },
  };

  const steps = ["Choose package", "Register"];

  if (subscriptionReturnBusy) {
    return (
      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fafafa",
          px: 2,
          boxSizing: "border-box",
        }}
      >
        <CircularProgress sx={{ color: primaryTeal, mb: 2 }} size={48} />
        <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", textAlign: "center" }}>
          Confirming your payment…
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center", maxWidth: 380 }}>
          Please wait while we verify your subscription with Paystack. You will be redirected to sign in shortly.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        boxSizing: "border-box",
        bgcolor: "#fafafa",
        p: "1px",
      }}
    >
        <Box
          ref={scrollContainerRef}
          sx={{
            flexGrow: 1,
            minHeight: 0,
            // Step 0: no scroll; Step 1: allow scroll only on small screens. On laptops/desktops, keep a fixed canvas with tight padding.
            overflowY: step === 0 ? "hidden" : { xs: "auto", md: "hidden" },
            overflowX: "hidden",
            display: step === 0 ? "flex" : "block",
            flexDirection: step === 0 ? "column" : undefined,
          }}
        >
        {(step === 0 || showNavbar) && <GuestNavbar />}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            ...(step === 0
              ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
              : {}
            ),
            boxSizing: "border-box",
            mt: "1px",
            px: { xs: 2, sm: 3, md: 3 },
            ...(step === 0
              ? { py: { xs: 1.5, sm: 2 }, pt: "1px" }
              : { pt: { xs: 1, md: 0.5 }, pb: { xs: 2, md: 1.5 } }
            ),
            ...(step === 1 ? { display: "block" } : {}),
          }}
        >
        <Stepper
          activeStep={step}
          sx={{
            pt: step === 0 ? 1 : 0.5,
            pb: step === 0 ? 2 : 1,
            px: 0,
            "& .MuiStepIcon-root.Mui-active": { color: primaryTeal },
            "& .MuiStepIcon-root.Mui-completed": { color: primaryTeal },
            "& .MuiStepLabel-label.Mui-active": { fontWeight: 700, color: "text.primary" },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: "text.primary", flexShrink: 0, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
              Choose your package
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, flexShrink: 0, maxWidth: 560 }}>
              Select a package (Silver KES 10, Gold KES 20 in test mode). On the next step you will enter hospital and Super Admin details and register. Subscription payment is completed later, after the trial, when you sign in again as Super Admin.
            </Typography>
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: { xs: 1.5, sm: 2 },
                mb: 2,
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  flex: 1,
                  minHeight: 0,
                  border: "3px solid",
                  borderColor: packageSelected === "silver" ? SILVER_BORDER : SILVER_MAIN,
                  borderRadius: 3,
                  position: "relative",
                  background: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
                  cursor: "pointer",
                  boxShadow: packageSelected === "silver" ? `0 8px 24px ${SILVER_DARK}40` : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
                  "&:hover": {
                    borderColor: SILVER_BORDER,
                    background: "linear-gradient(135deg, #dbe3ea 0%, #7b8fb1 100%)",
                    boxShadow: `0 8px 24px ${SILVER_DARK}50`,
                  },
                  display: "flex",
                  flexDirection: "column",
                }}
                onClick={() => handlePackageChange("silver")}
              >
                <CardContent
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    py: { xs: 0.75, sm: 1 },
                    px: { xs: 1, sm: 2 },
                    overflow: "hidden",
                    "&:last-child": { pb: { xs: 1, sm: 1.25 } },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      opacity: 0.22,
                      pointerEvents: "none",
                      fontSize: 92,
                      lineHeight: 1,
                    }}
                  >
                    <EmojiEventsIcon sx={{ fontSize: 92 }} />
                  </Box>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 0.4, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={packageSelected === "silver"}
                      onChange={() => handlePackageChange("silver")}
                      sx={{
                        color: "rgba(255,255,255,0.92)",
                        "&.Mui-checked": { color: "#ffffff" },
                        padding: { xs: 0.5, sm: 0.75 },
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                        color: "#ffffff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                      }}
                    >
                      Silver — KES 10
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "#000000",
                      lineHeight: { xs: 1.25, sm: 1.35 },
                      mb: { xs: 0.25, sm: 0.35 },
                      pl: { xs: 2.5, sm: 4.5 },
                      pr: { xs: 0.5, sm: 0 },
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      flexShrink: 0,
                    }}
                  >
                    {SILVER_DESCRIPTION}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.95)",
                      mb: 0.25,
                      pl: { xs: 2.5, sm: 4.5 },
                      fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      flexShrink: 0,
                    }}
                  >
                    Menu items ({SILVER_MENU_ITEMS.length}):
                  </Typography>
                  <Box
                    sx={{
                      display: { xs: "block", sm: "none" },
                      pl: { xs: 2.5, sm: 4.5 },
                      pr: { xs: 1, sm: 0 },
                      flex: 1,
                      minHeight: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip
                      title={
                        <Stack component="span" spacing={0.25} sx={{ py: 0.5 }}>
                          {SILVER_MENU_ITEMS.map((item) => (
                            <Typography key={item} component="span" variant="body2" display="block" sx={{ fontSize: "0.8rem" }}>
                              • {item}
                            </Typography>
                          ))}
                        </Stack>
                      }
                      placement="top"
                      arrow
                      disableTouchListener={false}
                      slotProps={{
                        popper: { sx: { "& .MuiTooltip-tooltip": { maxWidth: 260 } } },
                      }}
                    >
                      <Chip
                        size="small"
                        label={`View all ${SILVER_MENU_ITEMS.length} menu items`}
                        sx={{
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          bgcolor: "rgba(255,255,255,0.22)",
                          borderColor: "rgba(255,255,255,0.45)",
                          color: "rgba(255,255,255,0.95)",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.30)",
                            borderColor: "#ffffff",
                          },
                        }}
                        variant="outlined"
                      />
                    </Tooltip>
                  </Box>
                  <Box
                    sx={{
                      display: { xs: "none", sm: "flex" },
                      flexWrap: "wrap",
                      gap: 0.5,
                      pl: { xs: 2.5, sm: 4.5 },
                      pr: 0.5,
                      flex: 1,
                      minHeight: 0,
                      alignContent: "flex-start",
                    }}
                  >
                    {SILVER_MENU_ITEMS.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        size="small"
                        sx={{
                          height: "auto",
                          py: 0.25,
                          fontSize: { xs: "0.6rem", sm: "0.65rem" },
                          fontWeight: 600,
                          bgcolor: "rgba(255,255,255,0.22)",
                          borderColor: "rgba(255,255,255,0.45)",
                          color: "rgba(255,255,255,0.95)",
                        }}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
              <Card
                variant="outlined"
                sx={{
                  flex: 1,
                  minHeight: 0,
                  border: "3px solid",
                  borderColor: packageSelected === "gold" ? GOLD_BORDER : GOLD_DARK,
                  borderRadius: 3,
                  position: "relative",
                  background: "linear-gradient(135deg, #fbbf24 0%, #b45309 100%)",
                  cursor: "pointer",
                  boxShadow: packageSelected === "gold" ? `0 8px 24px ${GOLD_DARK}60` : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
                  "&:hover": {
                    borderColor: GOLD_BORDER,
                    background: "linear-gradient(135deg, #f59e0b 0%, #a13a06 100%)",
                    boxShadow: `0 8px 24px ${GOLD_DARK}70`,
                  },
                  display: "flex",
                  flexDirection: "column",
                }}
                onClick={() => handlePackageChange("gold")}
              >
                <CardContent
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    py: { xs: 1, sm: 1.25 },
                    px: { xs: 1, sm: 2 },
                    overflow: "hidden",
                    "&:last-child": { pb: { xs: 1, sm: 1.25 } },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      opacity: 0.22,
                      pointerEvents: "none",
                      fontSize: 92,
                      lineHeight: 1,
                    }}
                  >
                    <StarIcon sx={{ fontSize: 92 }} />
                  </Box>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 0.4, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={packageSelected === "gold"}
                      onChange={() => handlePackageChange("gold")}
                      sx={{
                        color: "rgba(255,255,255,0.92)",
                        "&.Mui-checked": { color: "#ffffff" },
                        padding: { xs: 0.5, sm: 0.75 },
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                        color: "#ffffff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                      }}
                    >
                      Gold — KES 20
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "#000000",
                      lineHeight: { xs: 1.25, sm: 1.35 },
                      mb: { xs: 0.35, sm: 0.5 },
                      pl: { xs: 2.5, sm: 4.5 },
                      pr: { xs: 0.5, sm: 0 },
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      flexShrink: 0,
                    }}
                  >
                    {GOLD_DESCRIPTION}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.95)",
                      mb: 0.25,
                      pl: { xs: 2.5, sm: 4.5 },
                      fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      flexShrink: 0,
                    }}
                  >
                    Menu items ({GOLD_MENU_ITEMS.length}):
                  </Typography>
                  <Box
                    sx={{
                      display: { xs: "block", sm: "none" },
                      pl: { xs: 2.5, sm: 4.5 },
                      pr: { xs: 1, sm: 0 },
                      flex: 1,
                      minHeight: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip
                      title={
                        <Stack component="span" spacing={0.25} sx={{ py: 0.5 }}>
                          {GOLD_MENU_ITEMS.map((item) => (
                            <Typography key={item} component="span" variant="body2" display="block" sx={{ fontSize: "0.8rem" }}>
                              • {item}
                            </Typography>
                          ))}
                        </Stack>
                      }
                      placement="top"
                      arrow
                      disableTouchListener={false}
                      slotProps={{
                        popper: { sx: { "& .MuiTooltip-tooltip": { maxWidth: 260 } } },
                      }}
                    >
                      <Chip
                        size="small"
                        label={`View all ${GOLD_MENU_ITEMS.length} menu items`}
                        sx={{
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          bgcolor: "rgba(255,255,255,0.22)",
                          borderColor: "rgba(255,255,255,0.45)",
                          color: "rgba(255,255,255,0.95)",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.30)",
                            borderColor: "#ffffff",
                          },
                        }}
                        variant="outlined"
                      />
                    </Tooltip>
                  </Box>
                  <Box
                    sx={{
                      display: { xs: "none", sm: "flex" },
                      flexWrap: "wrap",
                      gap: 0.5,
                      pl: { xs: 2.5, sm: 4.5 },
                      pr: 0.5,
                      flex: 1,
                      minHeight: 0,
                      alignContent: "flex-start",
                    }}
                  >
                    {GOLD_MENU_ITEMS.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        size="small"
                        sx={{
                          height: "auto",
                          py: 0.25,
                          fontSize: { xs: "0.6rem", sm: "0.65rem" },
                          fontWeight: 600,
                          bgcolor: "rgba(255,255,255,0.22)",
                          borderColor: "rgba(255,255,255,0.45)",
                          color: "rgba(255,255,255,0.95)",
                        }}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
            <Button
              variant="contained"
              onClick={handleProceed}
              disabled={!packageSelected}
              endIcon={<ArrowForwardIcon />}
              sx={{
                flexShrink: 0,
                py: 1.25,
                px: 4,
                bgcolor: primaryTeal,
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(0,137,123,0.35)",
                "&:hover": { bgcolor: primaryTealDark, boxShadow: "0 4px 12px rgba(0,137,123,0.4)" },
                "&:disabled": { bgcolor: "action.disabledBackground", boxShadow: "none" },
              }}
            >
              Proceed to register
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <Box ref={registerHeaderRef} sx={{ mb: { xs: 1.25, md: 0.75 } }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setStep(0);
                  setPaystackReference(null);
                  sessionStorage.removeItem("shms_reg_paystack_ref");
                  sessionStorage.removeItem(REG_DRAFT_KEY);
                }}
                sx={{
                  color: "text.secondary",
                  mb: 1,
                  "&:hover": { bgcolor: "action.hover", color: primaryTeal },
                }}
              >
                Back to package
              </Button>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25, color: "text.primary" }}>
                Register your {packageSelected === "silver" ? "clinic" : "hospital"}
              </Typography>
            </Box>
            <form onSubmit={handleSubmit} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  // On small screens, keep the form within the viewport and allow it to scroll.
                  // On larger screens, fit within the available height with no scroll and tighter padding.
                  maxHeight: { xs: "calc(100vh - 220px)", md: "100%" },
                  overflowY: { xs: "auto", md: "hidden" },
                  pr: { xs: 1, md: 0 },
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: { xs: 2.25, md: 1.5 },
                    alignItems: "stretch",
                    minHeight: 0,
                    mb: { xs: 2.5, md: 3 },
                  }}
                >
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    px: { xs: 1.75, md: 1.5 },
                    pt: { xs: 1.75, md: 1.25 },
                    pb: { xs: 1.1, sm: 1.5 },
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", mb: 1.5 }}>
                    Hospital / Clinic
                  </Typography>
                  <Stack spacing={{ xs: 1.25, sm: 1.75 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<ImageIcon />}
                        size="small"
                        sx={{
                          borderColor: primaryTeal,
                          color: primaryTeal,
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 600,
                          "&:hover": { borderColor: primaryTealDark, bgcolor: "rgba(0,105,92,0.06)" },
                        }}
                      >
                        {hospitalLogoFile ? "Change logo" : "Add logo (optional)"}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => setHospitalLogoFile(e.target.files?.[0] ?? null)}
                        />
                      </Button>
                      {hospitalLogoPreview && (
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "2px solid",
                            borderColor: "divider",
                            flexShrink: 0,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        >
                          <img
                            src={hospitalLogoPreview}
                            alt="Hospital logo preview"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </Box>
                      )}
                    </Box>
                    <TextField
                      label="Hospital name"
                      required
                      fullWidth
                      size="small"
                      value={form.hospital_name}
                      onChange={(e) => setForm((p) => ({ ...p, hospital_name: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <TextField
                      label="Address"
                      fullWidth
                      size="small"
                      value={form.hospital_address}
                      onChange={(e) => setForm((p) => ({ ...p, hospital_address: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Place sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <TextField
                      label="Hospital phone"
                      fullWidth
                      size="small"
                      value={form.hospital_phone}
                      onChange={(e) => setForm((p) => ({ ...p, hospital_phone: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <TextField
                      label="Hospital email"
                      type="email"
                      fullWidth
                      size="small"
                      value={form.hospital_email}
                      onChange={(e) => setForm((p) => ({ ...p, hospital_email: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ ...inputSx, mb: { xs: 1, sm: 0 } }}
                    />
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: { xs: 1.75, md: 1.5 },
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", mb: 1.5 }}>
                    Super Admin account
                  </Typography>
                  <Stack spacing={{ xs: 1.25, sm: 1.75 }}>
                    <TextField
                      label="Full name"
                      required
                      fullWidth
                      size="small"
                      value={form.full_name}
                      onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <TextField
                      type="email"
                      label="Email (login)"
                      required
                      fullWidth
                      size="small"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Used to sign in"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <TextField
                      label="Phone"
                      fullWidth
                      size="small"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <TextField
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      required
                      fullWidth
                      size="small"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      error={form.password.length > 0 && form.password.length < 6}
                      helperText={form.password.length > 0 && form.password.length < 6 ? "Min 6 characters" : ""}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              onClick={() => setShowPassword((p) => !p)}
                              edge="end"
                              size="small"
                              sx={{ color: primaryTeal }}
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <TextField
                      type={showConfirmPassword ? "text" : "password"}
                      label="Confirm password"
                      required
                      fullWidth
                      size="small"
                      value={form.confirm_password}
                      onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
                      error={form.confirm_password.length > 0 && form.password !== form.confirm_password}
                      helperText={
                        form.confirm_password.length > 0 && form.password !== form.confirm_password
                          ? "Passwords do not match"
                          : ""
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: primaryTeal, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                              onClick={() => setShowConfirmPassword((p) => !p)}
                              edge="end"
                              size="small"
                              sx={{ color: primaryTeal }}
                            >
                              {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={
                        loading || completingRegistration || form.password.length < 6 || form.password !== form.confirm_password
                      }
                      sx={{
                        py: 1.1,
                        mt: 0.4,
                        bgcolor: primaryTeal,
                        fontWeight: 700,
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(0,137,123,0.35)",
                        "&:hover": { bgcolor: primaryTealDark, boxShadow: "0 4px 12px rgba(0,137,123,0.4)" },
                        "&:disabled": { boxShadow: "none" },
                      }}
                    >
                      {completingRegistration ? "Completing registration…" : loading ? "Creating account…" : "Register"}
                    </Button>
                  </Stack>
                </Paper>
                </Box>
              </Box>
            </form>
          </>
        )}
        </Box>
      </Box>
      {completingRegistration && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            bgcolor: "rgba(255,255,255,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 700, color: "text.primary" }}>
            Finishing your registration…
          </Typography>
        </Box>
      )}
    </Box>
  );
}
