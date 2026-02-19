import React, { useEffect, useState } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  CircularProgress,
  Avatar,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Person as PersonIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import UserAccount from "./userAccount";
import { useNavigate } from "react-router-dom";

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
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function Header(props) {
  const [currentUser, setCurrentUser] = useState("");
  const [currentRoleName, setCurrentRoleName] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [toggleAccount, setToggleAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        const userId = JSON.parse(savedUser)?.id;
        if (!userId) {
          setLoading(false);
          return;
        }

        const uRes = await fetchJson(`/api/users/${userId}`);
        const freshUser = uRes?.data || null;
        if (freshUser) {
          setCurrentUser(freshUser);
          props.setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }

        const roleId = freshUser?.role_id;
        if (roleId) {
          const rRes = await fetchJson(`/api/roles/${roleId}`);
          const role = rRes?.data || null;
          const roleName = role?.name || "";
          setCurrentRoleName(roleName);
          localStorage.setItem("role", JSON.stringify(role ? { id: role.id, name: role.name } : null));
        } else {
          setCurrentRoleName("");
          localStorage.setItem("role", JSON.stringify(null));
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

  return (
    <>
      {loading && <LoadingScreen />}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          color: "white",
          width: "100%",
        }}
      >
        <IconButton
          aria-label="open drawer"
          onClick={props.handleDrawerOpen}
          edge="start"
          sx={{
            color: "white",
            marginRight: 5,
            ...(props.open && { display: "none" }),
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}></Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="body1" sx={{ mr: 1 }}>
            {currentUser?.full_name}
          </Typography>

          {/* Profile Picture or Avatar */}
          <Box sx={{ mr: 1 }}>
            {currentUser?.profile_image_path ? (
              <Avatar
                src={buildImageUrl(currentUser.profile_image_path)}
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
              setToggleAccount(true);
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

        {currentUser && (
          <UserAccount
            onClose={() => {
              setToggleAccount(false);
            }}
            open={toggleAccount}
            currentUser={currentUser}
            roleName={currentRoleName}
          />
        )}
      </Box>
    </>
  );
}
