// Technical Analysis calculations for buy/sell zone detection

export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SupportResistance {
  level: number;
  type: "support" | "resistance";
  strength: number; // 1-5
  touches: number;
}

export interface Signal {
  type: "buy" | "sell" | "neutral";
  strength: "strong" | "moderate" | "weak";
  indicator: string;
  value: string;
  description: string;
}

export interface BuySellZone {
  type: "buy" | "sell";
  priceMin: number;
  priceMax: number;
  confidence: number; // 0-100
  reason: string;
}

// Simple Moving Average
export function SMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

// Exponential Moving Average
export function EMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else if (i < period - 1) {
      // Use SMA for initial EMA value
      const smaVal = data.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
      result.push(smaVal);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

// RSI - Relative Strength Index
export function RSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(NaN);
      continue;
    }
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);

    if (i < period) {
      result.push(NaN);
    } else if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      const prevRsi = result[i - 1];
      const prevAvgGain = (100 / (100 - prevRsi) - 1) !== 0
        ? gains[gains.length - 1]
        : 0;
      const avgGain = (gains.slice(-period).reduce((a, b) => a + b, 0)) / period;
      const avgLoss = (losses.slice(-period).reduce((a, b) => a + b, 0)) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

// MACD
export function MACD(closes: number[], fast: number = 12, slow: number = 26, signal: number = 9) {
  const emaFast = EMA(closes, fast);
  const emaSlow = EMA(closes, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = EMA(macdLine.filter(v => !isNaN(v)), signal);
  
  // Pad signal line to match macdLine length
  const offset = macdLine.length - signalLine.length;
  const paddedSignal = [...Array(offset).fill(NaN), ...signalLine];
  
  const histogram = macdLine.map((v, i) => {
    if (isNaN(v) || isNaN(paddedSignal[i])) return NaN;
    return v - paddedSignal[i];
  });
  
  return { macdLine, signalLine: paddedSignal, histogram };
}

// Bollinger Bands
export function BollingerBands(closes: number[], period: number = 20, stdDev: number = 2) {
  const sma = SMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      upper.push(mean + stdDev * sd);
      lower.push(mean - stdDev * sd);
    }
  }

  return { upper, middle: sma, lower };
}

// Stochastic RSI
export function StochRSI(closes: number[], rsiPeriod: number = 14, stochPeriod: number = 14): number[] {
  const rsi = RSI(closes, rsiPeriod);
  const result: number[] = [];
  
  for (let i = 0; i < rsi.length; i++) {
    if (i < rsiPeriod + stochPeriod - 1 || isNaN(rsi[i])) {
      result.push(NaN);
    } else {
      const rsiSlice = rsi.slice(i - stochPeriod + 1, i + 1).filter(v => !isNaN(v));
      if (rsiSlice.length < stochPeriod) {
        result.push(NaN);
        continue;
      }
      const minRsi = Math.min(...rsiSlice);
      const maxRsi = Math.max(...rsiSlice);
      if (maxRsi === minRsi) {
        result.push(50);
      } else {
        result.push(((rsi[i] - minRsi) / (maxRsi - minRsi)) * 100);
      }
    }
  }
  return result;
}

// Average True Range
export function ATR(ohlc: OHLCData[], period: number = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < ohlc.length; i++) {
    if (i === 0) {
      tr.push(ohlc[i].high - ohlc[i].low);
    } else {
      tr.push(Math.max(
        ohlc[i].high - ohlc[i].low,
        Math.abs(ohlc[i].high - ohlc[i - 1].close),
        Math.abs(ohlc[i].low - ohlc[i - 1].close)
      ));
    }
  }
  return SMA(tr, period);
}

// Find Support and Resistance levels
export function findSupportResistance(ohlc: OHLCData[], sensitivity: number = 0.02): SupportResistance[] {
  if (ohlc.length < 5) return [];
  
  const levels: SupportResistance[] = [];
  const pivots: { price: number; type: "high" | "low" }[] = [];

  // Find local highs and lows
  for (let i = 2; i < ohlc.length - 2; i++) {
    const isHigh = ohlc[i].high > ohlc[i - 1].high && ohlc[i].high > ohlc[i - 2].high &&
                   ohlc[i].high > ohlc[i + 1].high && ohlc[i].high > ohlc[i + 2].high;
    const isLow = ohlc[i].low < ohlc[i - 1].low && ohlc[i].low < ohlc[i - 2].low &&
                  ohlc[i].low < ohlc[i + 1].low && ohlc[i].low < ohlc[i + 2].low;
    
    if (isHigh) pivots.push({ price: ohlc[i].high, type: "high" });
    if (isLow) pivots.push({ price: ohlc[i].low, type: "low" });
  }

  // Cluster nearby pivots
  const clustered: { price: number; type: "high" | "low"; count: number }[] = [];
  const used = new Set<number>();

  for (let i = 0; i < pivots.length; i++) {
    if (used.has(i)) continue;
    let sum = pivots[i].price;
    let count = 1;
    let highCount = pivots[i].type === "high" ? 1 : 0;
    
    for (let j = i + 1; j < pivots.length; j++) {
      if (used.has(j)) continue;
      if (Math.abs(pivots[j].price - pivots[i].price) / pivots[i].price < sensitivity) {
        sum += pivots[j].price;
        count++;
        if (pivots[j].type === "high") highCount++;
        used.add(j);
      }
    }
    used.add(i);
    
    clustered.push({
      price: sum / count,
      type: highCount > count / 2 ? "high" : "low",
      count,
    });
  }

  // Convert to support/resistance
  const currentPrice = ohlc[ohlc.length - 1].close;
  for (const cluster of clustered) {
    const type = cluster.price > currentPrice ? "resistance" : "support";
    levels.push({
      level: cluster.price,
      type,
      strength: Math.min(5, cluster.count),
      touches: cluster.count,
    });
  }

  // Sort by proximity to current price
  levels.sort((a, b) => Math.abs(a.level - currentPrice) - Math.abs(b.level - currentPrice));
  
  return levels.slice(0, 8);
}

// Generate Buy/Sell signals from all indicators
export function generateSignals(closes: number[], ohlc: OHLCData[]): Signal[] {
  if (closes.length < 30) return [];
  
  const signals: Signal[] = [];
  const currentPrice = closes[closes.length - 1];
  
  // RSI Signal
  const rsi = RSI(closes);
  const currentRsi = rsi[rsi.length - 1];
  if (!isNaN(currentRsi)) {
    if (currentRsi < 30) {
      signals.push({
        type: "buy",
        strength: currentRsi < 20 ? "strong" : "moderate",
        indicator: "RSI",
        value: currentRsi.toFixed(1),
        description: `RSI at ${currentRsi.toFixed(1)} — oversold territory${currentRsi < 20 ? " (extreme)" : ""}`,
      });
    } else if (currentRsi > 70) {
      signals.push({
        type: "sell",
        strength: currentRsi > 80 ? "strong" : "moderate",
        indicator: "RSI",
        value: currentRsi.toFixed(1),
        description: `RSI at ${currentRsi.toFixed(1)} — overbought territory${currentRsi > 80 ? " (extreme)" : ""}`,
      });
    } else {
      signals.push({
        type: "neutral",
        strength: "weak",
        indicator: "RSI",
        value: currentRsi.toFixed(1),
        description: `RSI at ${currentRsi.toFixed(1)} — neutral zone`,
      });
    }
  }

  // MACD Signal
  const macd = MACD(closes);
  const macdCurrent = macd.macdLine[macd.macdLine.length - 1];
  const signalCurrent = macd.signalLine[macd.signalLine.length - 1];
  const macdPrev = macd.macdLine[macd.macdLine.length - 2];
  const signalPrev = macd.signalLine[macd.signalLine.length - 2];
  
  if (!isNaN(macdCurrent) && !isNaN(signalCurrent) && !isNaN(macdPrev) && !isNaN(signalPrev)) {
    if (macdPrev < signalPrev && macdCurrent > signalCurrent) {
      signals.push({
        type: "buy",
        strength: "strong",
        indicator: "MACD",
        value: `${macdCurrent.toFixed(4)}`,
        description: "MACD bullish crossover — MACD line crossed above signal line",
      });
    } else if (macdPrev > signalPrev && macdCurrent < signalCurrent) {
      signals.push({
        type: "sell",
        strength: "strong",
        indicator: "MACD",
        value: `${macdCurrent.toFixed(4)}`,
        description: "MACD bearish crossover — MACD line crossed below signal line",
      });
    } else if (macdCurrent > signalCurrent) {
      signals.push({
        type: "buy",
        strength: "weak",
        indicator: "MACD",
        value: `${macdCurrent.toFixed(4)}`,
        description: "MACD is bullish — MACD line above signal line",
      });
    } else {
      signals.push({
        type: "sell",
        strength: "weak",
        indicator: "MACD",
        value: `${macdCurrent.toFixed(4)}`,
        description: "MACD is bearish — MACD line below signal line",
      });
    }
  }

  // Moving Average Signal (50/200 cross)
  const sma20 = SMA(closes, 20);
  const sma50 = SMA(closes, 50);
  const current20 = sma20[sma20.length - 1];
  const current50 = sma50[sma50.length - 1];
  
  if (!isNaN(current20) && !isNaN(current50)) {
    if (currentPrice > current20 && currentPrice > current50) {
      signals.push({
        type: "buy",
        strength: current20 > current50 ? "strong" : "moderate",
        indicator: "Moving Averages",
        value: `SMA20: ${current20.toFixed(2)}`,
        description: `Price above SMA 20 & 50 — ${current20 > current50 ? "strong bullish" : "bullish"} trend`,
      });
    } else if (currentPrice < current20 && currentPrice < current50) {
      signals.push({
        type: "sell",
        strength: current20 < current50 ? "strong" : "moderate",
        indicator: "Moving Averages",
        value: `SMA20: ${current20.toFixed(2)}`,
        description: `Price below SMA 20 & 50 — ${current20 < current50 ? "strong bearish" : "bearish"} trend`,
      });
    } else {
      signals.push({
        type: "neutral",
        strength: "weak",
        indicator: "Moving Averages",
        value: `SMA20: ${current20.toFixed(2)}`,
        description: "Price between SMA 20 and SMA 50 — mixed signals",
      });
    }
  }

  // Bollinger Bands Signal
  const bb = BollingerBands(closes);
  const bbUpper = bb.upper[bb.upper.length - 1];
  const bbLower = bb.lower[bb.lower.length - 1];
  const bbMiddle = bb.middle[bb.middle.length - 1];
  
  if (!isNaN(bbUpper) && !isNaN(bbLower)) {
    const bandWidth = ((bbUpper - bbLower) / bbMiddle) * 100;
    if (currentPrice <= bbLower) {
      signals.push({
        type: "buy",
        strength: "moderate",
        indicator: "Bollinger Bands",
        value: `Lower: ${bbLower.toFixed(2)}`,
        description: "Price touching lower Bollinger Band — potential bounce zone",
      });
    } else if (currentPrice >= bbUpper) {
      signals.push({
        type: "sell",
        strength: "moderate",
        indicator: "Bollinger Bands",
        value: `Upper: ${bbUpper.toFixed(2)}`,
        description: "Price touching upper Bollinger Band — potential reversal zone",
      });
    } else {
      signals.push({
        type: "neutral",
        strength: "weak",
        indicator: "Bollinger Bands",
        value: `Width: ${bandWidth.toFixed(1)}%`,
        description: `Price within bands — bandwidth: ${bandWidth.toFixed(1)}%`,
      });
    }
  }

  // Volume analysis
  if (ohlc.length >= 20) {
    // Use closes as proxy for volume trend since we may not have volume in OHLC
    const recentRange = ohlc.slice(-5).map(c => c.high - c.low);
    const avgRange = ohlc.slice(-20).map(c => c.high - c.low);
    const recentAvg = recentRange.reduce((a, b) => a + b, 0) / recentRange.length;
    const overallAvg = avgRange.reduce((a, b) => a + b, 0) / avgRange.length;
    
    if (recentAvg > overallAvg * 1.5) {
      signals.push({
        type: "neutral",
        strength: "moderate",
        indicator: "Volatility",
        value: `${((recentAvg / overallAvg) * 100).toFixed(0)}%`,
        description: "Increased volatility detected — wider trading ranges",
      });
    }
  }

  return signals;
}

// Generate Buy/Sell Zones
export function generateBuySellZones(closes: number[], ohlc: OHLCData[]): BuySellZone[] {
  if (closes.length < 30 || ohlc.length < 5) return [];
  
  const zones: BuySellZone[] = [];
  const currentPrice = closes[closes.length - 1];
  const sr = findSupportResistance(ohlc);
  const bb = BollingerBands(closes);
  const rsi = RSI(closes);
  const currentRsi = rsi[rsi.length - 1];
  const atr = ATR(ohlc);
  const currentAtr = atr.filter(v => !isNaN(v)).pop() || 0;
  
  // Support-based buy zones
  const supports = sr.filter(s => s.type === "support").slice(0, 3);
  for (const support of supports) {
    const distance = ((currentPrice - support.level) / currentPrice) * 100;
    if (distance > 0 && distance < 20) {
      let confidence = 40 + support.strength * 10;
      if (currentRsi < 40) confidence += 15;
      if (!isNaN(bb.lower[bb.lower.length - 1]) && support.level <= bb.lower[bb.lower.length - 1] * 1.02) {
        confidence += 10;
      }
      zones.push({
        type: "buy",
        priceMin: support.level - currentAtr * 0.5,
        priceMax: support.level + currentAtr * 0.5,
        confidence: Math.min(95, confidence),
        reason: `Support level at $${support.level.toFixed(2)} (${support.touches} touches)`,
      });
    }
  }

  // Resistance-based sell zones
  const resistances = sr.filter(s => s.type === "resistance").slice(0, 3);
  for (const resistance of resistances) {
    const distance = ((resistance.level - currentPrice) / currentPrice) * 100;
    if (distance > 0 && distance < 20) {
      let confidence = 40 + resistance.strength * 10;
      if (currentRsi > 60) confidence += 15;
      if (!isNaN(bb.upper[bb.upper.length - 1]) && resistance.level >= bb.upper[bb.upper.length - 1] * 0.98) {
        confidence += 10;
      }
      zones.push({
        type: "sell",
        priceMin: resistance.level - currentAtr * 0.5,
        priceMax: resistance.level + currentAtr * 0.5,
        confidence: Math.min(95, confidence),
        reason: `Resistance level at $${resistance.level.toFixed(2)} (${resistance.touches} touches)`,
      });
    }
  }

  // Bollinger Band zones
  const bbLower = bb.lower[bb.lower.length - 1];
  const bbUpper = bb.upper[bb.upper.length - 1];
  if (!isNaN(bbLower) && !isNaN(bbUpper)) {
    const lowerDist = ((currentPrice - bbLower) / currentPrice) * 100;
    if (lowerDist > 0 && lowerDist < 15) {
      zones.push({
        type: "buy",
        priceMin: bbLower - currentAtr * 0.3,
        priceMax: bbLower + currentAtr * 0.3,
        confidence: 55,
        reason: `Lower Bollinger Band at $${bbLower.toFixed(2)}`,
      });
    }
    
    const upperDist = ((bbUpper - currentPrice) / currentPrice) * 100;
    if (upperDist > 0 && upperDist < 15) {
      zones.push({
        type: "sell",
        priceMin: bbUpper - currentAtr * 0.3,
        priceMax: bbUpper + currentAtr * 0.3,
        confidence: 55,
        reason: `Upper Bollinger Band at $${bbUpper.toFixed(2)}`,
      });
    }
  }

  // Sort by confidence
  zones.sort((a, b) => b.confidence - a.confidence);
  
  // Remove duplicates (zones within 1% of each other)
  const unique: BuySellZone[] = [];
  for (const zone of zones) {
    const isDuplicate = unique.some(
      u => u.type === zone.type && Math.abs((u.priceMin + u.priceMax) / 2 - (zone.priceMin + zone.priceMax) / 2) / currentPrice < 0.01
    );
    if (!isDuplicate) unique.push(zone);
  }

  return unique.slice(0, 6);
}

// Overall Market Verdict
export function getOverallVerdict(signals: Signal[]): { verdict: string; score: number; color: string } {
  let score = 0;
  const weights = { strong: 3, moderate: 2, weak: 1 };
  
  for (const signal of signals) {
    const weight = weights[signal.strength];
    if (signal.type === "buy") score += weight;
    else if (signal.type === "sell") score -= weight;
  }

  const maxScore = signals.length * 3;
  const normalizedScore = maxScore > 0 ? (score / maxScore) * 100 : 0;

  if (normalizedScore > 40) return { verdict: "Strong Buy", score: normalizedScore, color: "text-emerald-500" };
  if (normalizedScore > 15) return { verdict: "Buy", score: normalizedScore, color: "text-emerald-400" };
  if (normalizedScore > -15) return { verdict: "Neutral", score: normalizedScore, color: "text-amber-400" };
  if (normalizedScore > -40) return { verdict: "Sell", score: normalizedScore, color: "text-red-400" };
  return { verdict: "Strong Sell", score: normalizedScore, color: "text-red-500" };
}

// Format helpers
export function formatPrice(price: number): string {
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

export function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
  return `$${vol.toFixed(2)}`;
}
