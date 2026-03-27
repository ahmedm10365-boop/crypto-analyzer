const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// Detect if we're on Vercel (serverless) or Express backend
function isVercel(): boolean {
  return typeof window !== "undefined" && (
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("now.sh") ||
    // Check if /api/coins serverless function exists
    !API_BASE
  );
}

export async function fetchCoins(page = 1, perPage = 50) {
  const url = API_BASE
    ? `${API_BASE}/api/coins?page=${page}&per_page=${perPage}`
    : `/api/coins?path=markets&page=${page}&per_page=${perPage}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchGlobal() {
  const url = API_BASE
    ? `${API_BASE}/api/global`
    : `/api/coins?path=global`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTrending() {
  const url = API_BASE
    ? `${API_BASE}/api/trending`
    : `/api/coins?path=trending`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchOHLC(coinId: string, days = 30) {
  const url = API_BASE
    ? `${API_BASE}/api/coins/${coinId}/ohlc?days=${days}`
    : `/api/coins?path=ohlc/${coinId}&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCoinDetail(coinId: string) {
  const url = API_BASE
    ? `${API_BASE}/api/coins/${coinId}/detail`
    : `/api/coins?path=detail/${coinId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
