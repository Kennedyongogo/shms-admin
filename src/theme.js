import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#00897B", // teal (match public portal hero)
      light: "#4DB6AC",
      dark: "#00695C",
    },
    secondary: {
      main: "#1f89e5", // public portal blue accent
      light: "#6fb3f0",
      dark: "#166ab4",
    },
    info: {
      main: "#1f89e5",
      light: "#6fb3f0",
      dark: "#166ab4",
    },
    background: {
      default: "#ffffff",
      paper: "#f9f9f9",
      dark: "#0b2a27",
    },
    text: {
      primary: "#0f172a",
      secondary: "#555555",
    },
    // Keep success color for notifications/status indicators
    success: {
      main: "#00897B",
      light: "#4DB6AC",
      dark: "#00695C",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    button: {
      textTransform: "none",
    },
  },
});

export default theme;
