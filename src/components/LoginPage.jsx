import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock,
  Login as LoginIcon,
  LocalHospital,
} from "@mui/icons-material";
import Swal from "sweetalert2";

// Design tokens from the provided layout
const primaryTeal = "#00897B"; // public portal hero teal
const primaryTealDark = "#00695C";
const earthBrown = "#37474F";
const backgroundLight = "#f6f8f6";
const backgroundDark = "#0b2a27";
const textPrimary = "#111812";

// Left panel background image (from public folder)
const leftPanelImage = "/shirley810-dentist-372792_1920.jpg";

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

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

  const login = async (e) => {
    if (e) e.preventDefault();

    const d = { ...body };
    d.email = rfEmail.current?.value?.toLowerCase?.()?.trim() ?? "";
    d.password = rfPassword.current?.value ?? "";
    updateBody(d);

    if (!validateEmail(d.email)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please enter a valid email address",
        confirmButtonColor: primaryTeal,
      });
      return;
    }

    if (!validatePassword(d.password)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Password",
        text: "Password must be at least 6 characters",
        confirmButtonColor: primaryTeal,
      });
      return;
    }

    setLoading(true);
    Swal.fire({
      title: "Signing in...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(d),
      });
      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: data.message || "Login failed",
          confirmButtonColor: primaryTeal,
        });
      } else if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Signed in successfully",
          timer: 1500,
          showConfirmButton: false,
        });
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("role", JSON.stringify(data.data.role ?? null));
        setTimeout(() => navigate("/users"), 1500);
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: data.message || "Login failed",
          confirmButtonColor: primaryTeal,
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Login failed. Please try again.",
        confirmButtonColor: primaryTeal,
      });
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
      Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please enter a valid email address",
        confirmButtonColor: primaryTeal,
      });
      return;
    }

    if (!validatePassword(d.new_password)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Password",
        text: "Password must be at least 6 characters",
        confirmButtonColor: primaryTeal,
      });
      return;
    }

    setResetLoading(true);
    Swal.fire({
      title: "Processing...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(d),
      });
      const data = await response.json();

      if (response.ok) {
        setOpenResetDialog(false);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: data.message || "Password reset successful",
          confirmButtonColor: primaryTeal,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Password reset failed",
          confirmButtonColor: primaryTeal,
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong. Please try again.",
        confirmButtonColor: primaryTeal,
      });
    } finally {
      setResetLoading(false);
    }
  };

  const validateEmail = (email) =>
    String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]/.,;:\s@"]+(\.[^<>()[\]/.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );

  const validatePassword = (password) => password && password.length >= 6;

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      bgcolor: "white",
      "& fieldset": { borderColor: "#dbe6dd" },
        "&:hover fieldset": { borderColor: primaryTeal, borderWidth: "1px" },
      "&.Mui-focused fieldset": {
          borderColor: primaryTeal,
        borderWidth: "2px",
      },
    },
      "& .MuiInputLabel-root.Mui-focused": { color: primaryTeal },
    "& .MuiInputBase-input": {
      py: "clamp(10px, 2vh, 14px)",
      pl: "clamp(40px, 10vw, 56px)",
    },
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        height: "100vh",
        maxHeight: "100dvh",
        width: "100%",
        overflow: "hidden",
        fontFamily: '"Inter", "Roboto", sans-serif',
        bgcolor: backgroundLight,
      }}
    >
      {/* Left: Visual anchor (hidden on small screens) */}
      {isDesktop && (
        <Box
          sx={{
            width: "50%",
            position: "relative",
            flexShrink: 0,
            overflow: "hidden",
            height: "100vh",
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${leftPanelImage})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              bgcolor: backgroundDark,
            }}
            aria-hidden
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(16, 34, 19, 0.25)",
            }}
          />
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              height: "100%",
              maxHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "clamp(16px, 4vh, 32px) clamp(16px, 4vw, 32px)",
              color: "white",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                maxWidth: 360,
                width: "100%",
                flexShrink: 0,
                mt: "auto",
                boxSizing: "border-box",
              }}
            >
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  px: 1.5,
                  py: 0.5,
                  bgcolor: primaryTeal,
                  color: "white",
                  fontSize: "clamp(0.65rem, 1.5vh, 0.75rem)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  borderRadius: "9999px",
                  mb: "clamp(8px, 2vh, 16px)",
                }}
              >
                Admin Portal
              </Box>
              <Typography
                variant="h2"
                sx={{
                  fontSize: "clamp(1.25rem, 4vh, 3rem)",
                  fontWeight: 900,
                  lineHeight: 1.2,
                  mb: "clamp(8px, 2vh, 16px)",
                  overflow: "visible",
                  wordBreak: "break-word",
                }}
              >
                Smart Care. Streamlined Operations.
              </Typography>
              <Typography
                sx={{
                  fontSize: "clamp(0.875rem, 2vh, 1.125rem)",
                  color: "rgba(255,255,255,0.8)",
                  overflow: "visible",
                  wordBreak: "break-word",
                  lineHeight: 1.5,
                }}
              >
                Manage patients, staff, appointments, laboratory, pharmacy, billing, and inpatient care — all in one system.
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Right: Login form - fits viewport, footer always visible, no page scrollbar */}
      <Box
        sx={{
          width: isDesktop ? "50%" : "100%",
          height: "100vh",
          maxHeight: "100dvh",
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "white",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            padding: "clamp(12px, 3vh, 32px) clamp(16px, 5vw, 48px)",
            overflow: "hidden",
          }}
        >
          {/* Brand header - always visible at top */}
          <Box
            sx={{
              flexShrink: 0,
              textAlign: "center",
              marginBottom: "clamp(8px, 2vh, 24px)",
            }}
          >
            <Box
              sx={{
                width: "clamp(40px, 10vw, 64px)",
                height: "clamp(40px, 10vw, 64px)",
                minWidth: 40,
                minHeight: 40,
                bgcolor: primaryTeal,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: "clamp(8px, 2vh, 16px)",
              }}
            >
              <LocalHospital
                sx={{
                  color: "white",
                  fontSize: "clamp(24, 6vw, 40)",
                }}
              />
            </Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: "clamp(1.15rem, 2.5vw + 0.5rem, 1.875rem)",
                fontWeight: 900,
                color: textPrimary,
                lineHeight: 1.2,
              }}
            >
              Smart Hospital Management System
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                color: earthBrown,
                fontSize: "clamp(0.8rem, 1.5vw + 0.5rem, 1.125rem)",
                mt: 0.5,
              }}
            >
              Admin Portal
            </Typography>
          </Box>

          {/* Scrollable middle - only this area scrolls if content is tall */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: "min(480px, 90vw)",
                flexShrink: 0,
              }}
            >
          {/* Login card - padding scales with viewport */}
          <Card
            elevation={0}
            sx={{
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
              borderRadius: 2,
              p: "clamp(16px, 3vh, 24px)",
              border: "1px solid",
              borderColor: "grey.100",
              bgcolor: "white",
            }}
          >
            <Box sx={{ mb: "clamp(12px, 2.5vh, 24px)" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: textPrimary,
                  fontSize: "clamp(1rem, 1.5vw + 0.5rem, 1.25rem)",
                }}
              >
                Admin Login
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "clamp(0.75rem, 1vw + 0.4rem, 0.875rem)" }}
              >
                Please enter your credentials to continue
              </Typography>
            </Box>

            <form onSubmit={login}>
              <TextField
                inputRef={rfEmail}
                type="email"
                label="Email Address"
                placeholder="admin@mkconsultants.com"
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: "grey.500", fontSize: 22 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ ...inputSx, mb: "clamp(8px, 2vh, 16px)" }}
              />

              <TextField
                inputRef={rfPassword}
                type={showPassword ? "text" : "password"}
                label="Password"
                placeholder="••••••••"
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: "grey.500", fontSize: 22 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ ...inputSx, mb: "clamp(4px, 1vh, 8px)" }}
              />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{
                        color: "#dbe6dd",
                        "&.Mui-checked": { color: primaryTeal },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Remember this device
                    </Typography>
                  }
                />
                <Typography
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => setOpenResetDialog(true)}
                  sx={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: earthBrown,
                    fontWeight: 700,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Forgot password?
                </Typography>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    <LoginIcon sx={{ fontSize: 22 }} />
                  )
                }
                sx={{
                  mt: "clamp(16px, 3vh, 24px)",
                  py: "clamp(12px, 2.5vh, 14px)",
                  bgcolor: primaryTeal,
                  color: "white",
                  fontWeight: 900,
                  fontSize: "clamp(0.75rem, 1.5vw + 0.4rem, 0.875rem)",
                  letterSpacing: "0.05em",
                  borderRadius: "8px",
                  boxShadow: "0 0 20px rgba(0, 137, 123, 0.22)",
                  "&:hover": {
                    bgcolor: primaryTealDark,
                    boxShadow: "0 0 24px rgba(0, 137, 123, 0.3)",
                  },
                  "&:active": { transform: "scale(0.98)" },
                }}
              >
                {loading ? "Signing in..." : "SIGN IN TO PORTAL"}
              </Button>
            </form>
          </Card>
            </Box>
          </Box>

          {/* Footer - always visible at bottom, never cut off */}
          <Box
            sx={{
              flexShrink: 0,
              paddingTop: "clamp(12px, 2vh, 20px)",
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "grey.500",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "clamp(0.65rem, 1.2vw + 0.3rem, 0.75rem)",
              }}
            >
              © {new Date().getFullYear()} Smart Hospital Management System. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Forgot password dialog */}
      <Dialog
        open={openResetDialog}
        onClose={() => !resetLoading && setOpenResetDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: textPrimary }}>
          Reset Password
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your registered email and a new password to reset your account password.
          </DialogContentText>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reset();
            }}
          >
            <TextField
              inputRef={rsEmail}
              type="email"
              label="Email Address"
              placeholder="admin@hospital.com"
              fullWidth
              sx={{ ...inputSx, mb: 2 }}
            />
            <TextField
              inputRef={rsNewPassword}
              type="password"
              label="New Password"
              placeholder="••••••••"
              fullWidth
              sx={{ ...inputSx, mb: 2 }}
            />
            <DialogActions sx={{ px: 0 }}>
              <Button
                variant="outlined"
                onClick={() => setOpenResetDialog(false)}
                disabled={resetLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={resetLoading}
                startIcon={resetLoading ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{
                  bgcolor: primaryTeal,
                  color: "white",
                  "&:hover": { bgcolor: primaryTealDark },
                }}
              >
                {resetLoading ? "Saving..." : "Reset Password"}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
