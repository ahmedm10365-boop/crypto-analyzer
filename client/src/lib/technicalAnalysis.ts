import type { OHLCData, TechnicalSignal, TradeRecommendation } from "@shared/schema";

// Calculate Simple Moving Average
export function calcSMA(data: number[], period: number): number[] {
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

// Calculate Exponential Moving Average
export function calcEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  return result;
}

// Calculate RSI
export function calcRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      let avgGain, avgLoss;
      if (i === period) {
        avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      } else {
        const prevAvgGain = result[i - 1] !== 100 ? 
          (gains.slice(i - period, i - 1).reduce((a, b) => a + b, 0) + gains[i - 1]) / period : 0;
        avgGain = (prevAvgGain * (period - 1) + gains[i - 1]) / period;
        avgLoss = (losses.slice(i - period, i).reduce((a, b) => a + b, 0)) / period;
      }
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    }
  }
  return result;
}

// Calculate MACD
export function calcMACD(data: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdLine: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }

  const validMACD = macdLine.filter((v) => !isNaN(v));
  const signalLine = calcEMA(validMACD, 9);

  const signal: number[] = [];
  const histogram: number[] = [];
  let validIndex = 0;

  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) {
      signal.push(NaN);
      histogram.push(NaN);
    } else {
      if (validIndex < signalLine.length) {
        signal.push(signalLine[validIndex]);
        histogram.push(isNaN(signalLine[validIndex]) ? NaN : macdLine[i] - signalLine[validIndex]);
      } else {
        signal.push(NaN);
        histogram.push(NaN);
      }
      validIndex++;
    }
  }

  return { macd: macdLine, signal, histogram };
}

// Calculate Bollinger Bands
export function calcBollingerBands(data: number[], period: number = 20, stdDev: number = 2) {
  const sma = calcSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(sma[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }

  return { middle: sma, upper, lower };
}

// Generate technical signals from OHLC data
export function generateSignals(ohlcData: OHLCData[]): TechnicalSignal[] {
  if (ohlcData.length < 30) return [];

  const closes = ohlcData.map((d) => d.close);
  const currentPrice = closes[closes.length - 1];

  const signals: TechnicalSignal[] = [];

  // RSI Signal
  const rsi = calcRSI(closes, 14);
  const currentRSI = rsi.filter((v) => !isNaN(v)).pop() || 50;
  let rsiSignal: "شراء" | "بيع" | "محايد" = "محايد";
  let rsiStrength = 50;

  if (currentRSI < 30) {
    rsiSignal = "شراء";
    rsiStrength = Math.round(90 - currentRSI);
  } else if (currentRSI > 70) {
    rsiSignal = "بيع";
    rsiStrength = Math.round(currentRSI - 10);
  } else if (currentRSI < 45) {
    rsiSignal = "شراء";
    rsiStrength = Math.round(60 - currentRSI);
  } else if (currentRSI > 55) {
    rsiSignal = "بيع";
    rsiStrength = Math.round(currentRSI - 20);
  }

  signals.push({
    indicator: "RSI (14)",
    value: Math.round(currentRSI * 100) / 100,
    signal: rsiSignal,
    strength: Math.min(100, Math.max(0, rsiStrength)),
  });

  // MACD Signal
  const macd = calcMACD(closes);
  const validMACD = macd.macd.filter((v) => !isNaN(v));
  const validSignal = macd.signal.filter((v) => !isNaN(v));
  const validHist = macd.histogram.filter((v) => !isNaN(v));

  if (validMACD.length > 0 && validSignal.length > 0) {
    const lastMACD = validMACD[validMACD.length - 1];
    const lastSignal = validSignal[validSignal.length - 1];
    const lastHist = validHist.length > 0 ? validHist[validHist.length - 1] : 0;

    let macdSig: "شراء" | "بيع" | "محايد" = "محايد";
    let macdStrength = 50;

    if (lastMACD > lastSignal && lastHist > 0) {
      macdSig = "شراء";
      macdStrength = Math.min(85, 60 + Math.abs(lastHist) * 1000);
    } else if (lastMACD < lastSignal && lastHist < 0) {
      macdSig = "بيع";
      macdStrength = Math.min(85, 60 + Math.abs(lastHist) * 1000);
    }

    signals.push({
      indicator: "MACD (12,26,9)",
      value: Math.round(lastMACD * 10000) / 10000,
      signal: macdSig,
      strength: Math.round(macdStrength),
    });
  }

  // Moving Averages
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const ema12 = calcEMA(closes, 12);

  const lastSMA20 = sma20.filter((v) => !isNaN(v)).pop();
  const lastSMA50 = sma50.filter((v) => !isNaN(v)).pop();
  const lastEMA12 = ema12.filter((v) => !isNaN(v)).pop();

  if (lastSMA20) {
    const pctFromSMA20 = ((currentPrice - lastSMA20) / lastSMA20) * 100;
    signals.push({
      indicator: "SMA 20",
      value: Math.round(lastSMA20 * 100) / 100,
      signal: currentPrice > lastSMA20 ? "شراء" : "بيع",
      strength: Math.min(80, Math.round(50 + Math.abs(pctFromSMA20) * 3)),
    });
  }

  if (lastSMA50) {
    const pctFromSMA50 = ((currentPrice - lastSMA50) / lastSMA50) * 100;
    signals.push({
      indicator: "SMA 50",
      value: Math.round(lastSMA50 * 100) / 100,
      signal: currentPrice > lastSMA50 ? "شراء" : "بيع",
      strength: Math.min(80, Math.round(50 + Math.abs(pctFromSMA50) * 2)),
    });
  }

  if (lastEMA12) {
    signals.push({
      indicator: "EMA 12",
      value: Math.round(lastEMA12 * 100) / 100,
      signal: currentPrice > lastEMA12 ? "شراء" : "بيع",
      strength: Math.min(75, Math.round(50 + Math.abs(((currentPrice - lastEMA12) / lastEMA12) * 100) * 4)),
    });
  }

  // Bollinger Bands
  const bb = calcBollingerBands(closes, 20, 2);
  const lastUpper = bb.upper.filter((v) => !isNaN(v)).pop();
  const lastLower = bb.lower.filter((v) => !isNaN(v)).pop();
  const lastMiddle = bb.middle.filter((v) => !isNaN(v)).pop();

  if (lastUpper && lastLower && lastMiddle) {
    const bbPos = ((currentPrice - lastLower) / (lastUpper - lastLower)) * 100;
    let bbSignal: "شراء" | "بيع" | "محايد" = "محايد";
    let bbStrength = 50;

    if (bbPos < 20) {
      bbSignal = "شراء";
      bbStrength = Math.round(80 - bbPos);
    } else if (bbPos > 80) {
      bbSignal = "بيع";
      bbStrength = Math.round(bbPos);
    }

    signals.push({
      indicator: "بولنجر باند",
      value: Math.round(bbPos * 100) / 100,
      signal: bbSignal,
      strength: Math.min(90, bbStrength),
    });
  }

  return signals;
}

// Generate trade recommendations
export function generateRecommendation(
  coinId: string,
  symbol: string,
  name: string,
  currentPrice: number,
  ohlcData: OHLCData[],
  priceChange24h: number,
  priceChange7d?: number,
  priceChange30d?: number
): TradeRecommendation {
  const signals = generateSignals(ohlcData);
  const buySignals = signals.filter((s) => s.signal === "شراء");
  const sellSignals = signals.filter((s) => s.signal === "بيع");

  const buyScore = buySignals.reduce((sum, s) => sum + s.strength, 0);
  const sellScore = sellSignals.reduce((sum, s) => sum + s.strength, 0);
  const totalStrength = signals.reduce((sum, s) => sum + s.strength, 0);

  const netScore = totalStrength > 0 ? ((buyScore - sellScore) / totalStrength) * 100 : 0;

  let action: TradeRecommendation["action"];
  if (netScore > 40) action = "شراء قوي";
  else if (netScore > 15) action = "شراء";
  else if (netScore < -40) action = "بيع قوي";
  else if (netScore < -15) action = "بيع";
  else action = "محايد";

  const confidence = Math.min(95, Math.round(50 + Math.abs(netScore) * 0.4));

  const reasons: string[] = [];

  if (buySignals.length > sellSignals.length) {
    reasons.push(`${buySignals.length} من ${signals.length} مؤشرات تشير للشراء`);
  } else if (sellSignals.length > buySignals.length) {
    reasons.push(`${sellSignals.length} من ${signals.length} مؤشرات تشير للبيع`);
  }

  const rsiSignal = signals.find((s) => s.indicator.startsWith("RSI"));
  if (rsiSignal) {
    if (rsiSignal.value < 30) reasons.push("RSI في منطقة التشبع البيعي (فرصة شراء)");
    else if (rsiSignal.value > 70) reasons.push("RSI في منطقة التشبع الشرائي (فرصة بيع)");
  }

  if (priceChange24h < -5) reasons.push("هبوط حاد 24 ساعة - قد يكون تصحيح");
  else if (priceChange24h > 5) reasons.push("ارتفاع قوي 24 ساعة - زخم صعودي");

  if (priceChange7d !== undefined) {
    if (priceChange7d < -10) reasons.push("ضعف أسبوعي ملحوظ");
    else if (priceChange7d > 10) reasons.push("اتجاه صعودي أسبوعي قوي");
  }

  const macdSignal = signals.find((s) => s.indicator.startsWith("MACD"));
  if (macdSignal) {
    if (macdSignal.signal === "شراء") reasons.push("MACD يعطي إشارة تقاطع إيجابي");
    else if (macdSignal.signal === "بيع") reasons.push("MACD يعطي إشارة تقاطع سلبي");
  }

  // Calculate targets
  const volatility = Math.max(2, Math.abs(priceChange24h || 3));
  const targetMultiplier = action.includes("شراء") ? 1 + volatility * 0.02 : 1 - volatility * 0.02;
  const stopMultiplier = action.includes("شراء") ? 1 - volatility * 0.01 : 1 + volatility * 0.01;

  const targetPrice = Math.round(currentPrice * targetMultiplier * 100) / 100;
  const stopLoss = Math.round(currentPrice * stopMultiplier * 100) / 100;

  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(targetPrice - currentPrice);
  const riskReward = risk > 0 ? `1:${(reward / risk).toFixed(1)}` : "N/A";

  return {
    coinId,
    symbol: symbol.toUpperCase(),
    name,
    action,
    confidence,
    reasons: reasons.slice(0, 4),
    entryPrice: currentPrice,
    targetPrice,
    stopLoss,
    riskReward,
  };
}
