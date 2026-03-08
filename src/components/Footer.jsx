import { Link as RouterLink } from "react-router-dom";
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

const Footer = () => {
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
                {quickLinks.map(({ label, to }) => (
                  <Link
                    key={to}
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
            <Box sx={{ bgcolor: "#2a2a2a", p: 2, borderRadius: 1 }}>
              <Typography sx={{ color: "#ffffff", mb: 1, fontSize: "0.9rem" }}>
                Subscribe to our newsletter
              </Typography>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  placeholder="Enter your email"
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "#333333",
                      color: "#ffffff",
                      "& fieldset": { borderColor: "#444" },
                    },
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    bgcolor: "#4a90e2",
                    "&:hover": { bgcolor: "#357abd" },
                  }}
                >
                  Subscribe
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
