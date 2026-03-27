import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
import {
  formatPrice,
  formatMarketCap,
  formatVolume,
  generateSignals,
  generateBuySellZones,
  getOverallVerdict,
  RSI,
  MACD,
  BollingerBands,
  SMA,
  type OHLCData,
  type Signal,
  type BuySellZone,
} from "@/lib/technicalAnalysis";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { useMemo, useState } from "react";

const TIME_PERIODS = [
  { label: "24h", days: "1" },
  { label: "7d", days: "7" },
  { label: "30d", days: "30" },
  { label: "90d", days: "90" },
  { label: "1y", days: "365" },
];

function PriceChange({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums font-medium ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"} ${className}`}>
      {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function SignalIcon({ type }: { type: "buy" | "sell" | "neutral" }) {
  if (type === "buy") return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (type === "sell") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-amber-400" />;
}

function SignalBadge({ signal }: { signal: Signal }) {
  const variant = signal.type === "buy" ? "default" : signal.type === "sell" ? "destructive" : "secondary";
  return (
    <div className="flex items-start gap-3 py-3 px-3 rounded-md bg-accent/30" data-testid={`signal-${signal.indicator}`}>
      <SignalIcon type={signal.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium">{signal.indicator}</span>
          <Badge variant={variant} className="text-[10px] px-1.5 py-0">
            {signal.type.toUpperCase()} · {signal.strength}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{signal.description}</p>
        <p className="text-xs tabular-nums mt-0.5 text-muted-foreground">Value: {signal.value}</p>
      </div>
    </div>
  );
}

function ZoneCard({ zone, currentPrice }: { zone: BuySellZone; currentPrice: number }) {
  const isBuy = zone.type === "buy";
  const distancePercent = isBuy
    ? (((zone.priceMin + zone.priceMax) / 2 - currentPrice) / currentPrice) * 100
    : (((zone.priceMin + zone.priceMax) / 2 - currentPrice) / currentPrice) * 100;

  return (
    <div className={`rounded-md border p-3 ${isBuy ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`} data-testid={`zone-${zone.type}-${zone.priceMin.toFixed(0)}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isBuy ? (
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          ) : (
            <Target className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-semibold ${isBuy ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {isBuy ? "Buy Zone" : "Sell Zone"}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] tabular-nums">
          {zone.confidence}% confidence
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Range</span>
          <p className="font-medium tabular-nums">${formatPrice(zone.priceMin)} – ${formatPrice(zone.priceMax)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Distance</span>
          <p className="font-medium tabular-nums">{distancePercent >= 0 ? "+" : ""}{distancePercent.toFixed(2)}%</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">{zone.reason}</p>
    </div>
  );
}

export default function CoinAnalysis() {
  const params = useParams<{ id: string }>();
  const coinId = params.id || "bitcoin";
  const [selectedDays, setSelectedDays] = useState("30");

  const { data: coinData, isLoading: coinLoading } = useQuery<any>({
    queryKey: ["/api/coins", coinId],
    queryFn: async () => {
      const res = await fetch(`/api/coins/${coinId}`);
      if (!res.ok) throw new Error("Failed to fetch coin data");
      return res.json();
    },
  });

  const { data: ohlcData } = useQuery<number[][]>({
    queryKey: ["/api/coins", coinId, "ohlc", selectedDays],
    queryFn: async () => {
      const res = await fetch(`/api/coins/${coinId}/ohlc?days=${selectedDays}`);
      if (!res.ok) throw new Error("Failed to fetch OHLC data");
      return res.json();
    },
  });

  const { data: chartData } = useQuery<any>({
    queryKey: ["/api/coins", coinId, "market_chart", selectedDays],
    queryFn: async () => {
      const res = await fetch(`/api/coins/${coinId}/market_chart?days=${selectedDays}`);
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json();
    },
  });

  // Process OHLC data
  const processedOHLC: OHLCData[] = useMemo(() => {
    if (!ohlcData) return [];
    return ohlcData.map((d: number[]) => ({
      time: d[0],
      open: d[1],
      high: d[2],
      low: d[3],
      close: d[4],
    }));
  }, [ohlcData]);

  const closes = useMemo(() => processedOHLC.map((d) => d.close), [processedOHLC]);

  // Technical Analysis
  const signals = useMemo(() => generateSignals(closes, processedOHLC), [closes, processedOHLC]);
  const zones = useMemo(() => generateBuySellZones(closes, processedOHLC), [closes, processedOHLC]);
  const verdict = useMemo(() => getOverallVerdict(signals), [signals]);

  // Chart data preparation
  const priceChartData = useMemo(() => {
    if (!chartData?.prices) return [];
    const sma20 = SMA(chartData.prices.map((p: number[]) => p[1]), 20);
    const bb = BollingerBands(chartData.prices.map((p: number[]) => p[1]));
    
    return chartData.prices.map((p: number[], i: number) => ({
      time: p[0],
      date: new Date(p[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: p[1],
      sma20: isNaN(sma20[i]) ? undefined : sma20[i],
      bbUpper: isNaN(bb.upper[i]) ? undefined : bb.upper[i],
      bbLower: isNaN(bb.lower[i]) ? undefined : bb.lower[i],
    }));
  }, [chartData]);

  const rsiChartData = useMemo(() => {
    if (!closes.length) return [];
    const rsi = RSI(closes);
    return processedOHLC.map((d, i) => ({
      time: d.time,
      date: new Date(d.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rsi: isNaN(rsi[i]) ? undefined : rsi[i],
    }));
  }, [closes, processedOHLC]);

  const macdChartData = useMemo(() => {
    if (!closes.length) return [];
    const macd = MACD(closes);
    return processedOHLC.map((d, i) => ({
      time: d.time,
      date: new Date(d.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      macd: isNaN(macd.macdLine[i]) ? undefined : macd.macdLine[i],
      signal: isNaN(macd.signalLine[i]) ? undefined : macd.signalLine[i],
      histogram: isNaN(macd.histogram[i]) ? undefined : macd.histogram[i],
    }));
  }, [closes, processedOHLC]);

  const volumeData = useMemo(() => {
    if (!chartData?.total_volumes) return [];
    return chartData.total_volumes.map((v: number[]) => ({
      time: v[0],
      date: new Date(v[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume: v[1],
    }));
  }, [chartData]);

  if (coinLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const coin = coinData;
  if (!coin) return <div className="text-center py-16 text-muted-foreground">Coin not found</div>;

  const currentPrice = coin.market_data?.current_price?.usd || 0;
  const buyZones = zones.filter((z) => z.type === "buy");
  const sellZones = zones.filter((z) => z.type === "sell");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="mt-1" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            {coin.image?.small && <img src={coin.image.small} alt={coin.name} className="w-8 h-8 rounded-full" />}
            <h1 className="text-xl font-semibold" data-testid="text-coin-name">{coin.name}</h1>
            <Badge variant="outline" className="text-xs uppercase">{coin.symbol}</Badge>
            <Badge variant="secondary" className="text-xs tabular-nums">#{coin.market_cap_rank}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums" data-testid="text-coin-price">
              ${formatPrice(currentPrice)}
            </span>
            <PriceChange value={coin.market_data?.price_change_percentage_24h} className="text-base" />
          </div>
        </div>
      </div>

      {/* Overall Verdict */}
      {signals.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-xl font-bold ${verdict.color}`} data-testid="text-verdict">
                  {verdict.verdict}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  Based on {signals.length} technical indicators
                </div>
              </div>
              <div className="flex items-center gap-1">
                {signals.map((s) => (
                  <div
                    key={s.indicator}
                    className={`w-2 h-8 rounded-full ${
                      s.type === "buy" ? "bg-emerald-500" : s.type === "sell" ? "bg-red-500" : "bg-amber-400"
                    }`}
                    title={`${s.indicator}: ${s.type}`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-3 pb-2 px-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">24h High</p>
            <p className="text-sm font-semibold tabular-nums">${formatPrice(coin.market_data?.high_24h?.usd || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-3 pb-2 px-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">24h Low</p>
            <p className="text-sm font-semibold tabular-nums">${formatPrice(coin.market_data?.low_24h?.usd || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-3 pb-2 px-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Market Cap</p>
            <p className="text-sm font-semibold tabular-nums">{formatMarketCap(coin.market_data?.market_cap?.usd || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-3 pb-2 px-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">24h Volume</p>
            <p className="text-sm font-semibold tabular-nums">{formatVolume(coin.market_data?.total_volume?.usd || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Time period selector */}
      <div className="flex gap-1">
        {TIME_PERIODS.map((tp) => (
          <Button
            key={tp.days}
            variant={selectedDays === tp.days ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedDays(tp.days)}
            className="text-xs"
            data-testid={`button-period-${tp.label}`}
          >
            {tp.label}
          </Button>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="price" className="space-y-4">
        <TabsList className="bg-accent/50">
          <TabsTrigger value="price" className="text-xs">Price</TabsTrigger>
          <TabsTrigger value="rsi" className="text-xs">RSI</TabsTrigger>
          <TabsTrigger value="macd" className="text-xs">MACD</TabsTrigger>
          <TabsTrigger value="volume" className="text-xs">Volume</TabsTrigger>
        </TabsList>

        <TabsContent value="price">
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium">Price Chart with Bollinger Bands & SMA 20</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(v < 1 ? 4 : 2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`$${formatPrice(value)}`, ""]}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="none"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.05}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bbLower"
                    stroke="none"
                    fill="hsl(var(--background))"
                    fillOpacity={1}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls={false}
                    name="BB Upper"
                  />
                  <Line
                    type="monotone"
                    dataKey="bbLower"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls={false}
                    name="BB Lower"
                  />
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    name="SMA 20"
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Price"
                  />
                  {/* Buy/Sell zone reference lines */}
                  {zones.map((zone, i) => (
                    <ReferenceLine
                      key={i}
                      y={(zone.priceMin + zone.priceMax) / 2}
                      stroke={zone.type === "buy" ? "#22c55e" : "#ef4444"}
                      strokeDasharray="6 3"
                      strokeWidth={1}
                      label={{
                        value: `${zone.type === "buy" ? "BUY" : "SELL"} $${formatPrice((zone.priceMin + zone.priceMax) / 2)}`,
                        position: zone.type === "buy" ? "insideBottomRight" : "insideTopRight",
                        fontSize: 10,
                        fill: zone.type === "buy" ? "#22c55e" : "#ef4444",
                      }}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rsi">
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium">Relative Strength Index (RSI 14)</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={rsiChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    ticks={[0, 30, 50, 70, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value?.toFixed(1), "RSI"]}
                  />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Overbought (70)", fontSize: 10, fill: "#ef4444", position: "insideTopRight" }} />
                  <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "Oversold (30)", fontSize: 10, fill: "#22c55e", position: "insideBottomRight" }} />
                  <Area
                    type="monotone"
                    dataKey="rsi"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macd">
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium">MACD (12, 26, 9)</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={macdChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar
                    dataKey="histogram"
                    fill="hsl(var(--chart-1))"
                    opacity={0.5}
                    name="Histogram"
                  />
                  <Line type="monotone" dataKey="macd" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} name="MACD" connectNulls={false} />
                  <Line type="monotone" dataKey="signal" stroke="hsl(var(--chart-5))" strokeWidth={1.5} dot={false} name="Signal" connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume">
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium">Trading Volume</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatVolume(value), "Volume"]}
                  />
                  <Bar dataKey="volume" fill="hsl(var(--primary))" opacity={0.7} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Buy/Sell Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Buy Zones
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {buyZones.length > 0 ? (
              buyZones.map((zone, i) => (
                <ZoneCard key={i} zone={zone} currentPrice={currentPrice} />
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                No clear buy zones detected for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-red-500" />
              Sell Zones
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {sellZones.length > 0 ? (
              sellZones.map((zone, i) => (
                <ZoneCard key={i} zone={zone} currentPrice={currentPrice} />
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                No clear sell zones detected for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Signal Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Technical Indicators</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {signals.length > 0 ? (
              signals.map((signal) => (
                <SignalBadge key={signal.indicator} signal={signal} />
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
                Insufficient data for technical analysis. Try a longer time period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">All-Time High</p>
              <p className="font-medium tabular-nums">${formatPrice(coin.market_data?.ath?.usd || 0)}</p>
              <PriceChange value={coin.market_data?.ath_change_percentage?.usd} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">All-Time Low</p>
              <p className="font-medium tabular-nums">${formatPrice(coin.market_data?.atl?.usd || 0)}</p>
              <PriceChange value={coin.market_data?.atl_change_percentage?.usd} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Circulating Supply</p>
              <p className="font-medium tabular-nums">
                {coin.market_data?.circulating_supply
                  ? `${(coin.market_data.circulating_supply / 1e6).toFixed(2)}M ${coin.symbol?.toUpperCase()}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Supply</p>
              <p className="font-medium tabular-nums">
                {coin.market_data?.max_supply
                  ? `${(coin.market_data.max_supply / 1e6).toFixed(2)}M ${coin.symbol?.toUpperCase()}`
                  : "Unlimited"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center pb-4">
        Disclaimer: This analysis is for informational purposes only. It does not constitute financial advice. 
        Always do your own research (DYOR) before making investment decisions.
      </p>
    </div>
  );
}
