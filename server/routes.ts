import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistSchema } from "@shared/schema";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Simple in-memory cache to handle CoinGecko rate limits
const cache = new Map<string, { data: any; expiry: number }>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

async function fetchCoinGecko(endpoint: string, cacheTTL: number = 60000) {
  const cacheKey = endpoint;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${COINGECKO_BASE}${endpoint}`, {
    headers: { accept: "application/json" },
  });
  
  if (res.status === 429) {
    // Rate limited - return cached data if available (even expired)
    const entry = cache.get(cacheKey);
    if (entry) return entry.data;
    throw new Error("Rate limited by CoinGecko. Please try again shortly.");
  }
  
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  
  const data = await res.json();
  setCache(cacheKey, data, cacheTTL);
  return data;
}

// Delay between requests to avoid rate limits
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get top coins by market cap
  app.get("/api/coins", async (req, res) => {
    try {
      const page = req.query.page || "1";
      const perPage = req.query.per_page || "50";
      const data = await fetchCoinGecko(
        `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=7d,30d`,
        90000 // cache 90 seconds
      );
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get coin detail
  app.get("/api/coins/:id/detail", async (req, res) => {
    try {
      const data = await fetchCoinGecko(
        `/coins/${req.params.id}?localization=false&tickers=false&community_data=false&developer_data=false`,
        120000 // cache 2 minutes
      );
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get OHLC data for charts
  app.get("/api/coins/:id/ohlc", async (req, res) => {
    try {
      const days = req.query.days || "30";
      const data = await fetchCoinGecko(
        `/coins/${req.params.id}/ohlc?vs_currency=usd&days=${days}`,
        300000 // cache 5 minutes
      );
      // CoinGecko returns [timestamp, open, high, low, close]
      const formatted = data.map((d: number[]) => ({
        timestamp: d[0],
        open: d[1],
        high: d[2],
        low: d[3],
        close: d[4],
      }));
      res.json(formatted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get market chart data (price history)
  app.get("/api/coins/:id/chart", async (req, res) => {
    try {
      const days = req.query.days || "30";
      const data = await fetchCoinGecko(
        `/coins/${req.params.id}/market_chart?vs_currency=usd&days=${days}`,
        300000 // cache 5 minutes
      );
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Global market data
  app.get("/api/global", async (_req, res) => {
    try {
      const data = await fetchCoinGecko("/global", 120000);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trending coins
  app.get("/api/trending", async (_req, res) => {
    try {
      const data = await fetchCoinGecko("/search/trending", 300000);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Watchlist CRUD
  app.get("/api/watchlist", async (_req, res) => {
    try {
      const items = await storage.getWatchlist();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const parsed = insertWatchlistSchema.parse(req.body);
      const item = await storage.addToWatchlist(parsed);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/watchlist/:coinId", async (req, res) => {
    try {
      await storage.removeFromWatchlist(req.params.coinId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
