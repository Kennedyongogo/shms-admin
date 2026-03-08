import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Link,
  Stack,
  Divider,
} from "@mui/material";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Our services", to: "/#services" },
  { label: "Testimonials", to: "/testimonials" },
];

const API_NEWSLETTER_SUBSCRIBE = "/api/newsletter/subscribe";

const Footer = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      await Swal.fire({
        icon: "info",
        title: "Enter your email",
        text: "Please enter your email address to subscribe.",
        confirmButtonColor: "#4a90e2",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid email",
        text: "Please enter a valid email address.",
        confirmButtonColor: "#4a90e2",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    setSubmitting(true);
    Swal.fire({
      title: "Subscribing...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
      background: "#1a1a1a",
      color: "#fff",
    });

    try {
      const res = await fetch(API_NEWSLETTER_SUBSCRIBE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setEmail("");
        await Swal.fire({
          icon: "success",
          title: "You're subscribed!",
          html: "<p style='color:#b0b0b0'>We'll send you updates and news from Carlvyne Technologies.</p>",
          confirmButtonText: "Done",
          confirmButtonColor: "#4a90e2",
          background: "#1a1a1a",
          color: "#fff",
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Subscription failed",
          text: data.message || "Something went wrong. Please try again.",
          confirmButtonColor: "#4a90e2",
          background: "#1a1a1a",
          color: "#fff",
        });
      }
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Connection error",
        text: "Please check your connection and try again.",
        confirmButtonColor: "#4a90e2",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        py: 3,
        mt: "auto",
        width: "100%",
      }}
    >
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1600, px: { xs: 2, sm: 3, md: 4, lg: 5 } }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 3,
          }}
        >
          {/* Left: Carlvyne Technologies */}
          <Box sx={{ flexShrink: 0, minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 1,
                fontSize: "1.25rem",
                color: "#4a90e2",
              }}
            >
              Carlvyne Technologies Ltd
            </Typography>
            <Typography sx={{ color: "#b0b0b0", mb: 0, fontSize: "0.875rem" }}>
              Innovating healthcare technology through the Carlvyne Smart
              Hospital Management
            </Typography>
          </Box>

          {/* Center: Quick Links + Contact Us — stack on phone only, one line on tablet/desktop */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              flexWrap: "nowrap",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 3,
              minWidth: 0,
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, fontWeight: 600, fontSize: "0.9rem" }}
              >
                Quick Links
              </Typography>
              <Stack spacing={0.5}>
                {quickLinks.map(({ label, to }, index) => (
                  <Box
                    key={to}
                    component="span"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    sx={{ display: "inline-block", position: "relative", width: "fit-content" }}
                  >
                    <Link
                      component={RouterLink}
                      to={to}
                      sx={{
                        color: "#b0b0b0",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        "&:hover": { color: "#4a90e2" },
                      }}
                    >
                      {label}
                    </Link>
                    {hoveredIndex === index && (
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          bottom: -2,
                          height: 2,
                          width: "100%",
                          bgcolor: "#4a90e2",
                          borderRadius: 1,
                          transition: "opacity 0.2s ease",
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, fontWeight: 600, fontSize: "0.9rem" }}
              >
                Contact Us
              </Typography>
              <Stack
                spacing={0.5}
                sx={{ color: "#b0b0b0", fontSize: "0.875rem" }}
              >
                <Typography sx={{ fontSize: "inherit" }}>
                  carlvynetechnologiesltd@gmail.com
                </Typography>
                <Typography sx={{ fontSize: "inherit" }}>
                  +254 798 231083 / +254 798 757460
                </Typography>
                <Typography sx={{ fontSize: "inherit" }}>
                  Nairobi, Kenya
                </Typography>
              </Stack>
            </Box>
          </Box>

          {/* Far right: Newsletter */}
          <Box sx={{ flexShrink: 0, width: { xs: "100%", sm: 280 } }}>
            <Box
              component="form"
              onSubmit={handleNewsletterSubmit}
              sx={{ bgcolor: "#2a2a2a", p: 2, borderRadius: 1 }}
            >
              <Typography sx={{ color: "#ffffff", mb: 1, fontSize: "0.9rem" }}>
                Subscribe to our newsletter
              </Typography>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="Enter your email"
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "#333333",
                      color: "#ffffff",
                      "& fieldset": { borderColor: "#444" },
                      "&:hover fieldset": { borderColor: "#555" },
                    },
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={submitting}
                  sx={{
                    bgcolor: "#4a90e2",
                    "&:hover": { bgcolor: "#357abd" },
                  }}
                >
                  {submitting ? "Subscribing…" : "Subscribe"}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>

        {/* Copyright */}
        <Divider sx={{ bgcolor: "#333", my: 2 }} />
        <Typography align="center" sx={{ color: "#888", fontSize: "0.8rem" }}>
          © 2026 Carlvyne Technologies Ltd. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
