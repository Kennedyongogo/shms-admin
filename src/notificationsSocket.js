import { io } from "socket.io-client";

let socketInstance = null;

function getApiBaseUrl() {
  const env = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL;
  if (env) return String(env).replace(/\/$/, "");
  // Fallback to same origin; Vite dev server should proxy /socket.io to backend
  return "";
}

export function getNotificationsSocket() {
  if (socketInstance) return socketInstance;

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const baseUrl = getApiBaseUrl();

  socketInstance = io(baseUrl || undefined, {
    path: "/socket.io",
    auth: token ? { token } : undefined,
    autoConnect: !!token,
  });

  return socketInstance;
}

export function getChatSocket() {
  // Reuse the same underlying connection; notifications and chat share the same Socket.IO server
  return getNotificationsSocket();
}

