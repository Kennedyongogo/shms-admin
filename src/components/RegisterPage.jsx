import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  TextField,
  Typography,
  Stack,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
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
  "Clinic setup — 9 menu items (Hospital, Users & Roles). Ideal for small clinics and single-location practices.";
const GOLD_DESCRIPTION =
  "Full hospital — all 13 menu items. For hospitals and multi-department facilities.";

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
    "& .MuiOutlinedInput-root": { borderRadius: 2 },
    "& .MuiInputLabel-root.Mui-focused": { color: primaryTeal },
    "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: primaryTeal },
  };

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
        overflow: step === 0 ? "hidden" : "auto",
        boxSizing: "border-box",
        bgcolor: "#fff",
      }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => (step === 0 ? navigate("/", { replace: true }) : setStep(0))}
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
          height: step === 0 ? "100%" : undefined,
          minHeight: step === 0 ? "100%" : "100%",
          boxSizing: "border-box",
          px: { xs: 2, sm: 3, md: 4 },
          py: step === 0 ? { xs: 1.5, sm: 2 } : { xs: 7, sm: 8 },
          pt: step === 0 ? { xs: 7, sm: 8 } : { xs: 8, sm: 9 },
          display: step === 0 ? "flex" : "block",
          flexDirection: step === 0 ? "column" : undefined,
        }}
      >
        {step === 0 && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: "text.primary", flexShrink: 0, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
              Choose your package
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, flexShrink: 0 }}>
              Select one package below, then proceed to register your hospital or clinic.
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
                  borderRadius: 2,
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
                    display: "flex",
                    flexDirection: "column",
                    py: { xs: 1.25, sm: 1.5 },
                    px: { xs: 1.5, sm: 2 },
                    overflow: "hidden",
                    "&:last-child": { pb: { xs: 1.25, sm: 1.5 } },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: { xs: 0.75, sm: 1 }, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={packageSelected === "silver"}
                      onChange={() => handlePackageChange("silver")}
                      sx={{
                        color: SILVER_DARK,
                        "&.Mui-checked": { color: "#5a5a5a" },
                        padding: { xs: 0.5, sm: 1 },
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
                      lineHeight: 1.4,
                      mb: { xs: 0.4, sm: 0.5 },
                      pl: { xs: 4, sm: 4.5 },
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
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
                      pl: { xs: 4, sm: 4.5 },
                      fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    }}
                  >
                    Menu items ({SILVER_MENU_ITEMS.length}):
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: { xs: "1px 8px", sm: "2px 12px" },
                      pl: { xs: 4, sm: 4.5 },
                      color: "inherit",
                      opacity: 0.95,
                      fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      lineHeight: 1.4,
                      fontWeight: 600,
                      m: 0,
                    }}
                  >
                    {SILVER_MENU_ITEMS.map((item) => (
                      <Box component="span" key={item} sx={{ "&:before": { content: '"•"', mr: 0.5, fontWeight: 700 } }}>
                        {item}
                      </Box>
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
                  borderRadius: 2,
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
                    display: "flex",
                    flexDirection: "column",
                    py: { xs: 1.25, sm: 1.5 },
                    px: { xs: 1.5, sm: 2 },
                    overflow: "hidden",
                    "&:last-child": { pb: { xs: 1.25, sm: 1.5 } },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: { xs: 0.75, sm: 1 }, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={packageSelected === "gold"}
                      onChange={() => handlePackageChange("gold")}
                      sx={{
                        color: GOLD_DARK,
                        "&.Mui-checked": { color: "#5d4e37" },
                        padding: { xs: 0.5, sm: 1 },
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
                      lineHeight: 1.4,
                      mb: { xs: 0.4, sm: 0.5 },
                      pl: { xs: 4, sm: 4.5 },
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
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
                      pl: { xs: 4, sm: 4.5 },
                      fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    }}
                  >
                    Menu items ({GOLD_MENU_ITEMS.length}):
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: { xs: "1px 8px", sm: "2px 12px" },
                      pl: { xs: 4, sm: 4.5 },
                      color: "inherit",
                      opacity: 0.95,
                      fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      lineHeight: 1.4,
                      fontWeight: 600,
                      m: 0,
                    }}
                  >
                    {GOLD_MENU_ITEMS.map((item) => (
                      <Box component="span" key={item} sx={{ "&:before": { content: '"•"', mr: 0.5, fontWeight: 700 } }}>
                        {item}
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
            <Button
              variant="contained"
              onClick={handleProceed}
              disabled={!packageSelected}
              sx={{
                flexShrink: 0,
                py: 1,
                px: 3,
                bgcolor: primaryTeal,
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": { bgcolor: primaryTealDark },
                "&:disabled": { bgcolor: "action.disabledBackground" },
              }}
            >
              Proceed to register
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: "text.primary" }}>
              Register your {packageSelected === "silver" ? "clinic" : "hospital"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You will be the Super Admin. Enter hospital and your account details.
            </Typography>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <Stack spacing={2.5} sx={{ width: "100%" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mt: 1 }}>
                  Hospital / Clinic details
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon />}
                    sx={{
                      borderColor: primaryTeal,
                      color: primaryTeal,
                      "&:hover": { borderColor: primaryTealDark, bgcolor: "rgba(0,105,92,0.06)" },
                    }}
                  >
                    {hospitalLogoFile ? "Change logo" : "Add hospital logo (optional)"}
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
                  value={form.hospital_name}
                  onChange={(e) => setForm((p) => ({ ...p, hospital_name: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputSx}
                />
                <TextField
                  label="Address"
                  fullWidth
                  value={form.hospital_address}
                  onChange={(e) => setForm((p) => ({ ...p, hospital_address: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Place sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputSx}
                />
                <TextField
                  label="Hospital phone"
                  fullWidth
                  value={form.hospital_phone}
                  onChange={(e) => setForm((p) => ({ ...p, hospital_phone: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputSx}
                />
                <TextField
                  label="Hospital email"
                  type="email"
                  fullWidth
                  value={form.hospital_email}
                  onChange={(e) => setForm((p) => ({ ...p, hospital_email: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputSx}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mt: 1 }}>
                  Your account (Super Admin)
                </Typography>
                <TextField
                  label="Full name"
                  required
                  fullWidth
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputSx}
                />
                <TextField
                  type="email"
                  label="Email (used to sign in)"
                  required
                  fullWidth
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="You will use this email to log in"
                  helperText="This is your login email — use it with your password to sign in later."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputSx}
                />
                <TextField
                  label="Phone"
                  fullWidth
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone sx={{ color: primaryTeal, fontSize: 22 }} />
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
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="At least 6 characters"
                  error={form.password.length > 0 && form.password.length < 6}
                  helperText={form.password.length > 0 && form.password.length < 6 ? "Use at least 6 characters" : ""}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword((p) => !p)}
                          edge="end"
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
                        <Lock sx={{ color: primaryTeal, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          edge="end"
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
                    py: 1.5,
                    mt: 1,
                    bgcolor: primaryTeal,
                    fontWeight: 800,
                    borderRadius: 2,
                    "&:hover": { bgcolor: primaryTealDark },
                  }}
                >
                  {loading ? "Creating account…" : "Register"}
                </Button>
              </Stack>
            </form>
          </>
        )}
      </Box>
    </Box>
  );
}
