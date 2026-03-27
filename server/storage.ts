import { type User, type InsertUser, type Watchlist, type InsertWatchlist, users, watchlist } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getWatchlist(): Promise<Watchlist[]>;
  addToWatchlist(item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(coinId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
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
}

export const storage = new DatabaseStorage();
