import { createTheme } from "@mui/material/styles";

// Teal + Navy + Soft Gray — professional hospital management palette
const TEAL = {
  main: "#00897B",
  light: "#4DB6AC",
  dark: "#00695C",
};
const NAVY = {
  main: "#1a237e",
  light: "#534bae",
  dark: "#0d0d2b",
};
const SOFT_GRAY = {
  bg: "#f5f5f5",
  bgLight: "#fafafa",
  border: "#e0e0e0",
  text: "#757575",
  textDark: "#616161",
};

const theme = createTheme({
  palette: {
    primary: {
      main: TEAL.main,
      light: TEAL.light,
      dark: TEAL.dark,
    },
    secondary: {
      main: NAVY.main,
      light: NAVY.light,
      dark: NAVY.dark,
    },
    info: {
      main: "#1f89e5",
      light: "#6fb3f0",
      dark: "#166ab4",
    },
    background: {
      default: "#ffffff",
      paper: SOFT_GRAY.bg,
      dark: NAVY.dark,
    },
    text: {
      primary: NAVY.dark,
      secondary: SOFT_GRAY.text,
    },
    success: {
      main: TEAL.main,
      light: TEAL.light,
      dark: TEAL.dark,
    },
    divider: SOFT_GRAY.border,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 600, color: NAVY.dark },
    h2: { fontWeight: 600, color: NAVY.dark },
    h3: { fontWeight: 600, color: NAVY.dark },
    h4: { fontWeight: 600, color: NAVY.dark },
    h5: { fontWeight: 600, color: NAVY.dark },
    h6: { fontWeight: 600, color: NAVY.dark },
    button: {
      textTransform: "none",
    },
  },
});

export default theme;
