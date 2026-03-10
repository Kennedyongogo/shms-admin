import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from "@mui/material";

const primaryTeal = "#00897B";
const primaryTealDark = "#00695C";

const DEFAULT_INITIAL_MESSAGES = [
  {
    from: "ai",
    text: "Hi 👋 I'm the Carlvyne assistant. Ask me anything about how this system works, signing up, or what to expect.",
  },
];

export default function ChatbotWidget({
  initialMessages = DEFAULT_INITIAL_MESSAGES,
  subtitle = "Ask how the system works.",
  buttonLabel = "Need help? Chat with us",
  placeholder = "Ask about features, registration, billing, etc.",
  buttonIcon = null,
}) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState(initialMessages);

  const handleClose = () => {
    setChatOpen(false);
    setChatMessages([...initialMessages]);
  };

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMessage = { from: "user", text: trimmed };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/guest-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text:
              data?.message ||
              "Sorry, I'm having trouble answering right now. Please try again later.",
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { from: "ai", text: data.message },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Something went wrong talking to the assistant. Please try again in a moment.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1300,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      {chatOpen && (
        <Box
          sx={{
            width: isSmallScreen ? "90vw" : 360,
            maxHeight: 460,
            mb: 1.5,
            bgcolor: "white",
            borderRadius: 3,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            border: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: primaryTeal,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Carlvyne Assistant
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {subtitle}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={handleClose}
              sx={{
                minWidth: "auto",
                color: "white",
                textTransform: "none",
                fontSize: 12,
                px: 1,
              }}
            >
              Close
            </Button>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 1.5,
              overflowY: "auto",
              bgcolor: "grey.50",
            }}
          >
            {chatMessages.map((m, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    maxWidth: "85%",
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: m.from === "user" ? primaryTeal : "white",
                    color: m.from === "user" ? "white" : "text.primary",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </Box>
              </Box>
            ))}
            {chatLoading && (
              <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Thinking…
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderTop: "1px solid rgba(0,0,0,0.06)",
              bgcolor: "white",
            }}
          >
            <TextField
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={placeholder}
              size="small"
              fullWidth
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={handleSendChat}
                      disabled={chatLoading || !chatInput.trim()}
                      sx={{
                        bgcolor: primaryTeal,
                        color: "white",
                        textTransform: "none",
                        "&:hover": { bgcolor: primaryTealDark },
                        fontSize: 12,
                        px: 1.5,
                        py: 0.5,
                      }}
                    >
                      Send
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "grey.50",
                },
              }}
            />
          </Box>
        </Box>
      )}

      <Button
        variant="contained"
        onClick={() => setChatOpen(true)}
        startIcon={
          buttonIcon ? (
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                "@keyframes healthPulse": {
                  "0%, 100%": { transform: "scale(1)", opacity: 1 },
                  "50%": { transform: "scale(1.12)", opacity: 0.92 },
                },
                animation: "healthPulse 2.2s ease-in-out infinite",
              }}
            >
              {buttonIcon}
            </Box>
          ) : null
        }
        sx={{
          borderRadius: 999,
          bgcolor: primaryTeal,
          color: "white",
          px: 2.4,
          py: 1,
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          textTransform: "none",
          fontWeight: 700,
          "&:hover": {
            bgcolor: primaryTealDark,
            boxShadow: "0 12px 36px rgba(0,105,92,0.55)",
          },
        }}
      >
        {buttonLabel}
      </Button>
    </Box>
  );
}
