const CG_BASE = "https://api.coingecko.com/api/v3";

export default async function handler(req, res) {
  try {
    const response = await fetch(`${CG_BASE}/global`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `CoinGecko API error: ${response.status}` });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
