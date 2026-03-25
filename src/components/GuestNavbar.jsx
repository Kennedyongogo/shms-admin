import { useState, useRef, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
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
/** Solid fill for Login / Register — no teal outline, single flat color */
const authFill = "#FFF8E7";
const authFillHover = "#FFF3D6";

const authButtonSx = {
  color: primaryTeal,
  bgcolor: authFill,
  border: "none",
  boxShadow: "none",
  fontWeight: 700,
  textTransform: "none",
  px: 2,
  py: 0.75,
  borderRadius: 1,
  "& .MuiSvgIcon-root": { color: primaryTeal },
  "&:hover": {
    bgcolor: authFillHover,
    color: primaryTealDark,
    boxShadow: "none",
    border: "none",
    "& .MuiSvgIcon-root": { color: primaryTealDark },
  },
  "&.Mui-focusVisible": {
    outline: "none",
    boxShadow: "0 0 0 2px rgba(237, 228, 211, 0.95)",
  },
};

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
  bgcolor: "transparent",
  ...(!onWhitePage && !active && { textShadow: "0 1px 4px rgba(0,0,0,0.3)" }),
  "&:hover": {
    bgcolor: "transparent",
    color: onWhitePage ? primaryTealDark : "white",
  },
});

/**
 * Transparent header navbar shown only on pre-login routes (/, /register, /about, /terms, /privacy, /refund-cancellation).
 * Far left: logo (favicon). Center: nav links. Right (home): Login & Register (solid fill, no outline).
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

  const handleOurServicesClick = () => {
    if (isHome) {
      document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#services");
    }
  };

  const activeNavKey = isHome ? "home" : isTestimonials ? "testimonials" : isTerms ? "terms" : isPrivacy ? "privacy" : "home";
  const [hoveredNavKey, setHoveredNavKey] = useState(null);
  const navItemRefs = useRef({});
  const [lineStyle, setLineStyle] = useState({ left: 0, width: 0 });
  const currentLineTarget = hoveredNavKey ?? activeNavKey;

  useLayoutEffect(() => {
    const el = navItemRefs.current[currentLineTarget];
    if (el) {
      setLineStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [currentLineTarget, isHome]);

  const navItems = [
    { key: "home", label: "Home", onClick: () => navigate("/"), isActive: isHome },
    { key: "our-services", label: "Our services", onClick: handleOurServicesClick, isActive: false },
    { key: "testimonials", label: "Testimonials", onClick: () => navigate("/testimonials"), isActive: isTestimonials },
    { key: "terms", label: "Terms of Service", onClick: () => navigate("/terms"), isActive: isTerms },
    { key: "privacy", label: "Privacy Policy", onClick: () => navigate("/privacy"), isActive: isPrivacy },
  ];

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
                  <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 0.5 }}>
                    {navItems.map(({ key, label, onClick, isActive }) => (
                      <Box
                        key={key}
                        ref={(el) => (navItemRefs.current[key] = el)}
                        onMouseEnter={() => setHoveredNavKey(key)}
                        onMouseLeave={() => setHoveredNavKey(null)}
                      >
                        <Button
                          size="small"
                          onClick={onClick}
                          sx={navLinkSx(onWhitePage, isActive)}
                        >
                          {label}
                        </Button>
                      </Box>
                    ))}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        height: 3,
                        width: lineStyle.width,
                        bgcolor: primaryTeal,
                        borderRadius: "3px 3px 0 0",
                        transform: `translateX(${lineStyle.left}px)`,
                        transition: "transform 0.25s ease, width 0.25s ease",
                      }}
                    />
                  </Box>
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
                    variant="contained"
                    color="inherit"
                    disableElevation
                    disableRipple
                    startIcon={<LoginIcon />}
                    onClick={handleLoginClick}
                    sx={authButtonSx}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    color="inherit"
                    disableElevation
                    disableRipple
                    startIcon={<RegisterIcon />}
                    onClick={() => navigate("/register")}
                    sx={authButtonSx}
                  >
                    Register
                  </Button>
                </Box>
              </>
            ) : (
              /* Register + About: nav on the far right with line */
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
                <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 0.5 }}>
                  {navItems.map(({ key, label, onClick, isActive }) => (
                    <Box
                      key={key}
                      ref={(el) => (navItemRefs.current[key] = el)}
                      onMouseEnter={() => setHoveredNavKey(key)}
                      onMouseLeave={() => setHoveredNavKey(null)}
                    >
                      <Button
                        size="small"
                        onClick={onClick}
                        sx={navLinkSx(onWhitePage, isActive)}
                      >
                        {label}
                      </Button>
                    </Box>
                  ))}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      height: 3,
                      width: lineStyle.width,
                      bgcolor: primaryTeal,
                      borderRadius: "3px 3px 0 0",
                      transform: `translateX(${lineStyle.left}px)`,
                      transition: "transform 0.25s ease, width 0.25s ease",
                    }}
                  />
                </Box>
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
                  handleOurServicesClick();
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Our services" />
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
                    sx={{
                      bgcolor: authFill,
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      border: "none",
                      "&:hover": { bgcolor: authFillHover },
                    }}
                  >
                    <ListItemText
                      primary="Login"
                      primaryTypographyProps={{
                        sx: { color: primaryTeal, fontWeight: 700 },
                      }}
                    />
                  </ListItemButton>
                  <ListItemButton
                    onClick={() => {
                      navigate("/register");
                      setMobileOpen(false);
                    }}
                    sx={{
                      bgcolor: authFill,
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      border: "none",
                      "&:hover": { bgcolor: authFillHover },
                    }}
                  >
                    <ListItemText
                      primary="Register"
                      primaryTypographyProps={{
                        sx: { color: primaryTeal, fontWeight: 700 },
                      }}
                    />
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
