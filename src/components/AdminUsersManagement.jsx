import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Avatar,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  List as ListIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  Block as BlockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import Swal from "sweetalert2";

const API = {
  roles: "/api/roles",
  users: "/api/users",
};

/** Display labels for navbar menu keys (must match backend ALL_MENU_KEYS). */
const MENU_KEY_LABELS = {
  dashboard: "Dashboard",
  hospitals: "Hospital",
  appointments: "Appointments",
  patients: "Patients",
  laboratory: "Laboratory",
  pharmacy: "Pharmacy",
  ward: "Ward & Admissions",
  diet: "Diet & Meals",
  inventory: "Inventory",
  billing: "Billing & Payments",
  users: "Users & Roles",
  "audit-logs": "Audit log",
  settings: "Settings",
};

const getToken = () => localStorage.getItem("token");
const getRoleName = () => {
  try {
    const role = JSON.parse(localStorage.getItem("role") || "null");
    return role?.name || null;
  } catch {
    return null;
  }
};

const normalizeRoleName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase();
const displayRoleName = (name) => {
  const n = normalizeRoleName(name);
  if (n === "admin") return "Admin";
  if (
    n === "user" ||
    n === "regular_user" ||
    n === "regular" ||
    n === "patient" ||
    n === "helper"
  )
    return "Regular user";
  return name || "—";
};

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
  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function uploadFile(url, { token, fieldName, file }) {
  const form = new FormData();
  form.append(fieldName, file);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message || data?.error || `Upload failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

// Helper to build URL for uploaded assets using Vite proxy
const buildImageUrl = (relativePath) => {
  if (!relativePath) return "";
  if (String(relativePath).startsWith("http")) return relativePath;
  if (String(relativePath).startsWith("uploads/")) return `/${relativePath}`;
  if (String(relativePath).startsWith("/uploads/")) return relativePath;
  return relativePath;
};

const normalizeKenyanPhone = (input) => {
  if (input == null) return { value: null, error: null };
  const raw = String(input).trim();
  if (!raw) return { value: null, error: null };

  let p = raw.replace(/[\s\-()]/g, "");

  // Accept common inputs and normalize to +254XXXXXXXXX (9 digits after 254)
  if (p.startsWith("+254")) {
    // ok
  } else if (p.startsWith("254")) {
    p = `+${p}`;
  } else if (p.startsWith("0") && p.length === 10) {
    p = `+254${p.slice(1)}`;
  } else if (/^[71]\d{8}$/.test(p)) {
    p = `+254${p}`;
  } else {
    return {
      value: raw,
      error: 'Phone must be a Kenya number starting with "+254"',
    };
  }

  if (!/^\+254\d{9}$/.test(p)) {
    return { value: raw, error: 'Phone must be in format "+254XXXXXXXXX"' };
  }

  return { value: p, error: null };
};

export default function AdminUsersManagement() {
  const theme = useTheme();
  const token = getToken();
  const roleName = getRoleName();
  const isAdmin = roleName === "admin";
  const usersReqId = useRef(0);
  const rolesReqId = useRef(0);

  const [tab, setTab] = useState(0); // 0 users, 1 roles

  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const showToast = (severity, message) =>
    setToast({ open: true, severity, message });

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesForbidden, setRolesForbidden] = useState(false);
  const [rolesPage, setRolesPage] = useState(0);
  const [rolesRowsPerPage, setRolesRowsPerPage] = useState(10);
  const [rolesTotal, setRolesTotal] = useState(0);
  const [rolesSearch, setRolesSearch] = useState("");
  const [rolesSearchLocked, setRolesSearchLocked] = useState(true);

  const rolesById = useMemo(() => {
    const map = new Map();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  const userAssignableRoles = useMemo(() => {
    const allowed = new Set(["admin", "user", "regular_user", "regular"]);
    return roles.filter((r) => allowed.has(normalizeRoleName(r.name)));
  }, [roles]);

  const defaultRegularRoleId = useMemo(() => {
    const preferred = ["user", "regular_user", "regular"];
    const r = roles.find((x) => preferred.includes(normalizeRoleName(x.name)));
    return r?.id || "";
  }, [roles]);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersForbidden, setUsersForbidden] = useState(false);
  const [usersPage, setUsersPage] = useState(0);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersSearchLocked, setUsersSearchLocked] = useState(true);

  const [roleDialog, setRoleDialog] = useState({
    open: false,
    mode: "create",
    id: null,
  });
  const [roleForm, setRoleForm] = useState({ name: "" });
  const [roleView, setRoleView] = useState({ open: false, role: null });
  const [roleViewMenuKeys, setRoleViewMenuKeys] = useState([]);
  const [roleViewMenuLoading, setRoleViewMenuLoading] = useState(false);
  const [menuItemsDialog, setMenuItemsDialog] = useState({ open: false, role: null });
  const [menuItemsForm, setMenuItemsForm] = useState({ allMenuKeys: [], selectedKeys: [] });
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
  const [menuItemsSaving, setMenuItemsSaving] = useState(false);

  const [userDialog, setUserDialog] = useState({
    open: false,
    mode: "create",
    id: null,
  });
  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    profile_image_file: null,
    profile_image_preview: "",
    password: "",
    confirm_password: "",
    role_id: "",
    status: "active",
  });
  const [userView, setUserView] = useState({ open: false, user: null });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const requireTokenGuard = () => {
    if (!token) {
      showToast("error", "You are not logged in. Please sign in again.");
      setTimeout(() => (window.location.href = "/"), 800);
      return false;
    }
    return true;
  };

  const loadRoles = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++rolesReqId.current;
    setRolesLoading(true);
    setRolesForbidden(false);
    try {
      const page = rolesPage + 1;
      const limit = rolesRowsPerPage;
      const search = rolesSearch?.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const data = await fetchJson(`${API.roles}?${qs.toString()}`, { token });
      if (reqId !== rolesReqId.current) return;
      setRoles(data.data || []);
      setRolesTotal(data.pagination?.total ?? (data.data?.length || 0));
      setRolesForbidden(false);
    } catch (e) {
      if (reqId !== rolesReqId.current) return;
      if (
        e.status === 403 &&
        String(e.message || "")
          .toLowerCase()
          .includes("insufficient role")
      ) {
        setRolesForbidden(true);
      }
      showToast("error", e.message);
    } finally {
      if (reqId !== rolesReqId.current) return;
      setRolesLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!requireTokenGuard()) return;
    const reqId = ++usersReqId.current;
    setUsersLoading(true);
    setUsersForbidden(false);
    try {
      const page = usersPage + 1;
      const limit = usersRowsPerPage;
      const search = usersSearch?.trim();
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const data = await fetchJson(`${API.users}?${qs.toString()}`, { token });
      if (reqId !== usersReqId.current) return;
      setUsers(data.data || []);
      setUsersTotal(data.pagination?.total ?? (data.data?.length || 0));
      setUsersForbidden(false);
    } catch (e) {
      if (reqId !== usersReqId.current) return;
      if (
        e.status === 403 &&
        String(e.message || "")
          .toLowerCase()
          .includes("insufficient role")
      ) {
        setUsersForbidden(true);
      }
      showToast("error", e.message);
    } finally {
      if (reqId !== usersReqId.current) return;
      setUsersLoading(false);
    }
  };

  const tryBootstrapPromote = async () => {
    if (!requireTokenGuard()) return;
    try {
      await fetchJson("/api/auth/bootstrap/promote-me", {
        method: "POST",
        token,
      });
      showToast("success", "Promoted to admin. Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      showToast("error", e.message);
    }
  };

  // Skip first run of debounced search so tab-gated effect does the initial load only (avoids double blink)
  const usersSearchDebounceSkipped = useRef(true);
  const rolesSearchDebounceSkipped = useRef(true);

  // Load only the active tab's data (same pattern as Billing) to avoid double blink on mount
  // When on Users tab, also load roles so Role column can resolve role_id -> name
  useEffect(() => {
    if (tab === 1) loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, rolesPage, rolesRowsPerPage]);

  useEffect(() => {
    if (tab === 0) {
      loadUsers();
      loadRoles(); // roles needed for Role column in users table
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, usersPage, usersRowsPerPage]);

  // Auto-search (debounced): skip first run so we don't double-load on mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 0) return;
      if (usersSearchDebounceSkipped.current) {
        usersSearchDebounceSkipped.current = false;
        return;
      }
      if (usersPage !== 0) setUsersPage(0);
      else loadUsers();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, usersSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== 1) return;
      if (rolesSearchDebounceSkipped.current) {
        rolesSearchDebounceSkipped.current = false;
        return;
      }
      if (rolesPage !== 0) setRolesPage(0);
      else loadRoles();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, rolesSearch]);

  const openCreateRole = () => {
    setUsersSearchLocked(true);
    setRolesSearchLocked(true);
    setRoleForm({ name: "" });
    setRoleDialog({ open: true, mode: "create", id: null });
  };
  const openEditRole = (role) => {
    setUsersSearchLocked(true);
    setRolesSearchLocked(true);
    setRoleForm({ name: role.name || "" });
    setRoleDialog({ open: true, mode: "edit", id: role.id });
  };
  const openViewRole = async (role) => {
    if (!role?.id) return;
    setRoleView({ open: true, role });
    setRoleViewMenuKeys([]);
    setRoleViewMenuLoading(true);
    try {
      const data = await fetchJson(`${API.roles}/${role.id}/menu-items`, { token });
      setRoleViewMenuKeys(Array.isArray(data.data?.menuKeys) ? data.data.menuKeys : []);
    } catch {
      setRoleViewMenuKeys([]);
    } finally {
      setRoleViewMenuLoading(false);
    }
  };

  const openMenuItemsDialog = async (role) => {
    if (!role?.id || !requireTokenGuard()) return;
    setMenuItemsDialog({ open: true, role });
    setMenuItemsForm({ allMenuKeys: [], selectedKeys: [] });
    setMenuItemsLoading(true);
    try {
      const data = await fetchJson(`${API.roles}/${role.id}/menu-items`, { token });
      setMenuItemsForm({
        allMenuKeys: data.data?.allMenuKeys ?? [],
        selectedKeys: Array.isArray(data.data?.menuKeys) ? [...data.data.menuKeys] : [],
      });
    } catch (e) {
      showToast("error", e.message);
      setMenuItemsDialog({ open: false, role: null });
    } finally {
      setMenuItemsLoading(false);
    }
  };

  const toggleMenuKey = (key) => {
    setMenuItemsForm((prev) => {
      const set = new Set(prev.selectedKeys);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, selectedKeys: prev.allMenuKeys.filter((k) => set.has(k)) };
    });
  };

  const saveMenuItems = async () => {
    const { role } = menuItemsDialog;
    if (!role?.id || !requireTokenGuard()) return;
    setMenuItemsSaving(true);
    try {
      await fetchJson(`${API.roles}/${role.id}/menu-items`, {
        method: "PUT",
        token,
        body: { menuKeys: menuItemsForm.selectedKeys },
      });
      showToast("success", "Menu items updated.");
      setMenuItemsDialog({ open: false, role: null });
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setMenuItemsSaving(false);
    }
  };

  const saveRole = async () => {
    if (!requireTokenGuard()) return;
    if (!roleForm.name?.trim()) {
      showToast("error", "Role name is required");
      return;
    }
    try {
      if (roleDialog.mode === "create") {
        await fetchJson(API.roles, {
          method: "POST",
          token,
          body: { name: roleForm.name.trim() },
        });
        showToast("success", "Role created");
      } else {
        await fetchJson(`${API.roles}/${roleDialog.id}`, {
          method: "PUT",
          token,
          body: { name: roleForm.name.trim() },
        });
        showToast("success", "Role updated");
      }
      setRoleDialog({ open: false, mode: "create", id: null });
      await loadRoles();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const deleteRole = async (role) => {
    if (!requireTokenGuard()) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete role?",
      html: `You are about to delete <b>${role.name}</b>. This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.roles}/${role.id}`, { method: "DELETE", token });
      showToast("success", "Role deleted");
      await loadRoles();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const openCreateUser = () => {
    setUsersSearchLocked(true);
    setRolesSearchLocked(true);
    setUserForm({
      full_name: "",
      email: "",
      phone: "",
      profile_image_file: null,
      profile_image_preview: "",
      password: "",
      confirm_password: "",
      role_id: defaultRegularRoleId || "",
      status: "active",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPhoneError("");
    setConfirmTouched(false);
    setUserDialog({ open: true, mode: "create", id: null });
  };

  const openEditUser = (user) => {
    setUsersSearchLocked(true);
    setRolesSearchLocked(true);
    setUserForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      profile_image_file: null,
      profile_image_preview: buildImageUrl(user.profile_image_path),
      password: "",
      confirm_password: "",
      role_id: user.role_id || "",
      status: user.status || "active",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPhoneError("");
    setConfirmTouched(false);
    setUserDialog({ open: true, mode: "edit", id: user.id });
  };

  const closeUserDialog = () => {
    setUserForm((p) => {
      if (p.profile_image_preview && p.profile_image_file) {
        URL.revokeObjectURL(p.profile_image_preview);
      }
      return { ...p, profile_image_file: null, profile_image_preview: "" };
    });
    setUserDialog({ open: false, mode: "create", id: null });
  };
  const openViewUser = (user) => setUserView({ open: true, user });

  const saveUser = async () => {
    if (!requireTokenGuard()) return;
    const normalizedPhone = normalizeKenyanPhone(userForm.phone);
    if (normalizedPhone.error) {
      setPhoneError(normalizedPhone.error);
      showToast("error", normalizedPhone.error);
      return;
    }
    if (userForm.password) {
      if (!userForm.confirm_password) {
        setConfirmTouched(true);
        showToast("error", "Please confirm the password");
        return;
      }
      if (userForm.password !== userForm.confirm_password) {
        setConfirmTouched(true);
        showToast("error", "Passwords do not match");
        return;
      }
    }
    const payload = {
      full_name: userForm.full_name?.trim(),
      email: userForm.email?.trim(),
      phone: normalizedPhone.value,
      status: userForm.status,
      role_id: userForm.role_id || null,
      ...(userForm.password
        ? {
            password: userForm.password,
            confirm_password: userForm.confirm_password,
          }
        : {}),
    };

    if (!payload.full_name || !payload.email) {
      showToast("error", "Full name and email are required");
      return;
    }

    try {
      if (userDialog.mode === "create") {
        if (!userForm.password) {
          showToast("error", "Password is required when creating a user");
          return;
        }
        const createdRes = await fetchJson(API.users, {
          method: "POST",
          token,
          body: payload,
        });
        const createdUserId = createdRes?.data?.id;
        if (createdUserId && userForm.profile_image_file) {
          await uploadFile(`${API.users}/${createdUserId}/profile-image`, {
            token,
            fieldName: "profile_image",
            file: userForm.profile_image_file,
          });
        }
        showToast("success", "User created");
      } else {
        await fetchJson(`${API.users}/${userDialog.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        if (userForm.profile_image_file) {
          await uploadFile(`${API.users}/${userDialog.id}/profile-image`, {
            token,
            fieldName: "profile_image",
            file: userForm.profile_image_file,
          });
        }
        showToast("success", "User updated");
      }
      setUserDialog({ open: false, mode: "create", id: null });
      await loadUsers();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const deactivateUser = async (user) => {
    if (!requireTokenGuard()) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Deactivate user?",
      html: `Deactivate <b>${user.full_name}</b>? They will not be able to log in until reactivated.`,
      showCancelButton: true,
      confirmButtonText: "Yes, deactivate",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.warning.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.users}/${user.id}/deactivate`, {
        method: "PATCH",
        token,
      });
      showToast("success", "User deactivated");
      await loadUsers();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const deleteUser = async (user) => {
    if (!requireTokenGuard()) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete user?",
      html: `You are about to delete <b>${user.full_name}</b>. This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[600],
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await fetchJson(`${API.users}/${user.id}`, { method: "DELETE", token });
      showToast("success", "User deleted");
      await loadUsers();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const heroGradient = useMemo(() => {
    const main = theme.palette.primary.main;
    const dark = theme.palette.primary.dark || "#00695C";
    return `linear-gradient(135deg, ${dark} 0%, ${main} 100%)`;
  }, [theme.palette.primary.dark, theme.palette.primary.main]);

  const passwordProvided = Boolean(userForm.password);
  const confirmProvided = Boolean(userForm.confirm_password);
  const confirmRequiredNow =
    userDialog.open && (userDialog.mode === "create" || passwordProvided);
  const passwordMismatch =
    passwordProvided &&
    confirmProvided &&
    userForm.password !== userForm.confirm_password;
  const confirmMissing =
    confirmRequiredNow && passwordProvided && !confirmProvided;
  const disableUserSave =
    (userDialog.mode === "create" && !passwordProvided) ||
    (passwordProvided && (confirmMissing || passwordMismatch)) ||
    Boolean(phoneError);

  return (
    <Box sx={{ width: "100%" }}>
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, md: 3 },
            color: "white",
            background: heroGradient,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <ShieldIcon />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Admin Users Management
                </Typography>
              </Stack>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                Manage system users and their roles.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={tab === 0 ? openCreateUser : openCreateRole}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.25)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  {tab === 0 ? "New User" : "New Role"}
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
        <CardContent sx={{ p: 0, pt: { xs: 2, sm: 0 } }}>
          <Box sx={{ display: { xs: "block", sm: "none" }, mt: 3, px: 2, pb: 1.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="users-section-label">Section</InputLabel>
              <Select
                labelId="users-section-label"
                value={tab}
                label="Section"
                onChange={(e) => setTab(Number(e.target.value))}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value={0}>Users</MenuItem>
                <MenuItem value={1}>Roles</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              display: { xs: "none", sm: "flex" },
              px: 2,
              "& .MuiTabs-indicator": {
                backgroundColor: theme.palette.primary.main,
              },
            }}
          >
            <Tab icon={<PersonIcon />} iconPosition="start" label="Users" />
            <Tab icon={<ShieldIcon />} iconPosition="start" label="Roles" />
          </Tabs>
          <Divider />

          {/* USERS TAB */}
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              {usersForbidden && !usersLoading && users.length === 0 && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={tryBootstrapPromote}
                    >
                      Bootstrap promote me
                    </Button>
                  }
                >
                  Your account is not an <b>admin</b>, so the API blocks access
                  to Users/Roles. If this is a fresh system with no admin yet,
                  use “Bootstrap promote me” once.
                </Alert>
              )}
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  placeholder="Search users (name, email)…"
                  size="small"
                  fullWidth
                  name="users_search"
                  type="search"
                  autoComplete="off"
                  onFocus={() => setUsersSearchLocked(false)}
                  onClick={() => setUsersSearchLocked(false)}
                  InputProps={{ readOnly: usersSearchLocked }}
                  inputProps={{
                    autoComplete: "off",
                    autoCorrect: "off",
                    autoCapitalize: "off",
                    "data-lpignore": "true", // LastPass
                    "data-1p-ignore": "true", // 1Password
                  }}
                />
              </Stack>
              <TableContainer
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflowX: "auto",
                  maxWidth: "100%",
                }}
              >
                <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                        No
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 72, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 72 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                        Photo
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, maxWidth: { xs: "28vw", sm: 160, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 180 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 100 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 90 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 2 }}
                          >
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Loading users…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : users.length ? (
                      users.map((u, idx) => (
                        <TableRow
                          key={u.id}
                          hover
                          onClick={(e) => {
                            if (e.target.closest("[data-actions-cell]")) return;
                            openViewUser(u);
                          }}
                          sx={{ cursor: { xs: "pointer", sm: "default" } }}
                        >
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {usersPage * usersRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                            <Avatar
                              src={buildImageUrl(u.profile_image_path)}
                              alt={u.full_name}
                              sx={{
                                width: 34,
                                height: 34,
                                bgcolor: "rgba(0, 137, 123, 0.12)",
                                color: theme.palette.primary.dark,
                                fontWeight: 900,
                              }}
                            >
                              {(u.full_name || "U")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </Avatar>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, maxWidth: { xs: "28vw", sm: 160, md: 220 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                            {u.full_name}
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" }, maxWidth: { md: 180 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>{u.email}</TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                            <Chip
                              size="small"
                              label={displayRoleName(
                                rolesById.get(u.role_id)?.name,
                              )}
                              sx={{
                                fontWeight: 700,
                                bgcolor: "rgba(0, 137, 123, 0.10)",
                                color: theme.palette.primary.dark,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                            <Chip
                              size="small"
                              label={u.status}
                              color={
                                u.status === "active" ? "success" : "default"
                              }
                              variant={
                                u.status === "active" ? "filled" : "outlined"
                              }
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }} data-actions-cell onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 0.5, justifyContent: "flex-end", maxWidth: "100%" }}>
                              {isAdmin && (
                                <>
                                  <Tooltip title="Edit">
                                    <IconButton
                                      onClick={() => openEditUser(u)}
                                      size="small"
                                    >
                                      <EditIcon fontSize="inherit" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Deactivate">
                                    <IconButton
                                      onClick={() => deactivateUser(u)}
                                      size="small"
                                      disabled={u.status !== "active"}
                                      sx={{ display: { xs: "none", sm: "inline-flex" } }}
                                      aria-label="Deactivate"
                                    >
                                      <BlockIcon fontSize="inherit" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      onClick={() => deleteUser(u)}
                                      size="small"
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="inherit" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No users found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={usersTotal}
                page={usersPage}
                onPageChange={(_, p) => setUsersPage(p)}
                rowsPerPage={usersRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setUsersRowsPerPage(parseInt(e.target.value, 10));
                  setUsersPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{
                  width: "100%",
                  overflow: "hidden",
                  "& .MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 0.5, px: { xs: 1, sm: 2 }, minHeight: 52 },
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
                  "& .MuiTablePagination-select": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
                }}
              />
            </Box>
          )}

          {/* ROLES TAB */}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              {rolesForbidden && !rolesLoading && roles.length === 0 && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={tryBootstrapPromote}
                    >
                      Bootstrap promote me
                    </Button>
                  }
                >
                  Your account is not an <b>admin</b>, so the API blocks access
                  to Users/Roles. If this is a fresh system with no admin yet,
                  use “Bootstrap promote me” once.
                </Alert>
              )}
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  value={rolesSearch}
                  onChange={(e) => setRolesSearch(e.target.value)}
                  placeholder="Search roles…"
                  size="small"
                  fullWidth
                  name="roles_search"
                  type="search"
                  autoComplete="off"
                  onFocus={() => setRolesSearchLocked(false)}
                  onClick={() => setRolesSearchLocked(false)}
                  InputProps={{ readOnly: rolesSearchLocked }}
                  inputProps={{
                    autoComplete: "off",
                    autoCorrect: "off",
                    autoCapitalize: "off",
                    "data-lpignore": "true",
                    "data-1p-ignore": "true",
                  }}
                />
              </Stack>
              <TableContainer
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflowX: "auto",
                  maxWidth: "100%",
                }}
              >
                <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0, 137, 123, 0.06)" }}>
                      <TableCell sx={{ fontWeight: 800, width: 64, maxWidth: { xs: "16vw", sm: 64 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                        No
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, maxWidth: { xs: "28vw", sm: 200, md: 280 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" }, maxWidth: { md: 140 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>Created</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, maxWidth: { xs: "22vw", sm: 120 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rolesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 2 }}
                          >
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Loading roles…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : roles.length ? (
                      roles.map((r, idx) => (
                        <TableRow
                          key={r.id}
                          hover
                          onClick={(e) => {
                            if (e.target.closest("[data-actions-cell]")) return;
                            openViewRole(r);
                          }}
                          sx={{ cursor: { xs: "pointer", sm: "default" } }}
                        >
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: 700 }}
                          >
                            {rolesPage * rolesRowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, maxWidth: { xs: "28vw", sm: 200, md: 280 }, minWidth: 0, overflow: { xs: "hidden", md: "visible" }, textOverflow: { xs: "ellipsis", md: "clip" }, whiteSpace: { xs: "nowrap", md: "normal" } }}>
                            {r.name}
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{formatDateTime(r.createdAt)}</TableCell>
                          <TableCell align="right" sx={{ overflow: "hidden", minWidth: 96 }} data-actions-cell onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 0.5, justifyContent: "flex-end", maxWidth: "100%" }}>
                              <Tooltip title="View">
                                <IconButton
                                  onClick={() => openViewRole(r)}
                                  size="small"
                                  sx={{ display: { xs: "none", sm: "inline-flex" } }}
                                >
                                  <VisibilityIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <>
                                  <Tooltip title="Navbar menu items">
                                    <IconButton
                                      onClick={(e) => { e.stopPropagation(); openMenuItemsDialog(r); }}
                                      size="small"
                                      aria-label="Menu items"
                                      sx={{ display: { xs: "none", sm: "inline-flex" } }}
                                    >
                                      <ListIcon fontSize="inherit" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Edit">
                                    <IconButton
                                      onClick={(e) => { e.stopPropagation(); openEditRole(r); }}
                                      size="small"
                                    >
                                      <EditIcon fontSize="inherit" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      onClick={(e) => { e.stopPropagation(); deleteRole(r); }}
                                      size="small"
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="inherit" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography sx={{ py: 2 }} color="text.secondary">
                            No roles found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={rolesTotal}
                page={rolesPage}
                onPageChange={(_, p) => setRolesPage(p)}
                rowsPerPage={rolesRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRolesRowsPerPage(parseInt(e.target.value, 10));
                  setRolesPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{
                  width: "100%",
                  overflow: "hidden",
                  "& .MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 0.5, px: { xs: 1, sm: 2 }, minHeight: 52 },
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
                  "& .MuiTablePagination-select": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ROLE DIALOG */}
      <Dialog
        open={roleDialog.open}
        onClose={() => setRoleDialog({ open: false, mode: "create", id: null })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {roleDialog.mode === "create" ? "Create Role" : "Edit Role"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Role name"
            fullWidth
            value={roleForm.name}
            onChange={(e) =>
              setRoleForm((p) => ({ ...p, name: e.target.value }))
            }
          />
          <Typography variant="caption" color="text.secondary">
            For system users, recommended roles are: admin, user
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setRoleDialog({ open: false, mode: "create", id: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveRole}
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ROLE VIEW */}
      <Dialog
        open={roleView.open}
        onClose={() => setRoleView({ open: false, role: null })}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 2, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            fontSize: "1.25rem",
            pb: 0,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ShieldIcon color="primary" sx={{ fontSize: 28 }} />
          Role details
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, fontWeight: 600 }}>
                Role name
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", mt: 0.25 }}>
                {roleView.role?.name || "—"}
              </Typography>
            </Box>
            <Divider sx={{ borderColor: "divider" }} />
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, fontWeight: 600 }}>
                Navbar menu items
              </Typography>
              {roleViewMenuLoading ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </Stack>
              ) : normalizeRoleName(roleView.role?.name) === "admin" ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Admin sees all sidebar items.
                </Typography>
              ) : roleViewMenuKeys.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  No menu items assigned. Users with this role will not see any sidebar links.
                </Typography>
              ) : (
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  useFlexGap
                  gap={0.75}
                  sx={{ mt: 1 }}
                >
                  {roleViewMenuKeys.map((key) => (
                    <Chip
                      key={key}
                      label={MENU_KEY_LABELS[key] || key}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        bgcolor: "rgba(0, 137, 123, 0.08)",
                        color: "primary.dark",
                        border: "1px solid",
                        borderColor: "primary.light",
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Created {formatDateTime(roleView.role?.createdAt)}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          {isAdmin && roleView.role && normalizeRoleName(roleView.role.name) !== "admin" && (
            <Button
              startIcon={<ListIcon />}
              onClick={() => {
                setRoleView({ open: false, role: null });
                openMenuItemsDialog(roleView.role);
              }}
              sx={{ mr: "auto", display: { xs: "none", sm: "inline-flex" } }}
            >
              Edit menu items
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => setRoleView({ open: false, role: null })}
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ROLE MENU ITEMS DIALOG */}
      <Dialog
        open={menuItemsDialog.open}
        onClose={() => setMenuItemsDialog({ open: false, role: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Navbar menu items — {menuItemsDialog.role?.name || "Role"}
        </DialogTitle>
        <DialogContent>
          {menuItemsLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading…</Typography>
            </Stack>
          ) : normalizeRoleName(menuItemsDialog.role?.name) === "admin" ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              Admin always sees all navbar items. No need to configure.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Select which sidebar menu items users with this role can see.
              </Typography>
              <FormGroup sx={{ mt: 0.5 }}>
                {menuItemsForm.allMenuKeys.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={menuItemsForm.selectedKeys.includes(key)}
                        onChange={() => toggleMenuKey(key)}
                        size="small"
                      />
                    }
                    label={MENU_KEY_LABELS[key] || key}
                  />
                ))}
              </FormGroup>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuItemsDialog({ open: false, role: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveMenuItems}
            disabled={
              menuItemsSaving ||
              menuItemsLoading ||
              normalizeRoleName(menuItemsDialog.role?.name) === "admin"
            }
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            {menuItemsSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* USER DIALOG */}
      <Dialog
        open={userDialog.open}
        onClose={closeUserDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {userDialog.mode === "create" ? "Create User" : "Edit User"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ md: "center" }}
            >
              <Avatar
                src={userForm.profile_image_preview}
                alt={userForm.full_name}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "rgba(0, 137, 123, 0.12)",
                  color: theme.palette.primary.dark,
                  fontWeight: 900,
                }}
              >
                {(userForm.full_name || "U").trim().charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  sx={{
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                  }}
                >
                  Upload profile photo
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setUserForm((p) => {
                        if (p.profile_image_preview && p.profile_image_file) {
                          URL.revokeObjectURL(p.profile_image_preview);
                        }
                        return {
                          ...p,
                          profile_image_file: file,
                          profile_image_preview: url,
                        };
                      });
                    }}
                  />
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  JPG/PNG/WebP recommended.
                </Typography>
              </Box>
            </Stack>
            <TextField
              label="Full name"
              fullWidth
              value={userForm.full_name}
              onChange={(e) =>
                setUserForm((p) => ({ ...p, full_name: e.target.value }))
              }
            />
            <TextField
              label="Phone"
              fullWidth
              placeholder="+2547XXXXXXXX"
              value={userForm.phone}
              onChange={(e) => {
                setPhoneError("");
                setUserForm((p) => ({ ...p, phone: e.target.value }));
              }}
              onBlur={() => {
                const n = normalizeKenyanPhone(userForm.phone);
                setPhoneError(n.error || "");
                if (!n.error && n.value)
                  setUserForm((p) => ({ ...p, phone: n.value }));
                if (!n.value) setUserForm((p) => ({ ...p, phone: "" }));
              }}
              error={Boolean(phoneError)}
              helperText={
                phoneError ||
                'Kenya format only. We will save it as "+254XXXXXXXXX".'
              }
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={userForm.email}
              onChange={(e) =>
                setUserForm((p) => ({ ...p, email: e.target.value }))
              }
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={userForm.role_id}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, role_id: e.target.value }))
                  }
                >
                  <MenuItem value="">
                    <em>Default (Regular user)</em>
                  </MenuItem>
                  {userAssignableRoles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {displayRoleName(r.name)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={userForm.status}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="inactive">inactive</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label={
                userDialog.mode === "create"
                  ? "Password"
                  : "New password (optional)"
              }
              type={showPassword ? "text" : "password"}
              fullWidth
              value={userForm.password}
              onChange={(e) =>
                setUserForm((p) => ({
                  ...p,
                  password: e.target.value,
                  // If user clears password on edit, clear confirm too
                  ...(e.target.value ? {} : { confirm_password: "" }),
                }))
              }
              helperText={
                userDialog.mode === "edit"
                  ? "Leave blank to keep existing password."
                  : ""
              }
              error={Boolean(confirmTouched) && Boolean(passwordMismatch)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {(userDialog.mode === "create" || Boolean(userForm.password)) && (
              <TextField
                label="Confirm password"
                type={showConfirmPassword ? "text" : "password"}
                fullWidth
                value={userForm.confirm_password}
                onChange={(e) => {
                  setConfirmTouched(true);
                  setUserForm((p) => ({
                    ...p,
                    confirm_password: e.target.value,
                  }));
                }}
                onBlur={() => setConfirmTouched(true)}
                error={
                  Boolean(confirmTouched) &&
                  (confirmMissing || passwordMismatch)
                }
                helperText={
                  !confirmTouched
                    ? ""
                    : confirmMissing
                      ? "Please confirm the password"
                      : passwordMismatch
                        ? "Passwords do not match"
                        : "Passwords match"
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        edge="end"
                        aria-label="toggle confirm password visibility"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {userDialog.open && userAssignableRoles.length === 0 && (
              <Alert severity="warning">
                No assignable user roles found. Create a role named <b>user</b>{" "}
                (Regular user) in the Roles tab.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUserDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveUser}
            disabled={disableUserSave}
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* USER VIEW */}
      <Dialog
        open={userView.open}
        onClose={() => setUserView({ open: false, user: null })}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>User Details</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={buildImageUrl(userView.user?.profile_image_path)}
                alt={userView.user?.full_name}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "rgba(0, 137, 123, 0.12)",
                  color: theme.palette.primary.dark,
                  fontWeight: 900,
                }}
              >
                {(userView.user?.full_name || "U")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
            </Stack>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Full name
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                  {userView.user?.full_name || "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  size="small"
                  label={userView.user?.status || "—"}
                  color={
                    userView.user?.status === "active" ? "success" : "default"
                  }
                  variant={
                    userView.user?.status === "active" ? "filled" : "outlined"
                  }
                />
              </Box>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Email
                </Typography>
                <Typography>{userView.user?.email || "—"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Phone
                </Typography>
                <Typography>{userView.user?.phone || "—"}</Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Role
                </Typography>
                <Typography>
                  {displayRoleName(rolesById.get(userView.user?.role_id)?.name)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Last login
                </Typography>
                <Typography>
                  {formatDateTime(userView.user?.last_login)}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Box>
              <Typography variant="overline" color="text.secondary">
                Created
              </Typography>
              <Typography>
                {formatDateTime(userView.user?.createdAt)}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserView({ open: false, user: null })}>
            Close
          </Button>
          {isAdmin && (
            <Button
              variant="contained"
              onClick={() => {
                setUserView({ open: false, user: null });
                if (userView.user) openEditUser(userView.user);
              }}
              sx={{
                bgcolor: theme.palette.primary.main,
                "&:hover": { bgcolor: theme.palette.primary.dark },
              }}
            >
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
