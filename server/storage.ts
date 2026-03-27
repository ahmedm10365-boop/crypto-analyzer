import { type Watchlist, type InsertWatchlist, watchlist } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getWatchlist(): Promise<Watchlist[]>;
  addToWatchlist(item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(coinId: string): Promise<void>;
  isInWatchlist(coinId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coin_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL
      )
    `);
  }

  async getWatchlist(): Promise<Watchlist[]> {
    return db.select().from(watchlist).all();
  }

  async addToWatchlist(item: InsertWatchlist): Promise<Watchlist> {
    return db.insert(watchlist).values(item).returning().get();
  }

  async removeFromWatchlist(coinId: string): Promise<void> {
    db.delete(watchlist).where(eq(watchlist.coinId, coinId)).run();
  }

  async isInWatchlist(coinId: string): Promise<boolean> {
    const result = db.select().from(watchlist).where(eq(watchlist.coinId, coinId)).get();
    return !!result;
  }
}

export const storage = new DatabaseStorage();
