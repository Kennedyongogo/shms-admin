import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  TextField,
  Typography,
} from "@mui/material";
import GuestNavbar from "./GuestNavbar";
import Footer from "./Footer";
import { ArrowForward as ArrowForwardIcon, FormatQuote as QuoteIcon } from "@mui/icons-material";

const primary = "#0fb8b0";
const backgroundLight = "#f6f8f8";

const gradientMeshSx = {
  backgroundColor: backgroundLight,
  backgroundImage: `
    radial-gradient(at 0% 0%, rgba(15, 184, 176, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.1) 0px, transparent 50%)
  `,
};

const initialTestimonials = [
  {
    quote:
      "Carlvyne SHMS transformed our hospital operations. Patient records are now seamless, appointments run on time, and our staff productivity has increased significantly.",
    author: "Dr. Sarah Mitchell",
    role: "Medical Director, City General Hospital",
    rating: 5,
  },
  {
    quote:
      "The integrated lab and pharmacy modules saved us countless hours. Real-time reporting means we deliver better care faster.",
    author: "James Chen",
    role: "Operations Manager, Riverside Medical Center",
    rating: 5,
  },
  {
    quote:
      "We switched to Carlvyne six months ago. Billing, inventory, and ward management—all in one place. A game-changer for mid-sized facilities.",
    author: "Dr. Priya Sharma",
    role: "CEO, Wellness Hospital",
    rating: 5,
  },
];

export default function TestimonialsPage() {
  const [showNavbar, setShowNavbar] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [reviewForm, setReviewForm] = useState({
    quote: "",
    author: "",
    role: "",
    rating: 0,
  });
  const scrollContainerRef = useRef(null);
  const heroSectionRef = useRef(null);

  const handleOpenReviewDialog = () => setReviewDialogOpen(true);
  const handleCloseReviewDialog = () => {
    setReviewDialogOpen(false);
    setReviewForm({ quote: "", author: "", role: "", rating: 0 });
  };

  const handleReviewSubmit = () => {
    if (!reviewForm.quote.trim() || !reviewForm.author.trim() || !reviewForm.role.trim() || reviewForm.rating === 0) return;
    setTestimonials((prev) => [
      ...prev,
      {
        quote: reviewForm.quote.trim(),
        author: reviewForm.author.trim(),
        role: reviewForm.role.trim(),
        rating: reviewForm.rating,
      },
    ]);
    handleCloseReviewDialog();
  };

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    const heroEl = heroSectionRef.current;
    if (!scrollEl || !heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowNavbar(entry.isIntersecting);
      },
      { root: scrollEl, threshold: 0.6 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  return (
    <Box
      component="main"
      sx={{
        fontFamily: "'Inter', sans-serif",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        p: "1px",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
        ref={scrollContainerRef}
      >
        {showNavbar && <GuestNavbar />}

        {/* Hero */}
        <Box
          component="section"
          ref={heroSectionRef}
          sx={{
            position: "relative",
            minHeight: "28vh",
            display: "flex",
            alignItems: "flex-start",
            overflow: "hidden",
            ...gradientMeshSx,
          }}
        >
          <Box
            sx={{
              width: "100%",
              px: { xs: 2, sm: 3, lg: 4 },
              pt: 1,
              pb: 4,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                width: "100%",
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "9999px",
                  bgcolor: "rgba(15, 184, 176, 0.1)",
                  border: "1px solid rgba(15, 184, 176, 0.2)",
                  width: "fit-content",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: primary,
                    animation: "pulse 2s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: primary,
                  }}
                >
                  What Our Clients Say
                </Typography>
              </Box>

              <Typography
                component="h1"
                variant="h3"
                sx={{
                  fontSize: { xs: "1.75rem", lg: "2.5rem" },
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                  mt: -1.5,
                }}
              >
                Testimonials
              </Typography>

              <Typography
                sx={{
                  fontSize: "1.25rem",
                  color: "text.secondary",
                  lineHeight: 1.7,
                  maxWidth: 640,
                }}
              >
                Hear from healthcare leaders who trust Carlvyne Smart Hospital
                Management System to streamline their operations and deliver
                better patient care.
              </Typography>

              <Button
                variant="contained"
                onClick={handleOpenReviewDialog}
                endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                sx={{
                  px: 3,
                  py: 1.5,
                  bgcolor: primary,
                  color: "white",
                  fontWeight: 700,
                  borderRadius: 2,
                  boxShadow: `0 10px 15px -3px rgba(15, 184, 176, 0.2)`,
                  "&:hover": { bgcolor: "rgba(15, 184, 176, 0.9)" },
                }}
              >
                Get Started
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Testimonials grid */}
        <Box
          component="section"
          sx={{
            py: 5,
            bgcolor: "background.paper",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Box sx={{ width: "100%", px: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography
              component="h2"
              variant="h4"
              sx={{
                fontSize: { xs: "1.75rem", lg: "2.25rem" },
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "text.primary",
              }}
            >
              Trusted by Healthcare Leaders
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 3,
              width: "100%",
              boxSizing: "border-box",
              px: { xs: 2, sm: 3 },
              "& > *": { minWidth: 0 },
              "@media (max-width: 900px)": {
                gridTemplateColumns: "1fr",
              },
            }}
          >
            {testimonials.map(({ quote, author, role, rating }, index) => (
              <Card
                key={`${author}-${index}`}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none",
                  "&:hover": {
                    borderColor: "rgba(15, 184, 176, 0.3)",
                    boxShadow: "0 8px 20px -5px rgba(15, 184, 176, 0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Rating value={rating ?? 5} readOnly size="small" sx={{ color: primary }} />
                  </Box>
                  <QuoteIcon
                    sx={{
                      fontSize: 40,
                      color: primary,
                      opacity: 0.4,
                      mb: 1,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      lineHeight: 1.7,
                      color: "text.secondary",
                      mb: 2,
                    }}
                  >
                    "{quote}"
                  </Typography>
                  <Typography
                    sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.95rem" }}
                  >
                    {author}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.85rem" }}
                  >
                    {role}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Review dialog */}
        <Dialog open={reviewDialogOpen} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Share your experience</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography component="span" sx={{ fontSize: "0.9rem", color: "text.secondary", mr: 1 }}>
                Rating
              </Typography>
              <Rating
                value={reviewForm.rating}
                onChange={(_, value) => setReviewForm((f) => ({ ...f, rating: value ?? 0 }))}
                size="medium"
                sx={{ color: primary }}
              />
            </Box>
            <TextField
              autoFocus
              fullWidth
              label="Your review"
              placeholder="e.g. Carlvyne SHMS transformed our hospital operations. Patient records are now seamless..."
              multiline
              rows={4}
              value={reviewForm.quote}
              onChange={(e) => setReviewForm((f) => ({ ...f, quote: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Your name"
              placeholder="e.g. Dr. Sarah Mitchell"
              value={reviewForm.author}
              onChange={(e) => setReviewForm((f) => ({ ...f, author: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Your role / organization"
              placeholder="e.g. Medical Director, City General Hospital"
              value={reviewForm.role}
              onChange={(e) => setReviewForm((f) => ({ ...f, role: e.target.value }))}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseReviewDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleReviewSubmit}
              disabled={!reviewForm.quote.trim() || !reviewForm.author.trim() || !reviewForm.role.trim() || reviewForm.rating === 0}
              sx={{ bgcolor: primary, "&:hover": { bgcolor: "rgba(15, 184, 176, 0.9)" } }}
            >
              Submit review
            </Button>
          </DialogActions>
        </Dialog>

        <Footer />
      </Box>
    </Box>
  );
}
