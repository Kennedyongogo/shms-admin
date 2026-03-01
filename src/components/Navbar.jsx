import React, { cloneElement, useEffect, useState } from "react";
import { Assessment, EventNote, History, Hotel, Inventory, LocalHospital, LocalPharmacy, Logout, PeopleAlt, PersonalInjury, ReceiptLong, RestaurantMenu, Science, Settings as SettingsIcon } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { styled, useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import { Box, Typography } from "@mui/material";
import Header from "./Header/Header";

const drawerWidth = 300;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1, 1, 1, 1.5),
  backgroundColor: "#fff",
  color: theme.palette.primary.main,
  minHeight: theme.mixins.toolbar.minHeight ?? 64,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxSizing: "border-box",
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  boxShadow: "0 4px 20px rgba(0, 137, 123, 0.25)",
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  overflowY: "hidden", // Disable vertical scrollbar
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

const Navbar = (props) => {
  const { user } = props; // Expecting user role from props
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [open, setOpen] = useState(() => {
    return window.innerWidth >= theme.breakpoints.values.md;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keys must match backend ALL_MENU_KEYS (constants/menuKeys.js)
  const adminItems = [
    { key: "dashboard", text: "Dashboard", icon: <Assessment />, path: "/dashboard" },
    { key: "hospitals", text: "Hospital", icon: <LocalHospital />, path: "/hospitals" },
    { key: "appointments", text: "Appointments", icon: <EventNote />, path: "/appointments" },
    { key: "patients", text: "Patients", icon: <PersonalInjury />, path: "/patients" },
    { key: "laboratory", text: "Laboratory", icon: <Science />, path: "/laboratory" },
    { key: "pharmacy", text: "Pharmacy", icon: <LocalPharmacy />, path: "/pharmacy" },
    { key: "ward", text: "Ward & Admissions", icon: <Hotel />, path: "/ward" },
    { key: "diet", text: "Diet & Meals", icon: <RestaurantMenu />, path: "/diet" },
    { key: "inventory", text: "Inventory", icon: <Inventory />, path: "/inventory" },
    { key: "billing", text: "Billing & Payments", icon: <ReceiptLong />, path: "/billing" },
    { key: "users", text: "Users & Roles", icon: <PeopleAlt />, path: "/users" },
    { key: "audit-logs", text: "Audit log", icon: <History />, path: "/audit-logs" },
    { key: "settings", text: "Settings", icon: <SettingsIcon />, path: "/settings" },
  ];

  const role = (() => {
    try {
      return JSON.parse(localStorage.getItem("role") || "null");
    } catch {
      return null;
    }
  })();
  const allowedMenuKeys = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem("menuItems") || "null");
      return Array.isArray(stored) ? stored : null;
    } catch {
      return null;
    }
  })();
  const isAdmin = role?.name === "admin";
  const visibleItems = !user
    ? []
    : isAdmin
      ? adminItems
      : allowedMenuKeys === null || allowedMenuKeys === undefined
        ? adminItems
        : adminItems.filter((item) => allowedMenuKeys.includes(item.key));
  const menuItems = visibleItems;

  const handleDrawerOpen = () => {
    if (isDesktop) setOpen(true);
    else setMobileMenuOpen((prev) => !prev);
  };
  const handleDrawerClose = () => setOpen(false);
  const handleMobileNav = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };
  const handleMobileLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
    fetch("/api/auth/logout", { method: "POST" });
  };

  useEffect(() => {
    const handleResize = () => {
      setOpen(window.innerWidth >= theme.breakpoints.values.md);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [theme.breakpoints.values.md]);

  const menuListContent = (
    <>
      <List>
        {menuItems.map((item) => (
          <ListItem
            key={item.key}
            button
            onClick={() => (isDesktop ? navigate(item.path) : handleMobileNav(item.path))}
            selected={location.pathname === item.path}
            sx={{
              cursor: "pointer",
              bgcolor: location.pathname === item.path ? "action.selected" : "transparent",
            }}
          >
            <ListItemIcon>
              {cloneElement(item.icon, {
                color: location.pathname === item.path ? "primary" : "textSecondary",
              })}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                color: location.pathname === item.path ? "primary" : "textSecondary",
                fontWeight: location.pathname === item.path ? "bold" : "normal",
              }}
            />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={isDesktop ? logout : handleMobileLogout} sx={{ cursor: "pointer" }}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={isDesktop && open}>
        <Toolbar>
          <Header
            setUser={props.setUser}
            handleDrawerOpen={handleDrawerOpen}
            open={isDesktop && open}
            mobileMenuOpen={mobileMenuOpen}
          />
        </Toolbar>
      </AppBar>
      {isDesktop && (
        <Drawer variant="permanent" open={open}>
          <DrawerHeader>
            <Box sx={{ minWidth: 0, flex: 1, pr: 0.5 }}>
              {(() => {
                try {
                  const hospital = JSON.parse(localStorage.getItem("hospital") || "null");
                  const hospitalName = hospital?.name || "—";
                  return (
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: "primary.main", lineHeight: 1.2 }}>
                        {hospitalName}
                      </Typography>
                    </Box>
                  );
                } catch {
                  return null;
                }
              })()}
            </Box>
            <IconButton onClick={handleDrawerClose} size="small" sx={{ flexShrink: 0 }}>
              {theme.direction === "rtl" ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </DrawerHeader>
          <Divider />
          <List>
            {menuItems.map((item) => (
              <Tooltip key={item.key} title={!open ? item.text : ""} placement="right" arrow>
                <ListItem
                  button
                  onClick={() => navigate(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    cursor: "pointer",
                    bgcolor: location.pathname === item.path ? "action.selected" : "transparent",
                  }}
                >
                  <ListItemIcon>
                    {cloneElement(item.icon, {
                      color: location.pathname === item.path ? "primary" : "textSecondary",
                    })}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      color: location.pathname === item.path ? "primary" : "textSecondary",
                      fontWeight: location.pathname === item.path ? "bold" : "normal",
                    }}
                  />
                </ListItem>
              </Tooltip>
            ))}
          </List>
          <Divider />
          <List>
            <Tooltip title={!open ? "Logout" : ""} placement="right" arrow>
              <ListItem button onClick={logout} sx={{ cursor: "pointer" }}>
                <ListItemIcon>
                  <Logout />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItem>
            </Tooltip>
          </List>
        </Drawer>
      )}
      <MuiDrawer
        variant="temporary"
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", md: "none" } }}
        PaperProps={{
          sx: (theme) => ({
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "none",
            top: theme.mixins.toolbar.minHeight ?? 64,
            bottom: 0,
            left: 0,
            height: "auto",
            maxHeight: "none",
            mt: 0,
            position: "fixed",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }),
        }}
      >
        <Box
          sx={{
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Divider />
          {menuListContent}
        </Box>
      </MuiDrawer>
    </Box>
  );
};

export default Navbar;
