import React, { useState, useEffect } from "react";
import "ol/ol.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import AboutPage from "./components/AboutPage";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "./theme";
import PageRoutes from "./components/PageRoutes";

function getInitialTheme() {
  try {
    const hospital = JSON.parse(localStorage.getItem("hospital") || "null");
    const hex = hospital?.primary_color;
    return createAppTheme(hex || undefined);
  } catch {
    return createAppTheme();
  }
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const onThemeUpdated = (e) => {
      const hex = e.detail?.primary_color;
      setTheme(createAppTheme(hex || undefined));
    };
    window.addEventListener("theme-updated", onThemeUpdated);
    return () => window.removeEventListener("theme-updated", onThemeUpdated);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/*" element={<PageRoutes />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
