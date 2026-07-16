import axios from "axios";

const apiOrigin = (
  import.meta.env.VITE_API_URL ||
  "https://studenttrackingplatform-production.up.railway.app"
).replace(/\/+$/, "");

// Create a pre-configured axios instance for API requests
const api = axios.create({
  baseURL: apiOrigin.endsWith("/api") ? apiOrigin : `${apiOrigin}/api`,
  withCredentials: true, // Crucial for sending and receiving HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
