import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";

const primary = "#0fb8b0";
const CARD_IMAGE = "/bergy59-bed-8352775_1920.jpg";
const FIRST_CARD_IMAGE = "/Gemini_Generated_Image_ywtxb4ywtxb4ywtx.png";
const CARD_2_IMAGE = "/card_2.png";
const CARD_3_IMAGE = "/card%203.png";
const CARD_4_IMAGE = "/card%204.png";
const CARD_5_IMAGE = "/card%205.png";

const services = [
  { name: "One place for operations", description: "Appointments, patients, lab, pharmacy, ward, diet, inventory, and billing in a single admin portal.", image: FIRST_CARD_IMAGE },
  { name: "Controlled access", description: "Users and roles so doctors, nurses, pharmacy, lab, and admin see only what they need.", image: CARD_2_IMAGE },
  { name: "Traceability", description: "Audit log of who did what, when — for accountability and compliance.", image: CARD_3_IMAGE },
  { name: "Scalable", description: "Supports multiple hospitals and branches and can grow with your facility.", image: CARD_4_IMAGE },
  { name: "Integration-ready", description: "REST API so you can later add mobile apps, kiosks, or other software that talk to the same backend.", image: CARD_5_IMAGE },
];

const CARD_HEIGHT = 240;

const flipCardOuterSx = {
  minHeight: CARD_HEIGHT,
  height: CARD_HEIGHT,
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "action.hover",
  perspective: "1000px",
  "&:hover": {
    borderColor: "rgba(15, 184, 176, 0.3)",
    boxShadow: "0 20px 25px -5px rgba(15, 184, 176, 0.08)",
  },
  "&:hover .services-flip-inner": {
    transform: "rotateY(180deg)",
  },
};

const flipCardInnerSx = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: CARD_HEIGHT,
  transition: "transform 0.6s ease",
  transformStyle: "preserve-3d",
};

const flipFaceSx = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 2,
  backfaceVisibility: "hidden",
  overflow: "hidden",
};

const CARD_IMAGE_PLACEHOLDER_BG = "#dce8e4";

const flipCardFrontSx = {
  ...flipFaceSx,
  backgroundColor: CARD_IMAGE_PLACEHOLDER_BG,
  backgroundImage: `url(${CARD_IMAGE})`,
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center center",
  borderTop: "4px solid",
  borderTopColor: primary,
};

const flipCardBackSx = {
  ...flipFaceSx,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  p: 2,
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  transform: "rotateY(180deg)",
};

export default function ServicesSection() {
  const navigate = useNavigate();
  return (
    <Box id="services" component="section" sx={{ width: "100%", py: 5, px: { xs: 2, sm: 3 }, bgcolor: "background.paper", boxSizing: "border-box" }}>
      <Box sx={{ width: "100%", maxWidth: 1600, mx: "auto" }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography component="h2" variant="h4" sx={{ fontSize: { xs: "1.75rem", lg: "2.25rem" }, fontWeight: 900, letterSpacing: "-0.02em", color: "text.primary", mb: 1 }}>
            Services we offer
          </Typography>
          <Box sx={{ width: 96, height: 6, bgcolor: primary, borderRadius: 1, mx: "auto", mb: 2 }} />
          <Typography sx={{ color: "text.secondary", maxWidth: 560, mx: "auto", fontSize: "1.0625rem" }}>
            Five ways our system helps your clinic or hospital run better.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 3,
            width: "100%",
            "& > *": { minWidth: 0, width: "100%" },
            "@media (max-width: 1200px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
            "@media (max-width: 768px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
            "@media (max-width: 500px)": { gridTemplateColumns: "1fr" },
          }}
        >
          {services.map(({ name, description, image }) => (
            <Box key={name} sx={{ ...flipCardOuterSx, width: "100%", minWidth: 0 }}>
              <Box className="services-flip-inner" sx={flipCardInnerSx}>
                <Box
                  sx={{
                    ...flipCardFrontSx,
                    backgroundColor: CARD_IMAGE_PLACEHOLDER_BG,
                    backgroundImage: `url(${image || CARD_IMAGE})`,
                  }}
                />
                <Box sx={flipCardBackSx}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center", lineHeight: 1.6 }}
                  >
                    {description}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <Button
            onClick={() => navigate("/about")}
            variant="contained"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 20 }} />}
            sx={{
              px: 4,
              py: 1.75,
              fontSize: "1rem",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: primary,
              color: "white",
              boxShadow: "0 4px 14px rgba(15, 184, 176, 0.4)",
              textTransform: "none",
              whiteSpace: "nowrap",
              "&:hover": {
                bgcolor: "rgba(15, 184, 176, 0.9)",
                boxShadow: "0 6px 20px rgba(15, 184, 176, 0.45)",
              },
            }}
          >
            View more about Carlvyne SHMS
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
