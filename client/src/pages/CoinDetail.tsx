import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useMemo } from "react";
import {
  ArrowRight,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  ShieldAlert,
} from "lucide-react";
import type { CoinDetail as CoinDetailType, OHLCData, Watchlist } from "@shared/schema";
import { formatPrice, formatMarketCap, formatPercentage } from "@/lib/format";
import { generateRecommendation, generateSignals } from "@/lib/technicalAnalysis";
import SignalBadge from "@/components/SignalBadge";
import SparklineChart from "@/components/SparklineChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchCoinDetail, fetchOHLC } from "@/lib/api";
import { useWatchlist } from "@/lib/watchlistStore";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { calcRSI, calcSMA, calcEMA, calcMACD, calcBollingerBands } from "@/lib/technicalAnalysis";

export default function CoinDetail() {
  const [match, params] = useRoute("/coin/:id");
  const coinId = params?.id || "";
  const { toast } = useToast();

  const { data: coin, isLoading } = useQuery<CoinDetailType>({
    queryKey: ["coin-detail", coinId],
    queryFn: () => fetchCoinDetail(coinId),
    enabled: !!coinId,
  });

  const { data: ohlcData } = useQuery<OHLCData[]>({
    queryKey: ["ohlc", coinId, "30"],
    queryFn: () => fetchOHLC(coinId, 30),
    enabled: !!coinId,
    staleTime: 120000,
  });

  const { watchlistIds, add, remove, has } = useWatchlist();
  const isInWatchlist = has(coinId);

  const handleToggleWatchlist = () => {
    if (isInWatchlist) {
      remove(coinId);
      toast({ title: "تم الحذف من المفضلة" });
    } else {
      add(coinId);
      toast({ title: "تمت الإضافة للمفضلة" });
    }
  };

  const analysis = useMemo(() => {
    if (!ohlcData || ohlcData.length < 30 || !coin) return null;

    const closes = ohlcData.map((d) => d.close);
    const sma20 = calcSMA(closes, 20);
    const ema12 = calcEMA(closes, 12);
    const rsi = calcRSI(closes, 14);
    const macd = calcMACD(closes);

    const chartData = ohlcData.map((d, i) => ({
      time: new Date(d.timestamp).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
      price: d.close,
      sma20: isNaN(sma20[i]) ? undefined : sma20[i],
      ema12: isNaN(ema12[i]) ? undefined : ema12[i],
      rsi: isNaN(rsi[i]) ? undefined : rsi[i],
    }));

    const signals = generateSignals(ohlcData);
    const recommendation = generateRecommendation(
      coinId,
      coin.symbol,
      coin.name,
      coin.market_data.current_price.usd,
      ohlcData,
      coin.market_data.price_change_percentage_24h,
      coin.market_data.price_change_percentage_7d,
      coin.market_data.price_change_percentage_30d
    );

    return { chartData, signals, recommendation };
  }, [ohlcData, coin, coinId]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6" dir="rtl">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="flex-1 flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">لم يتم العثور على العملة</p>
      </div>
    );
  }

  const md = coin.market_data;

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/">
            <span className="hover:text-foreground cursor-pointer">الرئيسية</span>
          </Link>
          <ArrowRight className="w-3 h-3 rotate-180" />
          <span className="text-foreground">{coin.name}</span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <img
              src={coin.image.large}
              alt={coin.name}
              className="w-10 h-10 rounded-full"
              crossOrigin="anonymous"
            />
            <div>
              <h1 className="text-xl font-semibold">
                {coin.name}
                <span className="text-muted-foreground text-sm mr-2 uppercase">{coin.symbol}</span>
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-lg font-semibold tabular-nums">
                  ${formatPrice(md.current_price.usd)}
                </span>
                <span
                  className={`text-sm font-medium ${
                    md.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatPercentage(md.price_change_percentage_24h)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {analysis?.recommendation && (
              <SignalBadge signal={analysis.recommendation.action} size="lg" />
            )}
            <Button
              data-testid="button-toggle-watchlist"
              variant={isInWatchlist ? "default" : "outline"}
              size="sm"
              onClick={handleToggleWatchlist}
              className="gap-1.5"
            >
              <Star className={`w-3.5 h-3.5 ${isInWatchlist ? "fill-current" : ""}`} />
              {isInWatchlist ? "في المفضلة" : "أضف للمفضلة"}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "القيمة السوقية", value: formatMarketCap(md.market_cap.usd) },
            { label: "حجم التداول 24h", value: formatMarketCap(md.total_volume.usd) },
            {
              label: "أعلى سعر 24h",
              value: `$${formatPrice(md.high_24h.usd)}`,
            },
            {
              label: "أدنى سعر 24h",
              value: `$${formatPrice(md.low_24h.usd)}`,
            },
            {
              label: "تغير 7 أيام",
              value: formatPercentage(md.price_change_percentage_7d),
              isChange: true,
              changeVal: md.price_change_percentage_7d,
            },
            {
              label: "تغير 30 يوم",
              value: formatPercentage(md.price_change_percentage_30d),
              isChange: true,
              changeVal: md.price_change_percentage_30d,
            },
            {
              label: "أعلى سعر تاريخي",
              value: `$${formatPrice(md.ath.usd)}`,
            },
            {
              label: "المعروض المتداول",
              value: md.circulating_supply.toLocaleString("en-US", { maximumFractionDigits: 0 }),
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-card border border-card-border rounded-xl p-3.5 space-y-1"
            >
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  (stat as any).isChange
                    ? (stat as any).changeVal >= 0
                      ? "text-green-500"
                      : "text-red-500"
                    : ""
                }`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Recommendation Card */}
        {analysis?.recommendation && (
          <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              التوصية التفصيلية
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground">التوصية</p>
                <div className="mt-1">
                  <SignalBadge signal={analysis.recommendation.action} size="md" />
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground">نسبة الثقة</p>
                <p className="text-base font-semibold text-primary mt-1 tabular-nums">
                  {analysis.recommendation.confidence}%
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-[10px] text-green-500">الهدف</p>
                <p className="text-base font-semibold text-green-500 mt-1 tabular-nums">
                  ${formatPrice(analysis.recommendation.targetPrice)}
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-[10px] text-red-500">وقف الخسارة</p>
                <p className="text-base font-semibold text-red-500 mt-1 tabular-nums">
                  ${formatPrice(analysis.recommendation.stopLoss)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {analysis.recommendation.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Activity className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Chart */}
        {analysis?.chartData && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">السعر (30 يوم)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={analysis.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 15%, 14%)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(210, 10%, 55%)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "hsl(210, 10%, 55%)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${formatPrice(v)}`}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(225, 22%, 8%)",
                    border: "1px solid hsl(225, 15%, 14%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    `$${formatPrice(value)}`,
                    name === "price" ? "السعر" : name === "sma20" ? "SMA 20" : "EMA 12",
                  ]}
                />
                <Line type="monotone" dataKey="price" stroke="hsl(210, 20%, 92%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sma20" stroke="hsl(38, 92%, 50%)" strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
                <Line type="monotone" dataKey="ema12" stroke="hsl(142, 62%, 50%)" strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* RSI Chart */}
        {analysis?.chartData && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">RSI (14)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={analysis.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 15%, 14%)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(210, 10%, 55%)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "hsl(210, 10%, 55%)" }}
                  tickLine={false}
                  axisLine={false}
                  ticks={[30, 50, 70]}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(225, 22%, 8%)",
                    border: "1px solid hsl(225, 15%, 14%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine y={70} stroke="hsl(0, 72%, 51%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={30} stroke="hsl(142, 62%, 45%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="rsi" stroke="hsl(262, 60%, 55%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Signals Table */}
        {analysis?.signals && analysis.signals.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">المؤشرات الفنية</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-muted-foreground border-b border-border">
                  <th className="text-right px-4 py-2.5 font-medium">المؤشر</th>
                  <th className="text-right px-4 py-2.5 font-medium">القيمة</th>
                  <th className="text-right px-4 py-2.5 font-medium">الإشارة</th>
                  <th className="text-right px-4 py-2.5 font-medium">القوة</th>
                </tr>
              </thead>
              <tbody>
                {analysis.signals.map((sig, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-xs font-medium">{sig.indicator}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {sig.value.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <SignalBadge signal={sig.signal} size="sm" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sig.signal === "شراء" ? "bg-green-500" : sig.signal === "بيع" ? "bg-red-500" : "bg-muted-foreground"
                            }`}
                            style={{ width: `${sig.strength}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{sig.strength}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
