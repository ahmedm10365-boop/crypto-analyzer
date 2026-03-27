const CG_BASE = "https://api.coingecko.com/api/v3";

export default async function handler(req, res) {
  // Handle both /api/coins and /api/coins/[id] via query params
  const { id, action, days } = req.query;

  try {
    let url;

    if (id && action === "ohlc") {
      url = `${CG_BASE}/coins/${id}/ohlc?vs_currency=usd&days=${days || "30"}`;
    } else if (id && action === "market_chart") {
      url = `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days || "30"}`;
    } else if (id) {
      url = `${CG_BASE}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`;
    } else {
      const page = req.query.page || "1";
      const perPage = req.query.per_page || "50";
      url = `${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`;
    }

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `CoinGecko API error: ${response.status}` });
    }

    const data = await response.json();
    
    // Cache for 30 seconds
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
