import { createTheme } from "@mui/material/styles";

// Default teal — can be overridden per hospital via Settings
const DEFAULT_PRIMARY = "#00897B";
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

/** Lighten or darken a hex color by a factor (0–1). */
function adjustHex(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * (1 + factor)));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * (1 + factor)));
  const b = Math.min(255, Math.round((n & 0xff) * (1 + factor)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

/** Build theme with custom primary (portal brand color). Headers, dialogs, buttons, and all admin components use this. */
export function createAppTheme(primaryHex = DEFAULT_PRIMARY) {
  const main = typeof primaryHex === "string" && /^#[0-9A-Fa-f]{6}$/.test(primaryHex) ? primaryHex : DEFAULT_PRIMARY;
  const light = adjustHex(main, 0.15);
  const dark = adjustHex(main, -0.12);
  return createTheme({
    palette: {
      primary: {
        main,
        light,
        dark,
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
      main,
      light,
      dark,
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
}

const theme = createAppTheme(DEFAULT_PRIMARY);
export default theme;
