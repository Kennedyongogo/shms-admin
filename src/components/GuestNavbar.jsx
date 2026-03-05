import { useNavigate, useLocation } from "react-router-dom";
import { Box, Button, IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import { PersonAdd as RegisterIcon, Login as LoginIcon } from "@mui/icons-material";

const primaryTeal = "#00897B";
const primaryTealDark = "#00695C";

const navLinkSx = (onWhitePage, active) => ({
  color: onWhitePage ? (active ? primaryTealDark : primaryTeal) : active ? "white" : "rgba(255,255,255,0.95)",
  fontWeight: active ? 700 : 600,
  minWidth: 0,
  ...(!onWhitePage && !active && { textShadow: "0 1px 4px rgba(0,0,0,0.3)" }),
  "&:hover": {
    bgcolor: onWhitePage ? "rgba(0,137,123,0.08)" : "rgba(255,255,255,0.15)",
    color: onWhitePage ? primaryTealDark : "white",
  },
});

/**
 * Transparent header navbar shown only on pre-login routes (/, /register, /about).
 * Far left: logo (favicon). Center: Home, About us. Right: Register.
 */
export default function GuestNavbar() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAbout = location.pathname === "/about";
  const isLogin = location.pathname === "/";
  const onWhitePage = !isHome; // register, about have white background

  const handleLoginClick = () => {
    if (isLogin) {
      window.dispatchEvent(new CustomEvent("open-login-dialog"));
    } else {
      navigate("/");
    }
  };

  // On About page use sticky so navbar stays inside scroll container and doesn't overlap scrollbar.
  const position = isAbout ? "sticky" : onWhitePage ? "fixed" : "absolute";

  return (
    <Box
      component="header"
      sx={{
        position,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 64,
        px: 2,
        py: 1,
        overflow: "hidden",
        background: onWhitePage ? "background.paper" : "transparent",
        backdropFilter: "none",
        boxShadow: onWhitePage ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
        ...(onWhitePage && {
          borderBottom: "1px solid",
          borderColor: "divider",
        }),
      }}
    >
      {/* Far left: logo (favicon) — always */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-start", minWidth: 0 }}>
        <IconButton
          onClick={() => navigate("/")}
          sx={{ p: 0.5, "&:hover": { bgcolor: onWhitePage ? "rgba(0,137,123,0.08)" : "rgba(255,255,255,0.15)" } }}
          aria-label="Home"
        >
          <Box
            component="img"
            src="/favicon.ico"
            alt="Carlvyne SHMS"
            sx={{ width: 36, height: 36, display: "block" }}
          />
        </IconButton>
      </Box>

      {isAbout ? (
        /* About page: Home + About us on the far right only */
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5, minWidth: 0 }}>
          <Button size="small" onClick={() => navigate("/")} sx={navLinkSx(true, isHome)}>
            Home
          </Button>
          <Button size="small" onClick={() => navigate("/about")} sx={navLinkSx(true, isAbout)}>
            About us
          </Button>
        </Box>
      ) : (
        <>
          {/* Center: Home, About us */}
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Button size="small" onClick={() => navigate("/")} sx={navLinkSx(onWhitePage, isHome)}>
              Home
            </Button>
            <Button size="small" onClick={() => navigate("/about")} sx={navLinkSx(onWhitePage, isAbout)}>
              About us
            </Button>
          </Box>

          {/* Right: Login, Register (only on login page) */}
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, minWidth: 0 }}>
        {isHome &&
          (isSmallScreen ? (
            <>
              <Tooltip title="Login" placement="left">
                <IconButton
                  onClick={handleLoginClick}
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
                  <LoginIcon />
                </IconButton>
              </Tooltip>
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
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<LoginIcon />}
                onClick={handleLoginClick}
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
                Login
              </Button>
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
            </>
          ))}
          </Box>
        </>
      )}
    </Box>
  );
}
