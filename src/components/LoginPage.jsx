import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  FormLabel,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock,
  Login as LoginIcon,
} from "@mui/icons-material";
import GuestNavbar from "./GuestNavbar";
import Footer from "./Footer";
import ServicesSection from "./ServicesSection";
import ChatbotWidget from "./ChatbotWidget";
import Swal from "sweetalert2";
import {
  setSubscriptionPaymentPending,
  clearSubscriptionPaymentPending,
  completeSubscriptionPaymentReturn,
} from "../utils/subscriptionPaymentReturn";

const primaryTeal = "#00897B";
const primaryTealDark = "#00695C";

let paystackInlineScriptPromise = null;
async function ensurePaystackInlineScriptLoaded() {
  // Paystack inline checkout uses a global `PaystackPop` object.
  if (typeof window !== "undefined" && window.PaystackPop) return;
  if (paystackInlineScriptPromise) return paystackInlineScriptPromise;

  paystackInlineScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-paystack-inline="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack script")));
      return;
    }

    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.setAttribute("data-paystack-inline", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack inline.js"));
    document.body.appendChild(s);
  });

  return paystackInlineScriptPromise;
}

function normalizeSubscriptionPackage(p) {
  return String(p || "silver").toLowerCase() === "gold" ? "gold" : "silver";
}

/** Uses API `package_amounts_kes_subunits` when present; otherwise infers from legacy payload. */
function getRenewalPackageAmountsSubunits(ctx) {
  const a = ctx?.package_amounts_kes_subunits;
  if (a && Number.isFinite(Number(a.silver)) && Number.isFinite(Number(a.gold))) {
    return { silver: Number(a.silver), gold: Number(a.gold) };
  }
  const cur = normalizeSubscriptionPackage(ctx?.subscription_package);
  const sub = Number(ctx?.amount_kes_subunits || 0);
  return {
    silver: cur === "silver" ? sub : 10 * 100,
    gold: cur === "gold" ? sub : 20 * 100,
  };
}

const BACKGROUND_IMAGES = [
  "/bergy59-bed-8352775_1920.jpg",
  "/geralt-ai-generated-8685102_1920.jpg",
  "/vitalworks-hospital-ward-1338585_1920.jpg",
];
const BACKGROUND_INTERVAL_MS = 5500;
const BACKGROUND_FADE_DURATION = "1.8s";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rfEmail = useRef();
  const rfPassword = useRef();
  const rsEmail = useRef();
  const rsNewPassword = useRef();

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [body, updateBody] = useState({ email: null });
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [paymentRequiredOpen, setPaymentRequiredOpen] = useState(false);
  const [paymentContext, setPaymentContext] = useState(null);
  const [renewalPackage, setRenewalPackage] = useState("silver");
  const [payRedirecting, setPayRedirecting] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, BACKGROUND_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpenLoginDialog(true);
    window.addEventListener("open-login-dialog", onOpen);
    return () => window.removeEventListener("open-login-dialog", onOpen);
  }, []);

  useEffect(() => {
    if (location.hash === "#services") {
      const el = document.getElementById("services");
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [location.hash]);

  /** After Paystack, land on /?reference= — complete subscription then offer sign in. */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (!ref || !sessionStorage.getItem("shms_subscription_pay_pending")) return;

    const procKey = `shms_sub_pay_proc_${ref}`;
    if (sessionStorage.getItem(procKey)) return;
    sessionStorage.setItem(procKey, "1");

    (async () => {
      try {
        const result = await completeSubscriptionPaymentReturn(ref);
        window.history.replaceState({}, "", location.pathname || "/");
        if (result.noPending) {
          sessionStorage.removeItem(procKey);
          return;
        }
        if (result.ok) {
          await Swal.fire({
            icon: "success",
            title: "Payment recorded",
            text: "Your subscription is active. Sign in with your email and password.",
            confirmButtonColor: primaryTeal,
          });
          setOpenLoginDialog(true);
        } else {
          await Swal.fire({
            icon: "error",
            title: "Could not confirm payment",
            text: result.message || "Try again or contact support.",
            confirmButtonColor: primaryTeal,
          });
        }
      } catch (e) {
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: e?.message || "Something went wrong.",
          confirmButtonColor: primaryTeal,
        });
      } finally {
        sessionStorage.removeItem(procKey);
      }
    })();
  }, [location.search, location.pathname]);

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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403 && data.code === "PAYMENT_REQUIRED" && data.data) {
          Swal.close();
          setPaymentContext({
            hospital_id: data.data.hospital_id,
            subscription_package: data.data.subscription_package,
            amount_kes_subunits: data.data.amount_kes_subunits,
            package_amounts_kes_subunits: data.data.package_amounts_kes_subunits,
            paystack_public_key: data.data.paystack_public_key,
            email: d.email,
          });
          setRenewalPackage(normalizeSubscriptionPackage(data.data.subscription_package));
          setPaymentRequiredOpen(true);
        } else if (response.status === 403 && data.code === "PAYMENT_REQUIRED") {
          await Swal.fire({
            icon: "warning",
            title: "Subscription payment required",
            text: data.message || "Complete payment for your organization to continue.",
            confirmButtonColor: primaryTeal,
          });
        } else if (response.status === 403 && data.code === "SUBSCRIPTION_EXPIRED") {
          await Swal.fire({
            icon: "info",
            title: "Subscription inactive",
            text: data.message || "Your organization's subscription has expired. Please contact your Super Admin.",
            confirmButtonColor: primaryTeal,
          });
        } else {
          Swal.fire({ icon: "error", title: "Login Failed", text: data.message || "Login failed", confirmButtonColor: primaryTeal });
        }
      } else if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("role", JSON.stringify(data.data.role ?? null));
        localStorage.setItem("menuItems", JSON.stringify(data.data.menuItems ?? []));
        if (data.data.hospital) {
          localStorage.setItem("hospital", JSON.stringify(data.data.hospital));
        }
        setOpenLoginDialog(false);
        const subscriptionState = data?.data?.hospital?.subscription_status?.status;
        if (subscriptionState === "expired") {
          Swal.fire({
            icon: "info",
            title: "Subscription expired",
            text: "You can download your data or delete your organization from Settings.",
            confirmButtonColor: primaryTeal,
          });
          navigate("/settings");
        } else {
          navigate("/dashboard");
        }
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

  const startPaystackForSubscription = async () => {
    if (!paymentContext?.hospital_id || !paymentContext?.email) return;
    const pkg = normalizeSubscriptionPackage(renewalPackage);
    setPayRedirecting(true);
    try {
      setSubscriptionPaymentPending({
        hospital_id: paymentContext.hospital_id,
        package: pkg,
        email: paymentContext.email,
      });
      const res = await fetch("/api/auth/payment/initialize-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          package: pkg,
          email: paymentContext.email,
          hospital_id: paymentContext.hospital_id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data?.authorization_url) {
        clearSubscriptionPaymentPending();
        await Swal.fire({
          icon: "error",
          title: "Could not start payment",
          text: json.message || "Check Paystack configuration and try again.",
          confirmButtonColor: primaryTeal,
        });
        return;
      }

      const reference = json.data.reference;
      const amount = json.data.amount_kes_subunits;
      const currency = json.data.currency || "KES";

      if (!reference || !amount) {
        clearSubscriptionPaymentPending();
        await Swal.fire({
          icon: "error",
          title: "Payment init failed",
          text: "Missing Paystack reference/amount.",
          confirmButtonColor: primaryTeal,
        });
        return;
      }

      await ensurePaystackInlineScriptLoaded();
      if (!window.PaystackPop) {
        clearSubscriptionPaymentPending();
        throw new Error("Paystack inline script did not expose PaystackPop");
      }

      const handler = window.PaystackPop.setup({
        key: paymentContext.paystack_public_key,
        email: paymentContext.email,
        amount,
        currency,
        ref: reference,
        callback: function (response) {
          // Paystack expects a normal function here (not an async function).
          const ref = response?.reference || reference;
          completeSubscriptionPaymentReturn(ref)
            .then(async (result) => {
              if (result.ok) {
                await Swal.fire({
                  icon: "success",
                  title: "Payment recorded",
                  text: "Your subscription is active. You can sign in now.",
                  confirmButtonColor: primaryTeal,
                });
                setPaymentRequiredOpen(false);
                setPaymentContext(null);
                setRenewalPackage("silver");
                setOpenLoginDialog(true);
              } else {
                await Swal.fire({
                  icon: "error",
                  title: "Could not confirm payment",
                  text: result.message || "Try again or contact support.",
                  confirmButtonColor: primaryTeal,
                });
              }
            })
            .catch(async (err) => {
              await Swal.fire({
                icon: "error",
                title: "Error confirming payment",
                text: err?.message || "Something went wrong.",
                confirmButtonColor: primaryTeal,
              });
            })
            .finally(() => {
              setPayRedirecting(false);
            });
        },
        onClose: function () {
          // User closed/cancelled the Paystack iframe before completing payment.
          clearSubscriptionPaymentPending();
          setPayRedirecting(false);
        },
      });

      handler.openIframe();
    } catch (e) {
      clearSubscriptionPaymentPending();
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: e?.message || "Could not connect to payment.",
        confirmButtonColor: primaryTeal,
      });
    } finally {
      setPayRedirecting(false);
    }
  };

  const fmtKes = (subunits) => {
    const n = Number(subunits || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "KES" });
  };

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
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ position: "relative", height: "100vh", minHeight: "100vh", flexShrink: 0, display: "flex", flexDirection: "column" }}>
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

      <GuestNavbar />

      {/* Centered content on image */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          minHeight: 0,
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
            textShadow: "0 1px 10px rgba(0,0,0,0.2)",
          }}
        >
          Smart Care. Streamlined Operations.
        </Typography>
      </Box>
      </Box>

      <ChatbotWidget
        initialMessages={[
          {
            from: "ai",
            text: "Hi 👋 I'm the Carlvyne assistant. Ask me anything about how this system works, signing up, or what to expect.",
          },
        ]}
        subtitle="Ask how the system works before you sign in."
        buttonLabel="Need help? Chat with us"
        placeholder="Ask about features, registration, billing, etc."
      />

      <ServicesSection />
      <Footer />

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
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
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
            <Typography variant="body2" sx={{ textAlign: "center", mt: 2, color: "text.secondary" }}>
              Don&apos;t have an account?{" "}
              <Typography
                component="span"
                variant="body2"
                onClick={() => { setOpenLoginDialog(false); navigate("/register"); }}
                sx={{ color: primaryTeal, fontWeight: 600, cursor: "pointer", "&:hover": { textDecoration: "underline", color: primaryTealDark } }}
              >
                Register
              </Typography>
            </Typography>
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
        open={paymentRequiredOpen}
        onClose={() => {
          if (!payRedirecting) {
            setPaymentRequiredOpen(false);
            setPaymentContext(null);
            setRenewalPackage("silver");
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, border: "1px solid", borderColor: "divider" } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "text.primary" }}>Complete subscription payment</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: "text.primary" }}>
            Your trial or paid period has ended. Choose the package you want for this renewal (you can upgrade or downgrade). Pay with
            Paystack, then return here to confirm and sign in.
          </DialogContentText>
          {paymentContext && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Package on record:{" "}
                <strong>
                  {normalizeSubscriptionPackage(paymentContext.subscription_package) === "gold" ? "Gold" : "Silver"}
                </strong>
              </Typography>
              <Box>
                <FormLabel component="legend" sx={{ mb: 1, display: "block", fontWeight: 700, color: "text.primary" }}>
                  Renew as
                </FormLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={renewalPackage}
                  onChange={(_e, v) => v && setRenewalPackage(v)}
                  disabled={payRedirecting}
                  aria-label="Subscription package for renewal"
                  sx={{
                    "& .MuiToggleButton-root": { py: 1.25, fontWeight: 700, textTransform: "none" },
                    "& .MuiToggleButton-root.Mui-selected": {
                      bgcolor: `${primaryTeal}14`,
                      color: primaryTeal,
                      borderColor: primaryTeal,
                      "&:hover": { bgcolor: `${primaryTeal}22` },
                    },
                  }}
                >
                  <ToggleButton value="silver">Silver</ToggleButton>
                  <ToggleButton value="gold">Gold</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: primaryTeal }}>
                {fmtKes(getRenewalPackageAmountsSubunits(paymentContext)[normalizeSubscriptionPackage(renewalPackage)])}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Paystack will open in a secure popup. After successful payment, you will return here automatically to confirm and sign in.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: "wrap" }}>
          <Button
            onClick={() => {
              setPaymentRequiredOpen(false);
              setPaymentContext(null);
              setRenewalPackage("silver");
            }}
            disabled={payRedirecting}
            variant="outlined"
          >
            Not now
          </Button>
          <Button
            variant="contained"
            disabled={payRedirecting || !paymentContext}
            onClick={startPaystackForSubscription}
            startIcon={payRedirecting ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ bgcolor: primaryTeal, "&:hover": { bgcolor: primaryTealDark } }}
          >
            {payRedirecting ? "Processing…" : "Pay with Paystack"}
          </Button>
        </DialogActions>
      </Dialog>

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
