import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Globe,
  TrendingUp,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  RefreshCw,
  Flame,
} from "lucide-react";
import type { CoinMarketData } from "@shared/schema";
import KPICard from "@/components/KPICard";
import SparklineChart from "@/components/SparklineChart";
import { formatPrice, formatMarketCap, formatPercentage } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { data: coins, isLoading: coinsLoading, refetch: refetchCoins } = useQuery<CoinMarketData[]>({
    queryKey: ["/api/coins"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: globalData, isLoading: globalLoading } = useQuery<any>({
    queryKey: ["/api/global"],
    staleTime: 60000,
  });

  const { data: trending } = useQuery<any>({
    queryKey: ["/api/trending"],
    staleTime: 120000,
  });

  const global = globalData?.data;

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">نظرة عامة على السوق</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              بيانات حية من السوق العالمي للعملات الرقمية
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
              بيانات حية
            </span>
            <button
              data-testid="button-refresh"
              onClick={() => refetchCoins()}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {globalLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))
          ) : global ? (
            <>
              <KPICard
                label="القيمة السوقية الكلية"
                value={formatMarketCap(global.total_market_cap?.usd || 0)}
                change={global.market_cap_change_percentage_24h_usd}
                icon={<Globe className="w-4 h-4" />}
              />
              <KPICard
                label="حجم التداول 24 ساعة"
                value={formatMarketCap(global.total_volume?.usd || 0)}
                icon={<BarChart3 className="w-4 h-4" />}
              />
              <KPICard
                label="هيمنة البيتكوين"
                value={`${(global.market_cap_percentage?.btc || 0).toFixed(1)}%`}
                icon={<DollarSign className="w-4 h-4" />}
              />
              <KPICard
                label="عدد العملات النشطة"
                value={(global.active_cryptocurrencies || 0).toLocaleString()}
                icon={<TrendingUp className="w-4 h-4" />}
              />
            </>
          ) : null}
        </div>

        {/* Trending + Top Coins Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
          {/* Coins Table */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">أفضل العملات حسب القيمة السوقية</h2>
              <span className="text-[11px] text-muted-foreground">
                {coins?.length || 0} عملة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-muted-foreground border-b border-border">
                    <th className="text-right px-4 py-2.5 font-medium">#</th>
                    <th className="text-right px-4 py-2.5 font-medium">العملة</th>
                    <th className="text-right px-4 py-2.5 font-medium">السعر</th>
                    <th className="text-right px-4 py-2.5 font-medium">24 ساعة</th>
                    <th className="text-right px-4 py-2.5 font-medium">7 أيام</th>
                    <th className="text-right px-4 py-2.5 font-medium">القيمة السوقية</th>
                    <th className="text-right px-4 py-2.5 font-medium">الرسم البياني</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {coinsLoading
                    ? Array.from({ length: 15 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-3" colSpan={8}>
                            <Skeleton className="h-5 w-full" />
                          </td>
                        </tr>
                      ))
                    : coins?.slice(0, 30).map((coin) => (
                        <tr
                          key={coin.id}
                          data-testid={`row-coin-${coin.id}`}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {coin.market_cap_rank}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/coin/${coin.id}`}>
                              <div className="flex items-center gap-2.5 cursor-pointer">
                                <img
                                  src={coin.image}
                                  alt={coin.name}
                                  className="w-6 h-6 rounded-full"
                                  crossOrigin="anonymous"
                                />
                                <div>
                                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    {coin.name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground mr-1.5 uppercase">
                                    {coin.symbol}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium tabular-nums">
                            ${formatPrice(coin.current_price)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium tabular-nums ${
                                coin.price_change_percentage_24h >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              <span className="inline-flex items-center gap-0.5">
                                {coin.price_change_percentage_24h >= 0 ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" />
                                )}
                                {formatPercentage(coin.price_change_percentage_24h)}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium tabular-nums ${
                                (coin.price_change_percentage_7d_in_currency || 0) >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {formatPercentage(coin.price_change_percentage_7d_in_currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                            {formatMarketCap(coin.market_cap)}
                          </td>
                          <td className="px-4 py-3">
                            {coin.sparkline_in_7d?.price && (
                              <SparklineChart
                                data={coin.sparkline_in_7d.price}
                                isPositive={(coin.price_change_percentage_7d_in_currency || 0) >= 0}
                                width={100}
                                height={28}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/coin/${coin.id}`}>
                              <span className="text-primary/60 hover:text-primary transition-colors cursor-pointer">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trending Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <h3 className="text-sm font-semibold">الأكثر رواجاً</h3>
              </div>
              <div className="divide-y divide-border/50">
                {trending?.coins?.slice(0, 7).map((item: any, idx: number) => (
                  <Link key={item.item.id} href={`/coin/${item.item.id}`}>
                    <div
                      data-testid={`trending-${item.item.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <span className="text-[11px] text-muted-foreground/60 w-4">{idx + 1}</span>
                      <img
                        src={item.item.small}
                        alt={item.item.name}
                        className="w-5 h-5 rounded-full"
                        crossOrigin="anonymous"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {item.item.symbol}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        #{item.item.market_cap_rank || "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">أسرع الرابحين (24 ساعة)</h3>
              <div className="space-y-2">
                {coins
                  ?.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
                  .slice(0, 5)
                  .map((coin) => (
                    <Link key={coin.id} href={`/coin/${coin.id}`}>
                      <div className="flex items-center justify-between py-1 cursor-pointer hover:opacity-80">
                        <div className="flex items-center gap-2">
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="w-4 h-4 rounded-full"
                            crossOrigin="anonymous"
                          />
                          <span className="text-xs font-medium">{coin.symbol.toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-medium text-green-500 tabular-nums">
                          {formatPercentage(coin.price_change_percentage_24h)}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
