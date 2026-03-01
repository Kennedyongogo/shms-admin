import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock,
  Login as LoginIcon,
  Info as InfoIcon,
  PersonAdd as RegisterIcon,
} from "@mui/icons-material";
import Swal from "sweetalert2";

const primaryTeal = "#00897B";
const primaryTealDark = "#00695C";

const BACKGROUND_IMAGES = [
  "/bergy59-bed-8352775_1920.jpg",
  "/geralt-ai-generated-8685102_1920.jpg",
  "/vitalworks-hospital-ward-1338585_1920.jpg",
];
const BACKGROUND_INTERVAL_MS = 5500;
const BACKGROUND_FADE_DURATION = "1.8s";

export default function LoginPage() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const rfEmail = useRef();
  const rfPassword = useRef();
  const rsEmail = useRef();
  const rsNewPassword = useRef();

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [body, updateBody] = useState({ email: null });
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, BACKGROUND_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const login = async (e) => {
    if (e) e.preventDefault();
    const d = { ...body };
    d.email = rfEmail.current?.value?.toLowerCase?.()?.trim() ?? "";
    d.password = rfPassword.current?.value ?? "";
    updateBody(d);
    if (!validateEmail(d.email)) {
      Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid email address", confirmButtonColor: primaryTeal });
      return;
    }
    if (!validatePassword(d.password)) {
      Swal.fire({ icon: "error", title: "Invalid Password", text: "Password must be at least 6 characters", confirmButtonColor: primaryTeal });
      return;
    }
    setLoading(true);
    Swal.fire({ title: "Signing in...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(d),
      });
      const data = await response.json();
      if (!response.ok) {
        Swal.fire({ icon: "error", title: "Login Failed", text: data.message || "Login failed", confirmButtonColor: primaryTeal });
      } else if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("role", JSON.stringify(data.data.role ?? null));
        localStorage.setItem("menuItems", JSON.stringify(data.data.menuItems ?? []));
        if (data.data.hospital) {
          localStorage.setItem("hospital", JSON.stringify(data.data.hospital));
        }
        setOpenLoginDialog(false);
        navigate("/dashboard");
        Swal.fire({ icon: "success", title: "Success!", text: "Signed in successfully", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ icon: "error", title: "Login Failed", text: data.message || "Login failed", confirmButtonColor: primaryTeal });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "Login failed. Please try again.", confirmButtonColor: primaryTeal });
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const d = {
      email: rsEmail.current?.value?.toLowerCase?.()?.trim() ?? "",
      new_password: rsNewPassword.current?.value ?? "",
    };
    if (!validateEmail(d.email)) {
      Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid email address", confirmButtonColor: primaryTeal });
      return;
    }
    if (!validatePassword(d.new_password)) {
      Swal.fire({ icon: "error", title: "Invalid Password", text: "Password must be at least 6 characters", confirmButtonColor: primaryTeal });
      return;
    }
    setResetLoading(true);
    Swal.fire({ title: "Processing...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(d),
      });
      const data = await response.json();
      if (response.ok) {
        setOpenResetDialog(false);
        Swal.fire({ icon: "success", title: "Success", text: data.message || "Password reset successful", confirmButtonColor: primaryTeal });
      } else {
        Swal.fire({ icon: "error", title: "Error", text: data.message || "Password reset failed", confirmButtonColor: primaryTeal });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "Something went wrong. Please try again.", confirmButtonColor: primaryTeal });
    } finally {
      setResetLoading(false);
    }
  };

  const validateEmail = (email) =>
    String(email).toLowerCase().match(/^(([^<>()[\]/.,;:\s@"]+(\.[^<>()[\]/.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  const validatePassword = (password) => password && password.length >= 6;

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      bgcolor: "white",
      "& fieldset": { borderColor: "#dbe6dd" },
      "&:hover fieldset": { borderColor: primaryTeal, borderWidth: "1px" },
      "&.Mui-focused fieldset": { borderColor: primaryTeal, borderWidth: "2px" },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: primaryTeal },
    "& .MuiInputBase-input": { py: "clamp(8px, 1.5vh, 14px)", pl: "clamp(40px, 10vw, 56px)" },
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
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Rotating background images with crossfade */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
        aria-hidden
      >
        {BACKGROUND_IMAGES.map((src, i) => (
          <Box
            key={src}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center center",
              opacity: backgroundIndex === i ? 1 : 0,
              transition: `opacity ${BACKGROUND_FADE_DURATION} ease-in-out`,
              pointerEvents: "none",
            }}
          />
        ))}
      </Box>

      {/* Register - icon + tooltip on small screen, full button on larger */}
      <Box sx={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
        {isSmallScreen ? (
          <Tooltip title="Register" placement="left">
            <IconButton
              onClick={() => navigate("/register")}
              sx={{
                color: primaryTeal,
                border: "1px solid",
                borderColor: primaryTeal,
                bgcolor: "rgba(255,255,255,0.95)",
                transition: "box-shadow 0.4s ease, transform 0.2s ease",
                "&:hover": {
                  borderColor: primaryTealDark,
                  bgcolor: "white",
                  color: primaryTealDark,
                  boxShadow: "0 0 0 8px rgba(0,137,123,0.25)",
                },
                "& .MuiTouchRipple-root": { borderRadius: "50%" },
              }}
            >
              <RegisterIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            variant="outlined"
            startIcon={<RegisterIcon />}
            onClick={() => navigate("/register")}
            sx={{
              color: primaryTeal,
              borderColor: primaryTeal,
              borderWidth: 2,
              fontWeight: 700,
              bgcolor: "rgba(255,255,255,0.95)",
              "&:hover": {
                borderColor: primaryTealDark,
                borderWidth: 2,
                bgcolor: "white",
                color: primaryTealDark,
              },
            }}
          >
            Register
          </Button>
        )}
      </Box>

      {/* Centered content on image */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          textAlign: "center",
          px: 2,
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: "clamp(1.5rem, 4vw + 1rem, 2.75rem)",
            fontWeight: 900,
            lineHeight: 1.2,
            mb: 1.5,
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          Carlvyne Smart Health Management System
        </Typography>
        <Typography
          sx={{
            fontSize: "clamp(1rem, 2vw + 0.5rem, 1.35rem)",
            color: primaryTeal,
            fontWeight: 600,
            mb: 4,
            textShadow: "0 1px 10px rgba(0,0,0,0.2)",
          }}
        >
          Smart Care. Streamlined Operations.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="stretch" justifyContent="center">
          <Button
            variant="contained"
            startIcon={<InfoIcon />}
            onClick={() => navigate("/about")}
            sx={{
              bgcolor: "white",
              color: primaryTeal,
              fontWeight: 800,
              px: 3,
              py: 1.5,
              minWidth: 220,
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.9)",
              },
            }}
          >
            About Carlvyne SHMS
          </Button>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => setOpenLoginDialog(true)}
            sx={{
              bgcolor: "white",
              color: primaryTeal,
              fontWeight: 800,
              px: 3,
              py: 1.5,
              minWidth: 220,
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.9)",
              },
            }}
          >
            Login
          </Button>
        </Stack>
      </Box>

      {/* Login dialog - white, clean UI */}
      <Dialog
        open={openLoginDialog}
        onClose={() => setOpenLoginDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "#fff",
            boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
            border: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <DialogTitle sx={{ color: "text.primary", fontWeight: 800, fontSize: "1.35rem", pt: 3, pb: 2 }}>
          Sign in
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, overflow: "visible", "& .MuiInputLabel-shrink": { overflow: "visible" } }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use the same email and password you used when registering (your account email, not the hospital email).
          </Typography>
          <form onSubmit={login}>
            <TextField
              inputRef={rfEmail}
              type="email"
              label="Email address"
              placeholder="Your account email"
              fullWidth
              required
              InputLabelProps={{ sx: { overflow: "visible" } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: primaryTeal, fontSize: 22 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                ...inputSx,
                mt: 1,
                mb: 2,
                "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], borderRadius: 2, bgcolor: "grey.50" },
                "& .MuiInputLabel-root": { overflow: "visible" },
              }}
            />
            <TextField
              inputRef={rfPassword}
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="Enter your password"
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: primaryTeal, fontSize: 22 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" aria-label={showPassword ? "Hide password" : "Show password"} sx={{ color: "grey.600" }}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ ...inputSx, mb: 1.5, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], borderRadius: 2, bgcolor: "grey.50" } }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} sx={{ color: "grey.600", "&.Mui-checked": { color: primaryTeal } }} />}
                label={<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Remember this device</Typography>}
              />
              <Typography component="button" type="button" variant="body2" onClick={() => setOpenResetDialog(true)} sx={{ border: "none", background: "none", cursor: "pointer", color: primaryTeal, fontWeight: 600, "&:hover": { textDecoration: "underline", color: primaryTealDark } }}>
                Forgot password?
              </Typography>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={22} color="inherit" /> : <LoginIcon sx={{ fontSize: 22 }} />}
              sx={{
                py: 1.5,
                bgcolor: primaryTeal,
                color: "white",
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: "none",
                "&:hover": { bgcolor: primaryTealDark, boxShadow: "0 4px 12px rgba(0,105,92,0.35)" },
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", bgcolor: "grey.50" }}>
          <Button onClick={() => setOpenLoginDialog(false)} variant="outlined" sx={{ borderColor: "grey.300", color: "text.secondary", fontWeight: 600, "&:hover": { borderColor: "grey.400", bgcolor: "grey.100" } }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forgot password dialog */}
      <Dialog
        open={openResetDialog}
        onClose={() => !resetLoading && setOpenResetDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your registered email and a new password to reset your account password.
          </DialogContentText>
          <form onSubmit={(e) => { e.preventDefault(); reset(); }}>
            <TextField inputRef={rsEmail} type="email" label="Email Address" placeholder="admin@hospital.com" fullWidth sx={{ ...inputSx, mb: 2 }} />
            <TextField inputRef={rsNewPassword} type="password" label="New Password" placeholder="••••••••" fullWidth sx={{ ...inputSx, mb: 2 }} />
            <DialogActions sx={{ px: 0 }}>
              <Button variant="outlined" onClick={() => setOpenResetDialog(false)} disabled={resetLoading}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={resetLoading} startIcon={resetLoading ? <CircularProgress size={18} color="inherit" /> : null} sx={{ bgcolor: primaryTeal, color: "white", "&:hover": { bgcolor: primaryTealDark } }}>
                {resetLoading ? "Saving..." : "Reset Password"}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
