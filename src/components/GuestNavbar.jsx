import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  PersonAdd as RegisterIcon,
  Login as LoginIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

const primaryTeal = "#00897B";
const primaryTealDark = "#00695C";

const navLinkSx = (onWhitePage, active) => ({
  color: onWhitePage
    ? active
      ? primaryTealDark
      : primaryTeal
    : active
      ? "white"
      : "rgba(255,255,255,0.95)",
  fontWeight: active ? 700 : 600,
  minWidth: 0,
  ...(!onWhitePage && !active && { textShadow: "0 1px 4px rgba(0,0,0,0.3)" }),
  "&:hover": {
    bgcolor: onWhitePage ? "rgba(0,137,123,0.08)" : "rgba(255,255,255,0.15)",
    color: onWhitePage ? primaryTealDark : "white",
  },
});

/**
 * Transparent header navbar shown only on pre-login routes (/, /register, /about, /terms, /privacy, /refund-cancellation).
 * Far left: logo (favicon). Center: Home, About us, Terms of Service, Privacy Policy. Right: Register.
 */
export default function GuestNavbar() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === "/";
  const isAbout = location.pathname === "/about";
  const isTerms = location.pathname === "/terms";
  const isPrivacy = location.pathname === "/privacy";
  const isRefund = location.pathname === "/refund-cancellation";
  const isTestimonials = location.pathname === "/testimonials";
  const isRegister = location.pathname === "/register";
  const isLogin = location.pathname === "/";
  const onWhitePage = !isHome; // register, about, terms, privacy, refund have white background

  const handleLoginClick = () => {
    if (isLogin) {
      window.dispatchEvent(new CustomEvent("open-login-dialog"));
    } else {
      navigate("/");
    }
  };

  // On About, Terms, Privacy, Refund, and Register use sticky so navbar stays inside scroll container and doesn't overlap scrollbar.
  const position =
    isAbout || isTerms || isPrivacy || isRefund || isTestimonials || isRegister ? "sticky" : onWhitePage ? "fixed" : "absolute";

  return (
    <>
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
          overflow: "visible",
          background: isAbout || isTerms || isPrivacy || isRefund || isTestimonials
            ? "#ffffff"
            : onWhitePage
              ? "background.paper"
              : "transparent",
          backdropFilter: "none",
          boxShadow: onWhitePage ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          ...(onWhitePage && {
            borderBottom: "1px solid",
            borderColor: "divider",
          }),
        }}
      >
        {/* Far left: logo (favicon) — always */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            minWidth: 0,
          }}
        >
          <IconButton
            onClick={() => navigate("/")}
            sx={{
              p: 0.5,
              "&:hover": {
                bgcolor: onWhitePage
                  ? "rgba(0,137,123,0.08)"
                  : "rgba(255,255,255,0.15)",
              },
            }}
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

        {/* Desktop navigation */}
        {!isSmallScreen && (
          <>
            {isHome ? (
              /* Login (home) page: Home + About us in center, Login + Register on the right */
              <>
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
                  <Button
                    size="small"
                    onClick={() => navigate("/")}
                    sx={navLinkSx(onWhitePage, isHome)}
                  >
                    Home
                  </Button>
                  <Button
                    size="small"
                    onClick={() => navigate("/about")}
                    sx={navLinkSx(onWhitePage, isAbout)}
                  >
                    About us
                  </Button>
                  <Button
                    size="small"
                    onClick={() => navigate("/testimonials")}
                    sx={navLinkSx(onWhitePage, isTestimonials)}
                  >
                    Testimonials
                  </Button>
                  <Button
                    size="small"
                    onClick={() => navigate("/terms")}
                    sx={navLinkSx(onWhitePage, isTerms)}
                  >
                    Terms of Service
                  </Button>
                  <Button
                    size="small"
                    onClick={() => navigate("/privacy")}
                    sx={navLinkSx(onWhitePage, isPrivacy)}
                  >
                    Privacy Policy
                  </Button>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 1,
                    minWidth: 0,
                  }}
                >
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
                </Box>
              </>
            ) : (
              /* Register + About: Home + About us on the far right */
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 0.5,
                  minWidth: 0,
                }}
              >
                <Button
                  size="small"
                  onClick={() => navigate("/")}
                  sx={navLinkSx(onWhitePage, isHome)}
                >
                  Home
                </Button>
                <Button
                  size="small"
                  onClick={() => navigate("/about")}
                  sx={navLinkSx(onWhitePage, isAbout)}
                >
                  About us
                </Button>
                <Button
                  size="small"
                  onClick={() => navigate("/testimonials")}
                  sx={navLinkSx(onWhitePage, isTestimonials)}
                >
                  Testimonials
                </Button>
                <Button
                  size="small"
                  onClick={() => navigate("/terms")}
                  sx={navLinkSx(onWhitePage, isTerms)}
                >
                  Terms of Service
                </Button>
                <Button
                  size="small"
                  onClick={() => navigate("/privacy")}
                  sx={navLinkSx(onWhitePage, isPrivacy)}
                >
                  Privacy Policy
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Mobile: hamburger menu on the right */}
        {isSmallScreen && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              minWidth: 0,
            }}
          >
            <IconButton
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={
                mobileOpen ? "Close navigation menu" : "Open navigation menu"
              }
              sx={{
                color: primaryTeal,
                borderRadius: 2,
                border: "1px solid",
                borderColor: primaryTeal,
                bgcolor: "rgba(255,255,255,0.9)",
                "&:hover": {
                  borderColor: primaryTealDark,
                  bgcolor: "white",
                  color: primaryTealDark,
                },
                transition:
                  "transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease",
                transform: mobileOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        )}

        {/* Mobile dropdown card below header */}
        {isSmallScreen && mobileOpen && (
          <Box
            sx={{
              position: "absolute",
              top: "100%",
              right: 8,
              mt: 1,
              bgcolor: "#ffffff",
              borderRadius: 2,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              border: "1px solid",
              borderColor: "divider",
              zIndex: 1200,
              width: "auto",
              minWidth: 220,
              maxWidth: "90vw",
            }}
          >
            <Divider sx={{ mt: 0.5, mb: 0.5 }} />
            <List dense>
              <ListItemButton
                onClick={() => {
                  navigate("/");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Home" />
              </ListItemButton>
              <ListItemButton
                onClick={() => {
                  navigate("/about");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="About us" />
              </ListItemButton>
              <ListItemButton
                onClick={() => {
                  navigate("/testimonials");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Testimonials" />
              </ListItemButton>
              <ListItemButton
                onClick={() => {
                  navigate("/terms");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Terms of Service" />
              </ListItemButton>
              <ListItemButton
                onClick={() => {
                  navigate("/privacy");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Privacy Policy" />
              </ListItemButton>
              {isHome && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <ListItemButton
                    onClick={() => {
                      handleLoginClick();
                      setMobileOpen(false);
                    }}
                  >
                    <ListItemText primary="Login" />
                  </ListItemButton>
                  <ListItemButton
                    onClick={() => {
                      navigate("/register");
                      setMobileOpen(false);
                    }}
                  >
                    <ListItemText primary="Register" />
                  </ListItemButton>
                </>
              )}
            </List>
          </Box>
        )}
      </Box>
    </>
  );
}
