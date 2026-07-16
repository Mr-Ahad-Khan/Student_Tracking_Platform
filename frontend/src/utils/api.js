import axios from "axios";

// Create a pre-configured axios instance for API requests
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://studenttrackingplatform-production.up.railway.app/api",
  withCredentials: true, // Crucial for sending and receiving HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
