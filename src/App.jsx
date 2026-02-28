import React from "react";
import "ol/ol.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import AboutPage from "./components/AboutPage";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";
import PageRoutes from "./components/PageRoutes";

function App() {
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
