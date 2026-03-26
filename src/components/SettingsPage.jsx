import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  Check,
  Close,
  Visibility,
  VisibilityOff,
  Settings as SettingsIcon,
  PhotoCamera,
  Palette as PaletteIcon,
  CloudDownload,
  DeleteForever,
  ArrowBack,
} from "@mui/icons-material";
import Avatar from "@mui/material/Avatar";
import Swal from "sweetalert2";
import {
  setSubscriptionPaymentPending,
  clearSubscriptionPaymentPending,
  completeSubscriptionPaymentReturn,
} from "../utils/subscriptionPaymentReturn";

const API_ME = "/api/auth/me";
const API_CHANGE_PASSWORD = "/api/auth/change-password";
const API_ME_PROFILE_IMAGE = "/api/auth/me/profile-image";
const API_HOSPITALS = "/api/hospitals";
const DEFAULT_PRIMARY_COLOR = "#00897B";
const SUPER_ADMIN_ROLE_NAME = "Super Admin";

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

function resolveIsSuperAdmin(roleFromApi) {
  const name = roleFromApi?.name != null ? String(roleFromApi.name).trim() : "";
  if (name === SUPER_ADMIN_ROLE_NAME) return true;
  try {
    const stored = JSON.parse(localStorage.getItem("role") || "null");
    const n = stored?.name != null ? String(stored.name).trim() : "";
    return n === SUPER_ADMIN_ROLE_NAME;
  } catch {
    return false;
  }
}

const getToken = () => localStorage.getItem("token");

function buildImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  if (imageUrl.startsWith("uploads/")) return `/${imageUrl}`;
  if (imageUrl.startsWith("/uploads/")) return imageUrl;
  return imageUrl;
}

async function fetchJson(url, { method = "GET", body, token } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  return data;
}

async function uploadProfileImage(token, file) {
  const form = new FormData();
  form.append("profile_image", file);
  const res = await fetch(API_ME_PROFILE_IMAGE, {
    method: "PUT",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Upload failed (${res.status})`);
  return data;
}

export default function SettingsPage() {
  const theme = useTheme();
  const token = getToken();
  const teal = theme.palette.primary?.main || "#00897B";
  const tealDark = theme.palette.primary?.dark || "#00695C";

  const [userData, setUserData] = useState({
    full_name: "",
    email: "",
    phone: "",
    profile_image_path: "",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [meLoading, setMeLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dloading, setDLoading] = useState(false);
  const [ploading, setPLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false,
    special: false,
  });
  const [portalColor, setPortalColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [portalColorSaving, setPortalColorSaving] = useState(false);
  const [hospitalId, setHospitalId] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [expiredMode, setExpiredMode] = useState(false);
  const [showPortabilityActions, setShowPortabilityActions] = useState(true);
  const [payBusy, setPayBusy] = useState(false);
  const [paystackPublicKey, setPaystackPublicKey] = useState(null);
  const [currentSubscriptionPackage, setCurrentSubscriptionPackage] = useState("silver");

  const checkPasswordCriteria = (password) => {
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;/'`~]/.test(password),
    });
  };

  useEffect(() => {
    checkPasswordCriteria(newPassword);
  }, [newPassword]);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) return;
      setMeLoading(true);
      try {
        const data = await fetchJson(API_ME, { token });
        const u = data?.data?.user;
        const hospitalFromApi = data?.data?.hospital;
        if (u) {
          setUserData({
            full_name: u.full_name || "",
            email: u.email || "",
            phone: u.phone || "",
            profile_image_path: u.profile_image_path || "",
          });
        }
        const role = data?.data?.role;
        setIsSuperAdmin(resolveIsSuperAdmin(role));
        if (hospitalFromApi?.id) {
          setHospitalId(hospitalFromApi.id);
          setPortalColor(hospitalFromApi.primary_color || DEFAULT_PRIMARY_COLOR);
          const expired = Boolean(hospitalFromApi?.subscription_status?.status === "expired");
          setExpiredMode(expired);
          setShowPortabilityActions(!expired);
          setPaystackPublicKey(hospitalFromApi?.paystack_public_key || null);
          setCurrentSubscriptionPackage(
            String(hospitalFromApi?.subscription_package || "silver").toLowerCase() === "gold" ? "gold" : "silver"
          );
        } else {
          setExpiredMode(false);
          setShowPortabilityActions(true);
          setPaystackPublicKey(null);
          setCurrentSubscriptionPackage("silver");
          try {
            const stored = JSON.parse(localStorage.getItem("hospital") || "null");
            if (stored?.id) {
              setHospitalId(stored.id);
              setPortalColor(stored.primary_color || DEFAULT_PRIMARY_COLOR);
            }
          } catch (_) {}
        }
      } catch {
        setIsSuperAdmin(resolveIsSuperAdmin(null));
        setExpiredMode(false);
        setShowPortabilityActions(true);
        setPaystackPublicKey(null);
        setCurrentSubscriptionPackage("silver");
        Swal.fire({ icon: "error", title: "Error", text: "Failed to load profile." });
      } finally {
        setMeLoading(false);
      }
    };
    loadMe();
  }, [token]);

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const handleProfileImageUpload = async () => {
    if (!profileImageFile || !token) return;
    setImageUploading(true);
    try {
      const data = await uploadProfileImage(token, profileImageFile);
      const u = data?.data?.user;
      if (u) {
        setUserData((prev) => ({ ...prev, profile_image_path: u.profile_image_path || "" }));
        try {
          localStorage.setItem("user", JSON.stringify(u));
          window.dispatchEvent(new CustomEvent("user-updated", { detail: { user: u } }));
        } catch (_) {}
      }
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
      setProfileImageFile(null);
      setProfileImagePreview("");
      Swal.fire({ icon: "success", title: "Success", text: "Profile picture updated." });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Upload failed", text: err?.message || "Failed to upload picture." });
    } finally {
      setImageUploading(false);
    }
  };

  const handleUserUpdate = async () => {
    if (!token) {
      Swal.fire({ icon: "error", title: "Error", text: "Not logged in. Please sign in again." });
      return;
    }
    setDLoading(true);
    try {
      const body = {
        full_name: String(userData.full_name ?? "").trim(),
        phone: userData.phone ?? "",
      };
      const data = await fetchJson(API_ME, { method: "PATCH", token, body });
      const u = data?.data?.user;
      if (u) {
        setUserData({
          full_name: u.full_name || "",
          email: u.email || "",
          phone: u.phone ?? "",
          profile_image_path: u.profile_image_path || "",
        });
        try {
          localStorage.setItem("user", JSON.stringify(u));
          window.dispatchEvent(new CustomEvent("user-updated", { detail: { user: u } }));
        } catch (_) {}
      }
      Swal.fire({ icon: "success", title: "Success", text: data?.message || "Profile updated successfully." });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Update failed", text: e?.message || "Failed to update profile." });
    } finally {
      setDLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      Swal.fire({ icon: "error", title: "Error", text: "Passwords do not match." });
      return;
    }
    if (
      !passwordCriteria.digit ||
      !passwordCriteria.length ||
      !passwordCriteria.lowercase ||
      !passwordCriteria.special ||
      !passwordCriteria.uppercase
    ) {
      Swal.fire({ icon: "error", title: "Invalid password", text: "Enter a strong password that meets all criteria." });
      return;
    }

    setPLoading(true);
    try {
      const data = await fetchJson(API_CHANGE_PASSWORD, {
        method: "POST",
        token,
        body: { currentPassword: oldPassword, newPassword },
      });
      await Swal.fire({ icon: "success", title: "Success", text: data?.message || "Password updated successfully. Please sign in again with your new password." });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (err) {
      Swal.fire({ icon: "error", title: "Update failed", text: err?.message || "Failed to update password." });
    } finally {
      setPLoading(false);
    }
  };

  const handleDownloadHospitalExport = async () => {
    if (!hospitalId || !token) return;
    setExportLoading(true);
    try {
      const res = await fetch(`${API_HOSPITALS}/${hospitalId}/export-data`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hospital-${hospitalId}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      Swal.fire({
        icon: "success",
        title: "Download started",
        text: "Keep this file safe if you are moving to another system or need a backup.",
        confirmButtonColor: teal,
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Export failed", text: e?.message || "Could not download export." });
    } finally {
      setExportLoading(false);
    }
  };

  const handlePurgeOrganization = async () => {
    if (!hospitalId || !token) return;
    const { value: formValues } = await Swal.fire({
      title: "Delete organization permanently",
      html: `
        <p style="text-align:left;margin-bottom:12px;font-size:14px;">
          This removes your hospital and all related data from this system. You should <strong>download your data</strong> first.
          This cannot be undone.
        </p>
        <input id="purge-pw" type="password" class="swal2-input" placeholder="Your login password" autocomplete="current-password" />
        <input id="purge-phrase" type="text" class="swal2-input" placeholder="Type: DELETE MY ORGANIZATION" autocomplete="off" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Delete everything",
      confirmButtonColor: "#c62828",
      cancelButtonColor: "#757575",
      preConfirm: () => {
        const password = document.getElementById("purge-pw")?.value;
        const confirmPhrase = document.getElementById("purge-phrase")?.value?.trim();
        if (!password) {
          Swal.showValidationMessage("Password is required");
          return false;
        }
        if (confirmPhrase !== "DELETE MY ORGANIZATION") {
          Swal.showValidationMessage('Confirmation phrase must be exactly: DELETE MY ORGANIZATION');
          return false;
        }
        return { password, confirmPhrase };
      },
    });
    if (!formValues) return;
    setPurgeBusy(true);
    try {
      const res = await fetch(`${API_HOSPITALS}/${hospitalId}/purge-organization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: formValues.password,
          confirmPhrase: formValues.confirmPhrase,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
      await Swal.fire({
        icon: "success",
        title: "Organization removed",
        text: "You will be signed out now.",
        confirmButtonColor: teal,
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("menuItems");
      localStorage.removeItem("hospital");
      window.location.href = "/";
    } catch (e) {
      Swal.fire({ icon: "error", title: "Could not delete", text: e?.message || "Operation failed." });
    } finally {
      setPurgeBusy(false);
    }
  };

  const startPaystackPayment = async (pkg) => {
    if (!hospitalId || !userData?.email || !paystackPublicKey) {
      throw new Error("Missing payment details (hospital/email/paystack key).");
    }

    setPayBusy(true);
    try {
      setSubscriptionPaymentPending({
        hospital_id: hospitalId,
        package: pkg,
        email: userData.email,
      });

      const res = await fetch("/api/auth/payment/initialize-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          package: pkg,
          email: userData.email,
          hospital_id: hospitalId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data?.reference) {
        clearSubscriptionPaymentPending();
        throw new Error(json.message || "Could not start Paystack payment.");
      }

      await ensurePaystackInlineScriptLoaded();
      if (!window.PaystackPop) throw new Error("Paystack inline checkout is not available.");

      const reference = json.data.reference;
      const amount = json.data.amount_kes_subunits;
      const currency = json.data.currency || "KES";

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: userData.email,
        amount,
        currency,
        ref: reference,
        callback: function (response) {
          const ref = response?.reference || reference;
          completeSubscriptionPaymentReturn(ref)
            .then(async (result) => {
              if (result.ok) {
                await Swal.fire({
                  icon: "success",
                  title: "Payment recorded",
                  text: "Your subscription is active. Reloading…",
                  confirmButtonColor: teal,
                });
                clearSubscriptionPaymentPending();
                window.location.reload();
              } else {
                await Swal.fire({
                  icon: "error",
                  title: "Payment not confirmed",
                  text: result.message || "Try again or contact support.",
                  confirmButtonColor: teal,
                });
              }
            })
            .catch(async (err) => {
              await Swal.fire({
                icon: "error",
                title: "Error confirming payment",
                text: err?.message || "Something went wrong.",
                confirmButtonColor: teal,
              });
            })
            .finally(() => {
              setPayBusy(false);
            });
        },
        onClose: function () {
          clearSubscriptionPaymentPending();
          setPayBusy(false);
        },
      });

      handler.openIframe();
    } catch (e) {
      clearSubscriptionPaymentPending();
      setPayBusy(false);
      throw e;
    }
  };

  const handlePayWithPaystack = async () => {
    if (!expiredMode) return;
    const prevLabel = currentSubscriptionPackage === "gold" ? "Gold" : "Silver";

    const result = await Swal.fire({
      title: "Renew subscription",
      html: `
        <div style="text-align:left;margin-top:8px;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:12px;line-height:1.45;">
            Choose a package to renew with Paystack.
            <span style="display:inline-block;margin-left:8px;padding:3px 8px;border-radius:999px;background:rgba(0,137,123,0.10);color:#00695C;font-weight:700;">
              Previous: ${prevLabel}
            </span>
          </div>

          <div id="shms-renew-cards" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button type="button" data-pkg="silver"
              style="
                all:unset;cursor:pointer;border-radius:14px;padding:14px 14px 12px;
                border:1px solid rgba(0,0,0,0.10);background:linear-gradient(135deg,#f8fafc 0%, #eef2f7 100%);
                box-shadow:0 10px 30px rgba(2,6,23,0.08);
              ">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="font-weight:900;font-size:14px;color:#0f172a;">Silver</div>
                <div style="font-weight:900;font-size:13px;color:#0f172a;">KES</div>
              </div>
              <div style="margin-top:10px;font-size:12px;color:#334155;line-height:1.35;">
                Core modules for clinics: patients, appointments, lab, pharmacy, billing, users, settings.
              </div>
              <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#64748b;font-weight:700;">Recommended for clinics</div>
                <div style="width:10px;height:10px;border-radius:999px;background:#94a3b8;"></div>
              </div>
            </button>

            <button type="button" data-pkg="gold"
              style="
                all:unset;cursor:pointer;border-radius:14px;padding:14px 14px 12px;
                border:1px solid rgba(180,83,9,0.30);background:linear-gradient(135deg,#fffbeb 0%, #fef3c7 60%, #fde68a 100%);
                box-shadow:0 12px 34px rgba(180,83,9,0.18);
              ">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="font-weight:900;font-size:14px;color:#7c2d12;">Gold</div>
                <div style="font-weight:900;font-size:13px;color:#7c2d12;">KES</div>
              </div>
              <div style="margin-top:10px;font-size:12px;color:#7c2d12;line-height:1.35;">
                Full hospital suite: everything in Silver plus ward, diet, inventory, audit log.
              </div>
              <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#92400e;font-weight:800;">Best for hospitals</div>
                <div style="width:10px;height:10px;border-radius:999px;background:#f59e0b;"></div>
              </div>
            </button>
          </div>

          <div style="margin-top:12px;font-size:12px;color:#6b7280;">
            Your payment will open securely in Paystack and return here automatically.
          </div>
        </div>
      `,
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      confirmButtonColor: teal,
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => {
        const prev = currentSubscriptionPackage === "gold" ? "gold" : "silver";
        const root = document.getElementById("shms-renew-cards");
        if (!root) return;
        const buttons = Array.from(root.querySelectorAll("button[data-pkg]"));
        const setSelected = (pkg) => {
          const val = pkg === "gold" ? "gold" : "silver";
          Swal.getPopup().dataset.pkg = val;
          buttons.forEach((b) => {
            const isSel = b.dataset.pkg === val;
            b.style.outline = isSel ? "3px solid rgba(0,137,123,0.55)" : "none";
            b.style.transform = isSel ? "translateY(-1px)" : "translateY(0)";
          });
        };
        setSelected(prev);
        buttons.forEach((b) => b.addEventListener("click", () => setSelected(b.dataset.pkg)));
      },
      preConfirm: () => {
        const pkg = Swal.getPopup()?.dataset?.pkg;
        if (!pkg) {
          Swal.showValidationMessage("Select a package to continue.");
          return false;
        }
        return pkg;
      },
    });

    if (!result.isConfirmed) return;
    const pkg = result.value;

    try {
      await startPaystackPayment(pkg);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Payment error", text: e?.message || "Could not start payment.", confirmButtonColor: teal });
    }
  };

  const handlePortalColorSave = async () => {
    if (!hospitalId || !token) {
      Swal.fire({ icon: "warning", title: "Not available", text: "Portal theme can be set only when your account is linked to a hospital." });
      return;
    }
    const hex = portalColor.startsWith("#") ? portalColor : `#${portalColor}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      Swal.fire({ icon: "warning", title: "Invalid color", text: "Use a valid hex color (e.g. #00897B)." });
      return;
    }
    setPortalColorSaving(true);
    try {
      await fetchJson(`${API_HOSPITALS}/${hospitalId}`, {
        method: "PUT",
        token,
        body: { primary_color: hex },
      });
      try {
        const hospital = JSON.parse(localStorage.getItem("hospital") || "{}");
        localStorage.setItem("hospital", JSON.stringify({ ...hospital, primary_color: hex }));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("theme-updated", { detail: { primary_color: hex } }));
      Swal.fire({ icon: "success", title: "Saved", text: "Portal theme color updated. The admin portal will use this color." });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Update failed", text: err?.message || "Could not save theme color." });
    } finally {
      setPortalColorSaving(false);
    }
  };

  const cardSx = {
    borderRadius: 2,
    boxShadow: "0 4px 20px rgba(0, 137, 123, 0.08)",
    border: "1px solid",
    borderColor: "rgba(0, 137, 123, 0.12)",
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 1.5,
      "& fieldset": { borderColor: "divider" },
      "&:hover fieldset": { borderColor: teal },
      "&.Mui-focused fieldset": { borderColor: teal, borderWidth: 2 },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: teal },
  };

  if (meLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
        <CircularProgress sx={{ color: teal }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <SettingsIcon sx={{ color: teal, fontSize: 28 }} />
        <Typography variant="h5" fontWeight={800} color="text.primary">
          Settings
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {expiredMode ? "Download your data or delete your organization." : "Update your profile and password."}
      </Typography>
      {expiredMode && showPortabilityActions === true && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBack />}
            disabled={exportLoading || purgeBusy}
            onClick={() => setShowPortabilityActions(false)}
            sx={{ color: teal, fontWeight: 700, px: 0.5, "&:hover": { bgcolor: "transparent", color: tealDark } }}
          >
            Back
          </Button>
        </Stack>
      )}

      <Stack spacing={3}>
        {!expiredMode && (
          <Card elevation={0} sx={cardSx}>
          <CardHeader
            title="User details"
            titleTypographyProps={{ fontWeight: 700, color: "text.primary" }}
            sx={{ pb: 0 }}
          />
          <Divider sx={{ borderColor: "divider" }} />
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  src={profileImagePreview || buildImageUrl(userData.profile_image_path)}
                  sx={{ width: 72, height: 72, bgcolor: teal }}
                >
                  {userData.full_name?.charAt(0)?.toUpperCase() || "U"}
                </Avatar>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Profile picture
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      startIcon={<PhotoCamera />}
                      sx={{ borderColor: teal, color: teal, "&:hover": { borderColor: tealDark, bgcolor: "action.hover" } }}
                    >
                      {profileImageFile ? "Change file" : "Choose image"}
                      <input type="file" hidden accept="image/*" onChange={handleProfileImageChange} />
                    </Button>
                    {profileImageFile && (
                      <Button
                        variant="contained"
                        size="small"
                        disabled={imageUploading}
                        onClick={handleProfileImageUpload}
                        sx={{ bgcolor: teal, "&:hover": { bgcolor: tealDark } }}
                      >
                        {imageUploading ? "Uploading…" : "Upload"}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Stack>
              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Full name</InputLabel>
                <OutlinedInput
                  label="Full name"
                  value={userData.full_name}
                  onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                />
              </FormControl>
              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Email</InputLabel>
                <OutlinedInput label="Email" value={userData.email} disabled />
              </FormControl>
              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Phone</InputLabel>
                <OutlinedInput
                  label="Phone"
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  placeholder="+254..."
                />
              </FormControl>
            </Stack>
          </CardContent>
          <Divider sx={{ borderColor: "divider" }} />
          <CardActions sx={{ justifyContent: "flex-end", px: 2, py: 1.5 }}>
            <Button
              variant="contained"
              onClick={handleUserUpdate}
              disabled={dloading}
              sx={{
                bgcolor: teal,
                fontWeight: 700,
                "&:hover": { bgcolor: tealDark },
              }}
            >
              {dloading ? "Submitting…" : "Update details"}
            </Button>
          </CardActions>
          </Card>
        )}

        {hospitalId && !expiredMode && (
          <Card elevation={0} sx={cardSx}>
            <CardHeader
              avatar={<PaletteIcon sx={{ color: teal }} />}
              title="Portal theme color"
              subheader="Set the accent color for the entire admin portal (header, sidebar, dialogs, buttons). Change to grey or any color; all components update to match."
              titleTypographyProps={{ fontWeight: 700, color: "text.primary" }}
              subheaderTypographyProps={{ color: "text.secondary", variant: "body2" }}
              sx={{ pb: 0 }}
            />
            <Divider sx={{ borderColor: "divider" }} />
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                <Box
                  component="input"
                  type="color"
                  value={portalColor}
                  onChange={(e) => setPortalColor(e.target.value)}
                  sx={{
                    width: 48,
                    height: 48,
                    border: "2px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    cursor: "pointer",
                    p: 0,
                  }}
                />
                <FormControl sx={{ minWidth: 120, ...inputSx }}>
                  <InputLabel>Hex</InputLabel>
                  <OutlinedInput
                    label="Hex"
                    value={portalColor}
                    onChange={(e) => setPortalColor(e.target.value)}
                    placeholder="#00897B"
                  />
                </FormControl>
                <Button
                  variant="contained"
                  onClick={handlePortalColorSave}
                  disabled={portalColorSaving}
                  sx={{ bgcolor: teal, "&:hover": { bgcolor: tealDark } }}
                >
                  {portalColorSaving ? "Saving…" : "Apply to portal"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {expiredMode && isSuperAdmin && !showPortabilityActions && (
          <Card elevation={0} sx={cardSx}>
            <CardHeader
              avatar={<DeleteForever sx={{ color: teal }} />}
              title="Subscription expired"
              subheader="You can pay to renew, or download your data and delete your organization."
              titleTypographyProps={{ fontWeight: 700, color: "text.primary" }}
              subheaderTypographyProps={{ color: "text.secondary", variant: "body2" }}
              sx={{ pb: 0 }}
            />
            <Divider sx={{ borderColor: "divider" }} />
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<CloudDownload />}
                  disabled={payBusy}
                  onClick={handlePayWithPaystack}
                  sx={{ bgcolor: teal, "&:hover": { bgcolor: tealDark } }}
                >
                  {payBusy ? "Processing…" : "Pay with Paystack"}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={payBusy}
                  onClick={() => setShowPortabilityActions(true)}
                  sx={{ borderColor: "error.main" }}
                >
                  Continue without paying
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {hospitalId && isSuperAdmin && (!expiredMode || showPortabilityActions) && (
          <Card elevation={0} sx={cardSx}>
            <CardHeader
              avatar={<CloudDownload sx={{ color: teal }} />}
              title="Your hospital data"
              subheader="Download a JSON copy of data tied to your hospital before you leave or switch systems. You can also permanently delete your organization here after exporting."
              titleTypographyProps={{ fontWeight: 700, color: "text.primary" }}
              subheaderTypographyProps={{ color: "text.secondary", variant: "body2" }}
              sx={{ pb: 0 }}
            />
            <Divider sx={{ borderColor: "divider" }} />
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Super Admins only. Passwords are never included in the export. Store the file securely; it may contain personal health information.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<CloudDownload />}
                    disabled={exportLoading}
                    onClick={handleDownloadHospitalExport}
                    sx={{ bgcolor: teal, "&:hover": { bgcolor: tealDark } }}
                  >
                    {exportLoading ? "Preparing…" : "Download data export (JSON)"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteForever />}
                    disabled={purgeBusy || exportLoading}
                    onClick={handlePurgeOrganization}
                    sx={{ borderColor: "error.main" }}
                  >
                    Delete organization permanently
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {!expiredMode && (
          <form onSubmit={handlePasswordUpdate}>
            <Card elevation={0} sx={cardSx}>
            <CardHeader
              title="Password"
              subheader="Update password"
              titleTypographyProps={{ fontWeight: 700, color: "text.primary" }}
              subheaderTypographyProps={{ color: "text.secondary" }}
              sx={{ pb: 0 }}
            />
            <Divider sx={{ borderColor: "divider" }} />
            <CardContent>
              <Stack spacing={2}>
                <List dense disablePadding>
                  {[
                    { key: "length", met: passwordCriteria.length, text: "At least 8 characters long" },
                    { key: "uppercase", met: passwordCriteria.uppercase, text: "At least one uppercase letter" },
                    { key: "lowercase", met: passwordCriteria.lowercase, text: "At least one lowercase letter" },
                    { key: "digit", met: passwordCriteria.digit, text: "At least one digit" },
                    { key: "special", met: passwordCriteria.special, text: "At least one special character" },
                  ].map(({ key, met, text }) => (
                    <ListItem key={key} disableGutters sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {met ? (
                          <Check sx={{ color: "success.main" }} fontSize="small" />
                        ) : (
                          <Close sx={{ color: "error.main" }} fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText primary={text} primaryTypographyProps={{ variant: "body2", color: "text.secondary" }} />
                    </ListItem>
                  ))}
                </List>

                <FormControl fullWidth sx={inputSx}>
                  <InputLabel>Current password</InputLabel>
                  <OutlinedInput
                    label="Current password"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle current password visibility"
                          onClick={() => setShowOldPassword((p) => !p)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          size="small"
                        >
                          {showOldPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                </FormControl>

                <Box sx={{ display: "flex", gap: 2, width: "100%", flexWrap: "wrap" }}>
                  <FormControl fullWidth sx={{ flex: "1 1 0", minWidth: 0, ...inputSx }}>
                    <InputLabel>New password</InputLabel>
                    <OutlinedInput
                      label="New password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle new password visibility"
                            onClick={() => setShowNewPassword((p) => !p)}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                            size="small"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                  </FormControl>
                  <FormControl fullWidth sx={{ flex: "1 1 0", minWidth: 0, ...inputSx }}>
                    <InputLabel>Confirm password</InputLabel>
                    <OutlinedInput
                      label="Confirm password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle confirm password visibility"
                            onClick={() => setShowConfirmPassword((p) => !p)}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                            size="small"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                  </FormControl>
                </Box>
              </Stack>
            </CardContent>
            <Divider sx={{ borderColor: "divider" }} />
            <CardActions sx={{ justifyContent: "flex-end", px: 2, py: 1.5 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={ploading}
                sx={{
                  bgcolor: teal,
                  fontWeight: 700,
                  "&:hover": { bgcolor: tealDark },
                }}
              >
                {ploading ? "Submitting…" : "Update password"}
              </Button>
            </CardActions>
            </Card>
          </form>
        )}
      </Stack>
    </Box>
  );
}
