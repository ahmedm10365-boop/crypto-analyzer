import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  BarChart3,
  Activity,
  Loader2,
  Search,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  ComposedChart,
  Area,
} from "recharts";
import type { CoinMarketData, OHLCData } from "@shared/schema";
import {
  calcSMA,
  calcEMA,
  calcRSI,
  calcMACD,
  calcBollingerBands,
  generateSignals,
} from "@/lib/technicalAnalysis";
import { formatPrice, formatPercentage } from "@/lib/format";
import SignalBadge from "@/components/SignalBadge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

export default function Analysis() {
  const [selectedCoin, setSelectedCoin] = useState<string>("bitcoin");
  const [days, setDays] = useState<string>("30");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: coins } = useQuery<CoinMarketData[]>({
    queryKey: ["/api/coins"],
    staleTime: 30000,
  });

  const { data: ohlcData, isLoading: ohlcLoading } = useQuery<OHLCData[]>({
    queryKey: ["/api/coins", selectedCoin, "ohlc", days],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/coins/${selectedCoin}/ohlc?days=${days}`);
      return res.json();
    },
    staleTime: 120000,
  });

  const selectedCoinData = coins?.find((c) => c.id === selectedCoin);

  const filteredCoins = useMemo(() => {
    if (!coins) return [];
    if (!searchQuery) return coins.slice(0, 20);
    return coins.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [coins, searchQuery]);

  const technicalData = useMemo(() => {
    if (!ohlcData || ohlcData.length < 10) return null;

    const closes = ohlcData.map((d) => d.close);
    const sma20 = calcSMA(closes, 20);
    const ema12 = calcEMA(closes, 12);
    const rsi = calcRSI(closes, 14);
    const macd = calcMACD(closes);
    const bb = calcBollingerBands(closes, 20, 2);

    const chartData = ohlcData.map((d, i) => ({
      time: new Date(d.timestamp).toLocaleDateString("ar-SA", {
        month: "short",
        day: "numeric",
      }),
      timestamp: d.timestamp,
      price: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      sma20: isNaN(sma20[i]) ? undefined : sma20[i],
      ema12: isNaN(ema12[i]) ? undefined : ema12[i],
      rsi: isNaN(rsi[i]) ? undefined : rsi[i],
      macd: isNaN(macd.macd[i]) ? undefined : macd.macd[i],
      signal: isNaN(macd.signal[i]) ? undefined : macd.signal[i],
      histogram: isNaN(macd.histogram[i]) ? undefined : macd.histogram[i],
      bbUpper: isNaN(bb.upper[i]) ? undefined : bb.upper[i],
      bbLower: isNaN(bb.lower[i]) ? undefined : bb.lower[i],
      bbMiddle: isNaN(bb.middle[i]) ? undefined : bb.middle[i],
    }));

    const signals = generateSignals(ohlcData);

    return { chartData, signals };
  }, [ohlcData]);

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">التحليل الفني</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            مؤشرات فنية متقدمة وتحليل شامل للأسعار
          </p>
        </div>

        {/* Coin Selector + Period */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-coin"
              placeholder="ابحث عن عملة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {[
              { value: "7", label: "7 أيام" },
              { value: "30", label: "30 يوم" },
              { value: "90", label: "90 يوم" },
              { value: "365", label: "سنة" },
            ].map((period) => (
              <button
                key={period.value}
                data-testid={`period-${period.value}`}
                onClick={() => setDays(period.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  days === period.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Coin Chips */}
        <div className="flex flex-wrap gap-2">
          {filteredCoins.slice(0, 15).map((coin) => (
            <button
              key={coin.id}
              data-testid={`chip-${coin.id}`}
              onClick={() => setSelectedCoin(coin.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCoin === coin.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-card-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <img src={coin.image} alt={coin.name} className="w-4 h-4 rounded-full" crossOrigin="anonymous" />
              {coin.symbol.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Selected Coin Info */}
        {selectedCoinData && (
          <div className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-4">
            <img
              src={selectedCoinData.image}
              alt={selectedCoinData.name}
              className="w-10 h-10 rounded-full"
              crossOrigin="anonymous"
            />
            <div>
              <h2 className="text-base font-semibold">
                {selectedCoinData.name}
                <span className="text-muted-foreground text-xs mr-1.5 uppercase">
                  {selectedCoinData.symbol}
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-lg font-semibold tabular-nums">
                  ${formatPrice(selectedCoinData.current_price)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    selectedCoinData.price_change_percentage_24h >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {formatPercentage(selectedCoinData.price_change_percentage_24h)}
                </span>
              </div>
            </div>
          </div>
        )}

        {ohlcLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
        ) : technicalData ? (
          <>
            {/* Price + Moving Averages + Bollinger */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  السعر مع المتوسطات المتحركة وبولنجر باند
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={technicalData.chartData}>
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
                      name === "price"
                        ? "السعر"
                        : name === "sma20"
                        ? "SMA 20"
                        : name === "ema12"
                        ? "EMA 12"
                        : name === "bbUpper"
                        ? "بولنجر العلوي"
                        : name === "bbLower"
                        ? "بولنجر السفلي"
                        : name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="none"
                    fill="hsl(192, 85%, 50%)"
                    fillOpacity={0.05}
                  />
                  <Area
                    type="monotone"
                    dataKey="bbLower"
                    stroke="none"
                    fill="transparent"
                  />
                  <Line
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="hsl(192, 85%, 50%)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    strokeOpacity={0.4}
                  />
                  <Line
                    type="monotone"
                    dataKey="bbLower"
                    stroke="hsl(192, 85%, 50%)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    strokeOpacity={0.4}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(210, 20%, 92%)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="hsl(38, 92%, 50%)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeOpacity={0.7}
                  />
                  <Line
                    type="monotone"
                    dataKey="ema12"
                    stroke="hsl(142, 62%, 50%)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeOpacity={0.7}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-3 h-0.5 bg-foreground rounded" /> السعر
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(38, 92%, 50%)" }} /> SMA 20
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(142, 62%, 50%)" }} /> EMA 12
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-3 h-0.5 rounded border-dashed" style={{ borderBottom: "1px dashed hsl(192, 85%, 50%)" }} /> بولنجر
                </span>
              </div>
            </div>

            {/* RSI Chart */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                مؤشر القوة النسبية (RSI)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={technicalData.chartData}>
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
                    formatter={(value: number) => [value.toFixed(2), "RSI"]}
                  />
                  <ReferenceLine y={70} stroke="hsl(0, 72%, 51%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={30} stroke="hsl(142, 62%, 45%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="hsl(262, 60%, 55%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-1">
                <span className="text-[10px] text-red-500/70">فوق 70 = تشبع شرائي</span>
                <span className="text-[10px] text-green-500/70">تحت 30 = تشبع بيعي</span>
              </div>
            </div>

            {/* MACD Chart */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                MACD
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={technicalData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 15%, 14%)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "hsl(210, 10%, 55%)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(210, 10%, 55%)" }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(225, 22%, 8%)",
                      border: "1px solid hsl(225, 15%, 14%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(225, 15%, 20%)" />
                  <Bar
                    dataKey="histogram"
                    fill="hsl(192, 85%, 50%)"
                    fillOpacity={0.4}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="macd"
                    stroke="hsl(192, 85%, 50%)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="signal"
                    stroke="hsl(38, 92%, 50%)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(192, 85%, 50%)" }} /> MACD
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(38, 92%, 50%)" }} /> خط الإشارة
                </span>
              </div>
            </div>

            {/* Signals Summary Table */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">ملخص المؤشرات الفنية</h3>
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
                  {technicalData.signals.map((sig, idx) => (
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
                              className={`h-full rounded-full transition-all ${
                                sig.signal === "شراء"
                                  ? "bg-green-500"
                                  : sig.signal === "بيع"
                                  ? "bg-red-500"
                                  : "bg-muted-foreground"
                              }`}
                              style={{ width: `${sig.strength}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {sig.strength}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p className="text-sm">اختر عملة وفترة زمنية لعرض التحليل</p>
          </div>
        )}
      </div>
    </div>
  );
}
