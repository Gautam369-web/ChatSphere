/**
 * ChatSphere 24/7 Keep-Alive Script
 *
 * Keeps Render, Railway, or any free-tier hosting instance awake 24/7
 * by sending periodic HTTP requests before the 15-minute inactivity timeout.
 *
 * Usage:
 *   node scripts/keep-alive.mjs https://your-socket-server.onrender.com
 *   or:
 *   npm run keep-alive
 */

const targetUrl =
  process.argv[2] ||
  process.env.SELF_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:3001";

const INTERVAL_MINUTES = 10;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

console.log("==========================================");
console.log("🚀 ChatSphere Keep-Alive Daemon Started");
console.log(`🎯 Target URL: ${targetUrl}`);
console.log(`⏱️ Interval: Every ${INTERVAL_MINUTES} minutes (Render timeout is 15 mins)`);
console.log("==========================================");

async function ping() {
  const timestamp = new Date().toLocaleTimeString();
  try {
    const res = await fetch(targetUrl);
    const data = await res.json().catch(() => null);
    console.log(
      `[${timestamp}] ✅ Ping successful (${res.status}) - Uptime: ${
        data?.uptime ? `${data.uptime}s` : "active"
      }`
    );
  } catch (error) {
    console.error(`[${timestamp}] ⚠️ Ping error:`, error.message);
  }
}

// Initial ping
ping();

// Periodic loop
setInterval(ping, INTERVAL_MS);
