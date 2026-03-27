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
  
  // Get top coins market data
  app.get("/api/coins", async (req, res) => {
    try {
      const page = req.query.page || "1";
      const perPage = req.query.per_page || "50";
      const data = await fetchCG(
        `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`
      );
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single coin details
  app.get("/api/coins/:id", async (req, res) => {
    try {
      const data = await fetchCG(
        `/coins/${req.params.id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`
      );
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get OHLC data for candlestick charts
  app.get("/api/coins/:id/ohlc", async (req, res) => {
    try {
      const days = req.query.days || "30";
      const data = await fetchCG(
        `/coins/${req.params.id}/ohlc?vs_currency=usd&days=${days}`
      );
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get market chart data (price, volume, market cap)
  app.get("/api/coins/:id/market_chart", async (req, res) => {
    try {
      const days = req.query.days || "30";
      const data = await fetchCG(
        `/coins/${req.params.id}/market_chart?vs_currency=usd&days=${days}`
      );
      res.json(data);
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
