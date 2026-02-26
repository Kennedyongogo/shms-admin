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
import { Check, Close, Visibility, VisibilityOff, Settings as SettingsIcon, PhotoCamera } from "@mui/icons-material";
import Avatar from "@mui/material/Avatar";
import Swal from "sweetalert2";

const API_ME = "/api/auth/me";
const API_CHANGE_PASSWORD = "/api/auth/change-password";
const API_ME_PROFILE_IMAGE = "/api/auth/me/profile-image";

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
        if (u) {
          setUserData({
            full_name: u.full_name || "",
            email: u.email || "",
            phone: u.phone || "",
            profile_image_path: u.profile_image_path || "",
          });
        }
      } catch {
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
          window.dispatchEvent(new CustomEvent("user-updated"));
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
          window.dispatchEvent(new CustomEvent("user-updated"));
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
        Update your profile and password.
      </Typography>

      <Stack spacing={3}>
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
      </Stack>
    </Box>
  );
}
