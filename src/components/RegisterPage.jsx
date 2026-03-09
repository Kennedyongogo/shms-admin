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
} from "@mui/icons-material";
import Swal from "sweetalert2";
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [packageSelected, setPackageSelected] = useState(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      let response;
      if (hospitalLogoFile) {
        const fd = new FormData();
        fd.append("hospital_name", form.hospital_name.trim());
        fd.append("hospital_address", form.hospital_address?.trim() || "");
        fd.append("hospital_phone", form.hospital_phone?.trim() || "");
        fd.append("hospital_email", form.hospital_email?.trim() || "");
        fd.append("full_name", form.full_name.trim());
        fd.append("email", form.email.trim().toLowerCase());
        fd.append("phone", form.phone?.trim() || "");
        fd.append("password", form.password);
        fd.append("confirm_password", form.confirm_password);
        fd.append("package", packageSelected);
        fd.append("hospital_logo", hospitalLogoFile);
        response = await fetch("/api/auth/register-organization", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: fd,
        });
      } else {
        response = await fetch("/api/auth/register-organization", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            hospital: {
              name: form.hospital_name.trim(),
              address: form.hospital_address?.trim() || undefined,
              phone: form.hospital_phone?.trim() || undefined,
              email: form.hospital_email?.trim() || undefined,
            },
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone?.trim() || undefined,
            password: form.password,
            confirm_password: form.confirm_password,
            package: packageSelected,
          }),
        });
      }
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
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("role", JSON.stringify(data.data.role ?? null));
        localStorage.setItem("menuItems", JSON.stringify(data.data.menuItems ?? []));
        if (data.data.hospital) {
          localStorage.setItem("hospital", JSON.stringify(data.data.hospital));
        }
        Swal.fire({
          icon: "success",
          title: "Registration complete",
          text: "You are signed in as Super Admin. You can now create users and roles for your hospital.",
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
            // No scroll on desktop for the register step; allow scroll only on small screens.
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
            px: { xs: 2, sm: 3, md: 4 },
            ...(step === 0
              ? { py: { xs: 1.5, sm: 2 }, pt: "1px" }
              : { pt: "1px", pb: 4 }
            ),
            ...(step === 1 ? { display: "block" } : {}),
          }}
        >
        <Stepper
          activeStep={step}
          sx={{
            pt: 1,
            pb: 2,
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexShrink: 0, maxWidth: 560 }}>
              Select one package below. You can manage patients, appointments, lab, pharmacy, and billing. Then proceed to register your organization.
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
                  background: packageSelected === "silver"
                    ? `linear-gradient(145deg, ${SILVER_LIGHT} 0%, ${SILVER_MAIN} 50%, ${SILVER_DARK} 100%)`
                    : `linear-gradient(145deg, #f5f5f5 0%, ${SILVER_LIGHT} 100%)`,
                  cursor: "pointer",
                  boxShadow: packageSelected === "silver" ? `0 8px 24px ${SILVER_DARK}40` : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
                  "&:hover": {
                    borderColor: SILVER_BORDER,
                    background: `linear-gradient(145deg, ${SILVER_LIGHT} 0%, ${SILVER_MAIN} 50%, ${SILVER_DARK} 100%)`,
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
                        color: SILVER_DARK,
                        "&.Mui-checked": { color: "#5a5a5a" },
                        padding: { xs: 0.5, sm: 0.75 },
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                        color: packageSelected === "silver" ? "#424242" : "text.primary",
                        textShadow: packageSelected === "silver" ? "0 1px 2px rgba(255,255,255,0.8)" : "none",
                      }}
                    >
                      Silver package
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: packageSelected === "silver" ? "#37474f" : "text.secondary",
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
                      color: "inherit",
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
                          bgcolor: packageSelected === "silver" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.06)",
                          borderColor: packageSelected === "silver" ? "rgba(255,255,255,0.8)" : "divider",
                          color: packageSelected === "silver" ? "#37474f" : "text.secondary",
                          "&:hover": {
                            bgcolor: packageSelected === "silver" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.1)",
                            borderColor: packageSelected === "silver" ? "#fff" : "text.secondary",
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
                          bgcolor: packageSelected === "silver" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.06)",
                          borderColor: packageSelected === "silver" ? "rgba(255,255,255,0.8)" : "divider",
                          color: packageSelected === "silver" ? "#37474f" : "text.secondary",
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
                  background: packageSelected === "gold"
                    ? `linear-gradient(145deg, ${GOLD_LIGHT} 0%, ${GOLD_MAIN} 40%, ${GOLD_DARK} 100%)`
                    : `linear-gradient(145deg, #FFFEF5 0%, ${GOLD_LIGHT} 100%)`,
                  cursor: "pointer",
                  boxShadow: packageSelected === "gold" ? `0 8px 24px ${GOLD_DARK}60` : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
                  "&:hover": {
                    borderColor: GOLD_BORDER,
                    background: `linear-gradient(145deg, ${GOLD_LIGHT} 0%, ${GOLD_MAIN} 40%, ${GOLD_DARK} 100%)`,
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
                        color: GOLD_DARK,
                        "&.Mui-checked": { color: "#5d4e37" },
                        padding: { xs: 0.5, sm: 0.75 },
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                        color: packageSelected === "gold" ? "#3e2723" : "text.primary",
                        textShadow: packageSelected === "gold" ? "0 1px 2px rgba(255,255,255,0.6)" : "none",
                      }}
                    >
                      Gold package
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: packageSelected === "gold" ? "#4e342e" : "text.secondary",
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
                      color: "inherit",
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
                          bgcolor: packageSelected === "gold" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.05)",
                          borderColor: packageSelected === "gold" ? "rgba(255,255,255,0.7)" : "divider",
                          color: packageSelected === "gold" ? "#4e342e" : "text.secondary",
                          "&:hover": {
                            bgcolor: packageSelected === "gold" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.1)",
                            borderColor: packageSelected === "gold" ? "#fff" : "text.secondary",
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
                          bgcolor: packageSelected === "gold" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.05)",
                          borderColor: packageSelected === "gold" ? "rgba(255,255,255,0.7)" : "divider",
                          color: packageSelected === "gold" ? "#4e342e" : "text.secondary",
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
            <Box ref={registerHeaderRef} sx={{ mb: { xs: 1.5, md: 1 } }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => setStep(0)}
                sx={{
                  color: "text.secondary",
                  mb: 1,
                  "&:hover": { bgcolor: "action.hover", color: primaryTeal },
                }}
              >
                Back to package
              </Button>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: "text.primary" }}>
                Register your {packageSelected === "silver" ? "clinic" : "hospital"}
              </Typography>
            </Box>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <Box
                sx={{
                  // Clamp height so the register step fits the viewport,
                  // but allow the form itself (not the whole page) to scroll when needed.
                  maxHeight: { xs: "calc(100vh - 220px)", md: "calc(100vh - 260px)" },
                  overflowY: "auto",
                  pr: { xs: 1, md: 0 },
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: { xs: 3, md: 2 },
                    alignItems: "stretch",
                    mb: 2,
                  }}
                >
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    px: 2,
                    pt: 2,
                    pb: 0,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "#fff",
                    // Let card shrink to its content so there is no flex gap under the button
                    height: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", mb: 1.5 }}>
                    Hospital / Clinic
                  </Typography>
                  <Stack spacing={2}>
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
                      sx={inputSx}
                    />
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "#fff",
                    height: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", mb: 1.5 }}>
                    Super Admin account
                  </Typography>
                  <Stack spacing={2}>
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
                      helperText="Your login email"
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
                        loading ||
                        form.password.length < 6 ||
                        form.password !== form.confirm_password
                      }
                      sx={{
                        py: 1.25,
                        mt: 0.5,
                        bgcolor: primaryTeal,
                        fontWeight: 700,
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(0,137,123,0.35)",
                        "&:hover": { bgcolor: primaryTealDark, boxShadow: "0 4px 12px rgba(0,137,123,0.4)" },
                        "&:disabled": { boxShadow: "none" },
                      }}
                    >
                      {loading ? "Creating account…" : "Create account"}
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
    </Box>
  );
}
