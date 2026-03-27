import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// CoinGecko free API base
const CG_BASE = "https://api.coingecko.com/api/v3";

async function fetchCG(path: string) {
  const res = await fetch(`${CG_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  return res.json();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Unified coins endpoint (supports query params for Vercel compatibility)
  app.get("/api/coins", async (req, res) => {
    try {
      const { id, action, days, page, per_page: perPage } = req.query;

      if (id && action === "ohlc") {
        const data = await fetchCG(`/coins/${id}/ohlc?vs_currency=usd&days=${days || "30"}`);
        return res.json(data);
      } else if (id && action === "market_chart") {
        const data = await fetchCG(`/coins/${id}/market_chart?vs_currency=usd&days=${days || "30"}`);
        return res.json(data);
      } else if (id) {
        const data = await fetchCG(`/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`);
        return res.json(data);
      } else {
        const data = await fetchCG(
          `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage || "50"}&page=${page || "1"}&sparkline=true&price_change_percentage=1h,24h,7d`
        );
        return res.json(data);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get trending coins
  app.get("/api/trending", async (_req, res) => {
    try {
      const data = await fetchCG(`/search/trending`);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get global market data
  app.get("/api/global", async (_req, res) => {
    try {
      const data = await fetchCG(`/global`);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Watchlist CRUD
  app.get("/api/watchlist", async (_req, res) => {
    try {
      const items = await storage.getWatchlist();
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const item = await storage.addToWatchlist(req.body);
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/watchlist/:coinId", async (req, res) => {
    try {
      await storage.removeFromWatchlist(req.params.coinId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
