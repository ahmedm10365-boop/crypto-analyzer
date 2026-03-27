import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import {
  Star,
  Plus,
  Trash2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";
import type { CoinMarketData, Watchlist } from "@shared/schema";
import { formatPrice, formatMarketCap, formatPercentage } from "@/lib/format";
import SparklineChart from "@/components/SparklineChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WatchlistPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();

  const { data: watchlist } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: coins } = useQuery<CoinMarketData[]>({
    queryKey: ["/api/coins"],
    staleTime: 30000,
  });

  const addMutation = useMutation({
    mutationFn: async (coin: CoinMarketData) => {
      const res = await apiRequest("POST", "/api/watchlist", {
        coinId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "تمت الإضافة للمفضلة" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (coinId: string) => {
      await apiRequest("DELETE", `/api/watchlist/${coinId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "تم الحذف من المفضلة" });
    },
  });

  const watchlistCoinIds = new Set(watchlist?.map((w) => w.coinId) || []);
  const watchlistCoins = coins?.filter((c) => watchlistCoinIds.has(c.id)) || [];

  const searchResults =
    searchQuery.length > 0
      ? coins
          ?.filter(
            (c) =>
              !watchlistCoinIds.has(c.id) &&
              (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .slice(0, 8)
      : [];

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">المفضلة</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              تتبع العملات المفضلة لديك
            </p>
          </div>
          <Button
            data-testid="button-add-watchlist"
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة عملة
          </Button>
        </div>

        {/* Search to Add */}
        {showSearch && (
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search-watchlist"
                placeholder="ابحث عن عملة لإضافتها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
                autoFocus
              />
            </div>
            {searchResults && searchResults.length > 0 && (
              <div className="divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
                {searchResults.map((coin) => (
                  <div
                    key={coin.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={coin.image}
                        alt={coin.name}
                        className="w-5 h-5 rounded-full"
                        crossOrigin="anonymous"
                      />
                      <span className="text-sm font-medium">{coin.name}</span>
                      <span className="text-xs text-muted-foreground uppercase">{coin.symbol}</span>
                    </div>
                    <Button
                      data-testid={`button-add-${coin.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => addMutation.mutate(coin)}
                      disabled={addMutation.isPending}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watchlist Table */}
        {watchlistCoins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-medium text-muted-foreground">
              لا توجد عملات في المفضلة
            </h3>
            <p className="text-sm text-muted-foreground/60 mt-1">
              اضغط على "إضافة عملة" لبدء تتبع عملاتك المفضلة
            </p>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-muted-foreground border-b border-border">
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
                {watchlistCoins.map((coin) => (
                  <tr
                    key={coin.id}
                    data-testid={`watchlist-row-${coin.id}`}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                  >
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
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">
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
                        className={`text-xs font-medium tabular-nums inline-flex items-center gap-0.5 ${
                          coin.price_change_percentage_24h >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {coin.price_change_percentage_24h >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {formatPercentage(coin.price_change_percentage_24h)}
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
                          isPositive={
                            (coin.price_change_percentage_7d_in_currency || 0) >= 0
                          }
                          width={100}
                          height={28}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/coin/${coin.id}`}>
                          <span className="text-primary/60 hover:text-primary transition-colors cursor-pointer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                        <button
                          data-testid={`button-remove-${coin.id}`}
                          onClick={() => removeMutation.mutate(coin.id)}
                          className="text-muted-foreground/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
