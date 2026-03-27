import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatPrice, formatMarketCap, formatVolume } from "@/lib/technicalAnalysis";

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
  sparkline_in_7d: { price: number[] };
  high_24h: number;
  low_24h: number;
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block">
      <polyline points={points} fill="none" stroke={positive ? "hsl(var(--color-gain))" : "hsl(var(--color-loss))"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PriceChange({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums font-medium text-xs ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default function Markets() {
  const [search, setSearch] = useState("");

  const { data: coins, isLoading } = useQuery<CoinData[]>({
    queryKey: ["/api/coins"],
    refetchInterval: 60000,
  });

  const filtered = useMemo(() => {
    if (!coins) return [];
    if (!search) return coins;
    const q = search.toLowerCase();
    return coins.filter(
      (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );
  }, [coins, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-markets-title">Markets</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and analyze all cryptocurrencies</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search coins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
            data-testid="input-search"
          />
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium w-12">#</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Coin</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Price</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">1h</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">24h</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">7d</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Market Cap</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">Volume (24h)</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">7d Chart</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(20)].map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-14 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-14 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-14 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No coins found matching "{search}"
                    </td>
                  </tr>
                ) : (
                  filtered.map((coin) => (
                    <tr
                      key={coin.id}
                      className="border-b border-border/30 hover:bg-accent/30 cursor-pointer transition-colors"
                      data-testid={`row-market-${coin.id}`}
                    >
                      <td className="py-3 px-4 text-xs text-muted-foreground tabular-nums">{coin.market_cap_rank}</td>
                      <td className="py-3 px-4">
                        <Link href={`/coin/${coin.id}`}>
                          <div className="flex items-center gap-2.5">
                            <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                            <div>
                              <span className="font-medium">{coin.name}</span>
                              <span className="text-xs text-muted-foreground uppercase ml-1.5">{coin.symbol}</span>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">${formatPrice(coin.current_price)}</td>
                      <td className="py-3 px-4 text-right"><PriceChange value={coin.price_change_percentage_1h_in_currency} /></td>
                      <td className="py-3 px-4 text-right"><PriceChange value={coin.price_change_percentage_24h} /></td>
                      <td className="py-3 px-4 text-right"><PriceChange value={coin.price_change_percentage_7d_in_currency} /></td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{formatMarketCap(coin.market_cap)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground hidden lg:table-cell">{formatVolume(coin.total_volume)}</td>
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        {coin.sparkline_in_7d?.price && (
                          <MiniSparkline data={coin.sparkline_in_7d.price} positive={(coin.price_change_percentage_7d_in_currency || 0) >= 0} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
