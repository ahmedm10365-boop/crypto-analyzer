import { useState, useCallback } from "react";

// Simple in-memory watchlist (persists during session only)
let _watchlistIds = new Set<string>();
let _listeners: Array<() => void> = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function useWatchlist() {
  const [, forceUpdate] = useState(0);

  // Subscribe to changes
  useState(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  });

  const add = useCallback((coinId: string) => {
    _watchlistIds = new Set(_watchlistIds);
    _watchlistIds.add(coinId);
    notify();
  }, []);

  const remove = useCallback((coinId: string) => {
    _watchlistIds = new Set(_watchlistIds);
    _watchlistIds.delete(coinId);
    notify();
  }, []);

  const has = useCallback((coinId: string) => _watchlistIds.has(coinId), []);

  return {
    watchlistIds: _watchlistIds,
    add,
    remove,
    has,
  };
}
