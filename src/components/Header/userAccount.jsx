import React from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Divider,
  Avatar,
  Chip,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import WorkIcon from "@mui/icons-material/Work";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LoginIcon from "@mui/icons-material/Login";
import { useTheme } from "@mui/material/styles";

// Helper to build URL for uploaded assets using Vite proxy
const buildImageUrl = (relativePath) => {
  if (!relativePath) return "";
  if (String(relativePath).startsWith("http")) return relativePath;
  if (String(relativePath).startsWith("uploads/")) return `/${relativePath}`;
  if (String(relativePath).startsWith("/uploads/")) return relativePath;
  return relativePath;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

export default function UserAccount({ open, onClose, currentUser, roleName }) {
  const theme = useTheme();
  const status = currentUser?.status || "—";
  const isActive = status === "active";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 10px 40px rgba(2, 132, 122, 0.18)",
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: "calc(100vh - 16px)", sm: "calc(100vh - 32px)" },
        },
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: "white",
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 2.25,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PersonIcon sx={{ position: "relative", zIndex: 1, fontSize: 22 }} />
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.1 }}>
            Account Details
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {currentUser?.full_name}
          </Typography>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "white",
            zIndex: 1,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ flexWrap: "wrap", gap: 1.5 }}
          >
            <Avatar
              src={buildImageUrl(currentUser?.profile_image_path)}
              alt={currentUser?.full_name}
              sx={{
                width: 46,
                height: 46,
                flexShrink: 0,
                bgcolor: "rgba(0, 137, 123, 0.12)",
                color: theme.palette.primary.dark,
                fontWeight: 900,
              }}
            >
              {(currentUser?.full_name || "U").trim().charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>
                {currentUser?.full_name || "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {currentUser?.email || "—"}
              </Typography>
            </Box>
            <Chip
              icon={isActive ? <CheckCircleIcon /> : <CancelIcon />}
              label={status}
              color={isActive ? "success" : "default"}
              variant={isActive ? "filled" : "outlined"}
              sx={{ fontWeight: 800, textTransform: "lowercase", flexShrink: 0 }}
            />
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PhoneIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {currentUser?.phone || "—"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <WorkIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Role
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {roleName || "—"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <LoginIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Last login
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {currentUser?.last_login ? formatDateTime(currentUser.last_login) : "Current session"}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
