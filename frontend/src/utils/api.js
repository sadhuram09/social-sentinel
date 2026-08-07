// Backend base URL.
//
// Override per environment with VITE_BACKEND_URL (e.g. http://localhost:5000
// for local backend work). Falls back to the live Render deployment.
//
// NOTE: Vite inlines import.meta.env.* at BUILD time, not runtime. Changing
// VITE_BACKEND_URL in Vercel therefore requires a redeploy to take effect.
const BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://social-sentinel-api.onrender.com'

export default BASE_URL
