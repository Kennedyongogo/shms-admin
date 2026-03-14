import React, { useEffect, useState } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  CircularProgress,
  Avatar,
  Badge,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import {
  Menu as MenuIcon,
  ArrowDropDown as ArrowDropDownIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  NotificationsNone as NotificationsNoneIcon,
  DeleteOutline as DeleteOutlineIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getNotificationsSocket } from "../../notificationsSocket";

const LoadingScreen = () => (
  <Box
    sx={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 1)",
      zIndex: 1300, // Ensure it covers other components
    }}
  >
    <CircularProgress />
  </Box>
);

// Helper to build URL for uploaded assets using Vite proxy
const buildImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;

  // Use relative URLs - Vite proxy will handle routing to backend
  if (imageUrl.startsWith("uploads/")) return `/${imageUrl}`;
  if (imageUrl.startsWith("/uploads/")) return imageUrl;
  return imageUrl;
};

const getToken = () => localStorage.getItem("token");
const fetchJson = async (url) => {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Animated hamburger that morphs into X when open (for mobile menu)
const HamburgerToCloseIcon = ({ open, ...rest }) => (
  <Box
    aria-hidden
    sx={{
      width: 24,
      height: 24,
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      "& span": {
        display: "block",
        width: 22,
        height: 2,
        borderRadius: 1,
        backgroundColor: "currentColor",
        position: "absolute",
        transition: "transform 0.25s ease, opacity 0.2s ease",
      },
      "& span:nth-of-type(1)": {
        top: "6px",
        transform: open ? "translateY(6px) rotate(45deg)" : "none",
      },
      "& span:nth-of-type(2)": {
        top: "11px",
        opacity: open ? 0 : 1,
      },
      "& span:nth-of-type(3)": {
        top: "16px",
        transform: open ? "translateY(-6px) rotate(-45deg)" : "none",
      },
    }}
    {...rest}
  >
    <span />
    <span />
    <span />
  </Box>
);

export default function Header(props) {
  const [currentUser, setCurrentUser] = useState("");
  const [currentRoleName, setCurrentRoleName] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      const savedUser = localStorage.getItem("user");
      const token = getToken();

      if (!savedUser || !token) {
        window.location.href = "/";
        return;
      }

      // Show something immediately, then refresh from backend
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        props.setUser(userData);
      } catch {
        // ignore parse issues
      }

      try {
        const meRes = await fetchJson("/api/auth/me");
        const freshUser = meRes?.data?.user || null;
        const role = meRes?.data?.role || null;
        const menuItems = meRes?.data?.menuItems;
        const notificationsRes = await fetchJson(
          "/api/notifications/me?limit=50"
        );
        if (Array.isArray(notificationsRes?.data)) {
          setNotifications(notificationsRes.data);
        }

        if (freshUser) {
          setCurrentUser(freshUser);
          props.setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
        setCurrentRoleName(role?.name || "");
        localStorage.setItem(
          "role",
          JSON.stringify(role ? { id: role.id, name: role.name } : null),
        );
        if (Array.isArray(menuItems)) {
          localStorage.setItem("menuItems", JSON.stringify(menuItems));
        }
        const hospital = meRes?.data?.hospital;
        if (hospital) {
          localStorage.setItem("hospital", JSON.stringify(hospital));
        }
      } catch (e) {
        // If token expired/invalid, force login
        console.error("Header refresh error:", e);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  // Socket.IO: subscribe to real-time notifications
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = getNotificationsSocket();
    const handler = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on("notification_new", handler);

    return () => {
      socket.off("notification_new", handler);
    };
  }, []);

  // When Settings (or elsewhere) updates profile, refresh header user and image immediately
  useEffect(() => {
    const onUserUpdated = async (event) => {
      const passedUser = event?.detail?.user;
      if (passedUser) {
        setCurrentUser(passedUser);
        props.setUser(passedUser);
        try {
          localStorage.setItem("user", JSON.stringify(passedUser));
        } catch (_) {}
      }
      try {
        const meRes = await fetchJson("/api/auth/me");
        const freshUser = meRes?.data?.user || null;
        const role = meRes?.data?.role || null;
        const menuItems = meRes?.data?.menuItems;
        if (freshUser) {
          setCurrentUser(freshUser);
          props.setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
        if (role) setCurrentRoleName(role.name || "");
        if (Array.isArray(menuItems))
          localStorage.setItem("menuItems", JSON.stringify(menuItems));
        const hospital = meRes?.data?.hospital;
        if (hospital)
          localStorage.setItem("hospital", JSON.stringify(hospital));
      } catch (_) {}
    };
    window.addEventListener("user-updated", onUserUpdated);
    return () => window.removeEventListener("user-updated", onUserUpdated);
  }, [props]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
    fetch("/api/auth/logout", { method: "POST" });
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notifId) => {
    // Mark as read but keep in list so user can still see history
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)),
    );
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      // If API fails, we won't re-add it; it's a minor UX issue, not fatal
      console.error("Failed to mark notification as read:", e);
    }
  };

  const handleNotificationDelete = async (notifId) => {
    // Optimistically remove from local state
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/notifications/${notifId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      {loading && <LoadingScreen />}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 2,
          pr: 0,
          color: "white",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <IconButton
          aria-label={props.mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={props.handleDrawerOpen}
          edge="start"
          sx={{
            color: "white",
            marginRight: 5,
            ...(props.open && !isMobile && { display: "none" }),
          }}
        >
          {isMobile ? (
            <HamburgerToCloseIcon open={Boolean(props.mobileMenuOpen)} />
          ) : (
            <MenuIcon />
          )}
        </IconButton>

        <Box sx={{ flexGrow: 1 }}></Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ position: "relative", mr: 2 }}>
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
            >
              <Badge
                color="error"
                badgeContent={unreadCount || null}
                overlap="circular"
              >
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
            {isNotificationOpen && (
              <Box
                sx={{
                  position: "absolute",
                  top: "115%",
                  right: 0,
                  minWidth: 280,
                  bgcolor: "background.paper",
                  color: "text.primary",
                  boxShadow: 3,
                  borderRadius: 1,
                  p: 1.5,
                  zIndex: 1400,
                  maxHeight: 360,
                  overflowY: "auto",
                  [theme.breakpoints.down("sm")]: {
                    position: "fixed",
                    left: 8,
                    right: 8,
                    top: 56,
                    minWidth: 0,
                    maxWidth: "none",
                    maxHeight: "calc(100vh - 64px)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                    px: 0.5,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Notifications
                  </Typography>
                  {unreadCount > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {unreadCount} unread
                    </Typography>
                  )}
                </Box>
                {notifications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    You have no new notifications.
                  </Typography>
                ) : (
                  notifications.map((n) => (
                    <Box
                      key={n.id}
                      sx={{
                        mb: 0.75,
                        px: 0.75,
                        py: 0.5,
                        borderRadius: 1,
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                        "&:last-of-type": { mb: 0 },
                      }}
                      onClick={() => handleNotificationClick(n.id)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Box onClick={() => handleNotificationClick(n.id)}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: n.is_read ? 400 : 600,
                              mb: 0.25,
                            }}
                          >
                            {n.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {new Date(
                              n.createdAt || n.created_at,
                            ).toLocaleString()}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          edge="end"
                          color="inherit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationDelete(n.id);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Box>
          <Typography variant="body1" sx={{ mr: 1 }}>
            {currentUser?.full_name}
          </Typography>

          {/* Profile Picture or Avatar — cache-bust so new uploads show immediately */}
          <Box sx={{ mr: 1 }}>
            {currentUser?.profile_image_path ? (
              <Avatar
                key={currentUser.updatedAt || currentUser.profile_image_path}
                src={
                  buildImageUrl(currentUser.profile_image_path) +
                  (currentUser.updatedAt
                    ? `?t=${new Date(currentUser.updatedAt).getTime()}`
                    : "")
                }
                alt={currentUser?.full_name}
                sx={{
                  width: 32,
                  height: 32,
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                }}
              >
                {getInitials(currentUser?.full_name)}
              </Avatar>
            )}
          </Box>

          <IconButton color="inherit" onClick={handleClick}>
            <ArrowDropDownIcon />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem
            onClick={() => {
              try {
                const currentPath =
                  window.location.pathname + window.location.search;
                if (!currentPath.includes("/account")) {
                  sessionStorage.setItem("prevRouteBeforeAccount", currentPath);
                }
              } catch (_) {}
              navigate("/account");
              handleClose();
            }}
          >
            <AccountCircleIcon sx={{ mr: 1 }} /> Account
          </MenuItem>
          <MenuItem
            onClick={() => {
              logout();
              handleClose();
            }}
          >
            <LogoutIcon sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Box>
    </>
  );
}
