import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Loader2,
} from "lucide-react";
import type { CoinMarketData, OHLCData, TradeRecommendation } from "@shared/schema";
import { generateRecommendation } from "@/lib/technicalAnalysis";
import { formatPrice, formatPercentage } from "@/lib/format";
import SignalBadge from "@/components/SignalBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCoins, fetchOHLC } from "@/lib/api";

function CoinRecommendation({ coin }: { coin: CoinMarketData }) {
  const { data: ohlcData, isLoading } = useQuery<OHLCData[]>({
    queryKey: ["ohlc", coin.id],
    queryFn: () => fetchOHLC(coin.id, 30),
    staleTime: 300000,
  });

  const recommendation = useMemo(() => {
    if (!ohlcData || ohlcData.length < 30) return null;
    return generateRecommendation(
      coin.id,
      coin.symbol,
      coin.name,
      coin.current_price,
      ohlcData,
      coin.price_change_percentage_24h,
      coin.price_change_percentage_7d_in_currency,
      coin.price_change_percentage_30d_in_currency
    );
  }, [ohlcData, coin]);

  if (isLoading) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-24 h-4" />
        </div>
        <Skeleton className="w-full h-20" />
      </div>
    );
  }

  if (!recommendation) return null;

  const isBuy = recommendation.action.includes("شراء");
  const isSell = recommendation.action.includes("بيع");

  return (
    <div
      data-testid={`recommendation-${coin.id}`}
      className={`bg-card border rounded-xl overflow-hidden transition-all hover:shadow-md ${
        isBuy
          ? "border-green-500/20"
          : isSell
          ? "border-red-500/20"
          : "border-card-border"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <Link href={`/coin/${coin.id}`}>
          <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80">
            <img
              src={coin.image}
              alt={coin.name}
              className="w-7 h-7 rounded-full"
              crossOrigin="anonymous"
            />
            <div>
              <span className="text-sm font-semibold">{coin.name}</span>
              <span className="text-[11px] text-muted-foreground mr-1.5 uppercase">
                {coin.symbol}
              </span>
            </div>
          </div>
        </Link>
        <SignalBadge signal={recommendation.action} size="md" />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Price + Confidence */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">السعر الحالي</p>
            <p className="text-base font-semibold tabular-nums">${formatPrice(coin.current_price)}</p>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-muted-foreground">نسبة الثقة</p>
            <p className="text-base font-semibold tabular-nums text-primary">
              {recommendation.confidence}%
            </p>
          </div>
        </div>

        {/* Targets */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              <Target className="w-2.5 h-2.5" />
              سعر الدخول
            </p>
            <p className="text-xs font-medium tabular-nums mt-0.5">
              ${formatPrice(recommendation.entryPrice)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-green-500 flex items-center justify-center gap-0.5">
              <ArrowUpRight className="w-2.5 h-2.5" />
              الهدف
            </p>
            <p className="text-xs font-medium tabular-nums text-green-500 mt-0.5">
              ${formatPrice(recommendation.targetPrice)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-red-500 flex items-center justify-center gap-0.5">
              <ShieldAlert className="w-2.5 h-2.5" />
              وقف الخسارة
            </p>
            <p className="text-xs font-medium tabular-nums text-red-500 mt-0.5">
              ${formatPrice(recommendation.stopLoss)}
            </p>
          </div>
        </div>

        {/* Risk/Reward */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground">
            المخاطرة/العائد: <span className="font-medium text-foreground">{recommendation.riskReward}</span>
          </span>
          <span
            className={`text-[11px] font-medium ${
              coin.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            24h: {formatPercentage(coin.price_change_percentage_24h)}
          </span>
        </div>

        {/* Reasons */}
        <div className="space-y-1.5 pt-1">
          {recommendation.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <Info className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Recommendations() {
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");

  const { data: coins, isLoading } = useQuery<CoinMarketData[]>({
    queryKey: ["coins"],
    queryFn: () => fetchCoins(),
    staleTime: 30000,
  });

  const topCoins = coins?.slice(0, 20) || [];

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">توصيات البيع والشراء</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تحليل فني شامل مع إشارات الدخول والخروج لأفضل 20 عملة
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            هذه التوصيات مبنية على التحليل الفني فقط وليست نصيحة مالية.
            قم دائماً بإجراء بحثك الخاص واستشر مستشاراً مالياً قبل اتخاذ أي قرار استثماري.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "الكل" },
            { key: "buy", label: "إشارات الشراء" },
            { key: "sell", label: "إشارات البيع" },
          ].map((f) => (
            <button
              key={f.key}
              data-testid={`filter-${f.key}`}
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topCoins.map((coin) => (
              <CoinRecommendation key={coin.id} coin={coin} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
