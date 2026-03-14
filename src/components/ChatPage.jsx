import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  TextField,
  Divider,
  CircularProgress,
  Button,
} from "@mui/material";
import { Chat as ChatIcon, Send as SendIcon, GroupAdd as GroupAddIcon } from "@mui/icons-material";
import { getChatSocket } from "../notificationsSocket";

const getToken = () => localStorage.getItem("token");

async function fetchJson(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

const getInitials = (name) => {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const buildImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (String(imageUrl).startsWith("http")) return imageUrl;
  if (String(imageUrl).startsWith("uploads/")) return `/${imageUrl}`;
  if (String(imageUrl).startsWith("/uploads/")) return imageUrl;
  return imageUrl;
};

export default function ChatPage() {
  const [rooms, setRooms] = useState([]);
  const [peers, setPeers] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load existing rooms and peers on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingRooms(true);
        const [roomsRes, peersRes] = await Promise.all([
          fetchJson("/api/chat/rooms"),
          fetchJson("/api/chat/peers"),
        ]);
        if (cancelled) return;
        setRooms(roomsRes?.data || []);
        setPeers(peersRes?.data || []);
        if ((roomsRes?.data || []).length > 0) {
          setSelectedRoomId(roomsRes.data[0].id);
        }
      } catch (e) {
        console.error("Failed to load chat rooms/peers:", e);
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Socket: listen for new messages
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = getChatSocket();

    const handleConnected = () => {
      // auto-join all current rooms so we receive message_new events
      rooms.forEach((r) => {
        socket.emit("join_room", r.id, () => {});
      });
    };

    const handleMessageNew = (payload) => {
      if (!payload?.roomId || !payload?.message) return;
      setMessages((prev) =>
        payload.roomId === selectedRoomId ? [...prev, payload.message] : prev,
      );
    };

    socket.on("connected", handleConnected);
    socket.on("message_new", handleMessageNew);

    return () => {
      socket.off("connected", handleConnected);
      socket.off("message_new", handleMessageNew);
    };
  }, [rooms, selectedRoomId]);

  // Load messages whenever room changes
  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await fetchJson(`/api/chat/rooms/${selectedRoomId}/messages?limit=50`);
        if (cancelled) return;
        setMessages(res?.data || []);
      } catch (e) {
        console.error("Failed to load messages:", e);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedRoomId]);

  // Mark room as read when messages are loaded / room is active
  useEffect(() => {
    const markRead = async () => {
      if (!selectedRoomId || messages.length === 0) return;
      try {
        await fetchJson(`/api/chat/rooms/${selectedRoomId}/read`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        window.dispatchEvent(new Event("chat-unread-updated"));
      } catch (e) {
        // non-fatal
      }
    };
    markRead();
  }, [selectedRoomId, messages.length]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId],
  );

  const handleSend = async () => {
    const text = messageInput.trim();
    if (!text || !selectedRoomId || sending) return;
    setSending(true);
    try {
      const res = await fetchJson(`/api/chat/rooms/${selectedRoomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      setMessageInput("");
      // Optimistically append; socket will also push but we guard against duplicates by id
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === res?.data?.id);
        return exists ? prev : [...prev, res.data];
      });
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  const handleStartChatWithPeer = async (peerId) => {
    if (!peerId || creating) return;
    setCreating(true);
    try {
      // Create a direct room with this peer; backend will also include current user
      const res = await fetchJson("/api/chat/rooms", {
        method: "POST",
        body: JSON.stringify({
          is_private: true,
          type: "direct",
          participantIds: [peerId],
        }),
      });
      const newRoom = res?.data;
      if (!newRoom) return;
      setRooms((prev) => {
        const exists = prev.some((r) => r.id === newRoom.id);
        return exists ? prev : [newRoom, ...prev];
      });
      setSelectedRoomId(newRoom.id);
      // join socket room
      const socket = getChatSocket();
      socket.emit("join_room", newRoom.id, () => {});
    } catch (e) {
      console.error("Failed to create room:", e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Chat
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "280px 1fr" },
          gap: 2,
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* Left: rooms + peers */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Rooms
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {loadingRooms ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 4,
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : rooms.length === 0 ? (
              <Box sx={{ p: 2, color: "text.secondary", fontSize: 14 }}>
                No chat rooms yet. Start a conversation with a colleague below.
              </Box>
            ) : (
              <List dense disablePadding>
                {rooms.map((room) => {
                  const active = room.id === selectedRoomId;
                  const participantUsers = (room.participants || [])
                    .map((p) => p.user)
                    .filter(Boolean);
                  const roomTitle =
                    room.title ||
                    participantUsers.map((u) => u.full_name || u.email).join(", ") ||
                    "Untitled room";
                  return (
                    <ListItemButton
                      key={room.id}
                      selected={active}
                      onClick={() => setSelectedRoomId(room.id)}
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <ChatIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={roomTitle}
                        primaryTypographyProps={{
                          noWrap: true,
                          fontWeight: active ? 600 : 400,
                        }}
                        secondary={
                          room.last_message?.message
                            ? String(room.last_message.message).slice(0, 60)
                            : "No messages yet"
                        }
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Start new chat
            </Typography>
            <Box
              sx={{
                maxHeight: 160,
                overflowY: "auto",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {peers.length === 0 ? (
                <Box sx={{ p: 1.5, color: "text.secondary", fontSize: 13 }}>
                  No other active users found in your hospital.
                </Box>
              ) : (
                <List dense>
                  {peers.map((peer) => (
                    <ListItemButton
                      key={peer.id}
                      onClick={() => handleStartChatWithPeer(peer.id)}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={buildImageUrl(peer.profile_image_path)}
                          imgProps={{ loading: "lazy" }}
                        >
                          {getInitials(peer.full_name || peer.email)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={peer.full_name || peer.email}
                        secondary={peer.staff?.department_id ? "Staff" : null}
                      />
                      <IconButton edge="end" size="small">
                        <GroupAddIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
            {creating && (
              <Box sx={{ display: "flex", alignItems: "center", mt: 1, columnGap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Creating room...
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Right: messages */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selectedRoom
                  ? selectedRoom.title || "Room"
                  : "Select a room or start a chat"}
              </Typography>
              {selectedRoom && (
                <Typography variant="caption" color="text.secondary">
                  {(selectedRoom.participants || [])
                    .map((p) => p.user?.full_name || p.user?.email)
                    .filter(Boolean)
                    .join(", ")}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, p: 2, overflowY: "auto", bgcolor: "grey.50" }}>
            {loadingMessages ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : !selectedRoom ? (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                  textAlign: "center",
                  px: 2,
                }}
              >
                <Typography variant="body2">
                  Select a room from the left or start a new chat with a colleague.
                </Typography>
              </Box>
            ) : messages.length === 0 ? (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                  textAlign: "center",
                  px: 2,
                }}
              >
                <Typography variant="body2">
                  No messages yet. Say hi to your colleagues in this room.
                </Typography>
              </Box>
            ) : (
              messages.map((m) => (
                <Box
                  key={m.id}
                  sx={{
                    display: "flex",
                    justifyContent:
                      m.sender_id === selectedRoom?.created_by ? "flex-end" : "flex-start",
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: "75%",
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor:
                        m.sender_id === selectedRoom?.created_by
                          ? "primary.main"
                          : "background.paper",
                      color:
                        m.sender_id === selectedRoom?.created_by ? "primary.contrastText" : "text.primary",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      fontSize: 14,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mb: 0.25,
                        opacity: 0.8,
                      }}
                    >
                      {m.sender?.full_name || m.sender?.email || "User"}
                    </Typography>
                    {m.message}
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 0.25,
                        opacity: 0.7,
                        textAlign: "right",
                      }}
                    >
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Message input */}
          <Box
            sx={{
              p: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder={
                selectedRoom ? "Type a message and press Enter..." : "Select or start a chat first"
              }
              disabled={!selectedRoom || sending}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSend}
              disabled={!selectedRoom || sending || !messageInput.trim()}
              startIcon={<SendIcon fontSize="small" />}
            >
              Send
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

