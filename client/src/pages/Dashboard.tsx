import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
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

interface GlobalData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_percentage: { btc: number; eth: number };
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
  };
}

interface TrendingData {
  coins: Array<{
    item: {
      id: string;
      name: string;
      symbol: string;
      thumb: string;
      score: number;
      data?: {
        price: number;
        price_change_percentage_24h?: { usd: number };
      };
    };
  }>;
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
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "hsl(var(--color-gain))" : "hsl(var(--color-loss))"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PriceChange({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums font-medium ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default function Dashboard() {
  const { data: coins, isLoading: coinsLoading } = useQuery<CoinData[]>({
    queryKey: ["/api/coins"],
    refetchInterval: 60000,
  });

  const { data: globalData } = useQuery<GlobalData>({
    queryKey: ["/api/global"],
    refetchInterval: 120000,
  });

  const { data: trending } = useQuery<TrendingData>({
    queryKey: ["/api/trending"],
    refetchInterval: 300000,
  });

  const topCoins = coins?.slice(0, 20);
  const topGainers = coins?.slice()
    .filter(c => c.price_change_percentage_24h != null)
    .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
    .slice(0, 5);
  const topLosers = coins?.slice()
    .filter(c => c.price_change_percentage_24h != null)
    .sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Market Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time cryptocurrency market data and analysis</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Total Market Cap</span>
            </div>
            <div className="text-lg font-semibold tabular-nums" data-testid="text-total-mcap">
              {globalData ? formatMarketCap(globalData.data.total_market_cap.usd) : <Skeleton className="h-6 w-24" />}
            </div>
            {globalData && (
              <PriceChange value={globalData.data.market_cap_change_percentage_24h_usd} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">24h Volume</span>
            </div>
            <div className="text-lg font-semibold tabular-nums" data-testid="text-total-volume">
              {globalData ? formatVolume(globalData.data.total_volume.usd) : <Skeleton className="h-6 w-24" />}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">BTC Dominance</span>
            </div>
            <div className="text-lg font-semibold tabular-nums" data-testid="text-btc-dominance">
              {globalData ? `${globalData.data.market_cap_percentage.btc.toFixed(1)}%` : <Skeleton className="h-6 w-16" />}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Active Coins</span>
            </div>
            <div className="text-lg font-semibold tabular-nums" data-testid="text-active-coins">
              {globalData ? globalData.data.active_cryptocurrencies.toLocaleString() : <Skeleton className="h-6 w-16" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Gainers / Losers row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Top Gainers (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {topGainers ? (
              <div className="space-y-2">
                {topGainers.map((coin) => (
                  <Link key={coin.id} href={`/coin/${coin.id}`}>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors" data-testid={`link-gainer-${coin.id}`}>
                      <div className="flex items-center gap-2">
                        <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
                        <span className="text-sm font-medium">{coin.symbol.toUpperCase()}</span>
                      </div>
                      <PriceChange value={coin.price_change_percentage_24h} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Top Losers (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {topLosers ? (
              <div className="space-y-2">
                {topLosers.map((coin) => (
                  <Link key={coin.id} href={`/coin/${coin.id}`}>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors" data-testid={`link-loser-${coin.id}`}>
                      <div className="flex items-center gap-2">
                        <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
                        <span className="text-sm font-medium">{coin.symbol.toUpperCase()}</span>
                      </div>
                      <PriceChange value={coin.price_change_percentage_24h} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Top Cryptocurrencies by Market Cap</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Coin</th>
                  <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium">Price</th>
                  <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium">1h</th>
                  <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium">24h</th>
                  <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium">7d</th>
                  <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium">Market Cap</th>
                  <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">Volume (24h)</th>
                  <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">7d Chart</th>
                </tr>
              </thead>
              <tbody>
                {coinsLoading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  topCoins?.map((coin) => (
                    <tr
                      key={coin.id}
                      className="border-b border-border/30 hover:bg-accent/30 cursor-pointer transition-colors"
                      data-testid={`row-coin-${coin.id}`}
                    >
                      <td className="py-3 px-4 text-xs text-muted-foreground tabular-nums">{coin.market_cap_rank}</td>
                      <td className="py-3 px-4">
                        <Link href={`/coin/${coin.id}`}>
                          <div className="flex items-center gap-2">
                            <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                            <span className="font-medium">{coin.name}</span>
                            <span className="text-xs text-muted-foreground uppercase">{coin.symbol}</span>
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
                          <MiniSparkline
                            data={coin.sparkline_in_7d.price}
                            positive={(coin.price_change_percentage_7d_in_currency || 0) >= 0}
                          />
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

      {/* Trending */}
      {trending?.coins && trending.coins.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Trending Now
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {trending.coins.slice(0, 7).map((t) => (
                <Link key={t.item.id} href={`/coin/${t.item.id}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-accent transition-colors px-3 py-1.5" data-testid={`badge-trending-${t.item.id}`}>
                    <img src={t.item.thumb} alt={t.item.name} className="w-4 h-4 rounded-full mr-1.5" />
                    {t.item.name}
                    <span className="text-muted-foreground ml-1 uppercase text-[10px]">{t.item.symbol}</span>
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
