// Single source of truth for the backend base URL.
//
// In local dev we fall back to localhost so the app "just works" without an
// .env file. In a production build we warn loudly if the env var is missing,
// instead of silently shipping a localhost URL that will fail for every user.

const RAW =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

if (!RAW && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.error(
    "[CounterPlay] NEXT_PUBLIC_API_URL is not set — API calls will fail. " +
      "Set it in your Vercel/Render environment."
  );
}

// Normalise: strip any trailing slash so `${API_BASE}/api/...` is always clean.
export const API_BASE = RAW.replace(/\/+$/, "");

/**
 * Fetch JSON from the API with a sane timeout and a thrown error on failure,
 * so callers can render real error/empty states instead of hanging forever.
 *
 * @param {string} path  Path beginning with "/", e.g. "/api/metadata/years".
 * @param {object} [options]  fetch options; `timeoutMs` defaults to 15000.
 */
export async function getJSON(path, options = {}) {
  const { timeoutMs = 15000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}) for ${path}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
