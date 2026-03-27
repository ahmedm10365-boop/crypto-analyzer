const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const cache = {};

function getCached(key, ttl) {
  const entry = cache[key];
  if (entry && Date.now() < entry.expiry) return entry.data;
  delete cache[key];
  return null;
}

function setCache(key, data, ttlMs) {
  cache[key] = { data, expiry: Date.now() + ttlMs };
}

async function fetchCG(endpoint, cacheTTL = 60000) {
  const cached = getCached(endpoint, cacheTTL);
  if (cached) return cached;

  const res = await fetch(`${COINGECKO_BASE}${endpoint}`, {
    headers: { accept: "application/json" },
  });

  if (res.status === 429) {
    const old = cache[endpoint];
    if (old) return old.data;
    throw new Error("Rate limited");
  }
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const data = await res.json();
  setCache(endpoint, data, cacheTTL);
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { path, days, page, per_page } = req.query;

    let data;
    switch (path) {
      case "markets":
        data = await fetchCG(
          `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page || 50}&page=${page || 1}&sparkline=true&price_change_percentage=7d,30d`,
          90000
        );
        break;
      case "global":
        data = await fetchCG("/global", 120000);
        break;
      case "trending":
        data = await fetchCG("/search/trending", 300000);
        break;
      default:
        if (path?.startsWith("ohlc/")) {
          const coinId = path.replace("ohlc/", "");
          const raw = await fetchCG(`/coins/${coinId}/ohlc?vs_currency=usd&days=${days || 30}`, 300000);
          data = raw.map((d) => ({ timestamp: d[0], open: d[1], high: d[2], low: d[3], close: d[4] }));
        } else if (path?.startsWith("detail/")) {
          const coinId = path.replace("detail/", "");
          data = await fetchCG(`/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`, 120000);
        } else {
          return res.status(400).json({ error: "Invalid path" });
        }
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
