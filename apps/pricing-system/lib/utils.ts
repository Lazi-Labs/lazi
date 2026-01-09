import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting
export function formatCurrency(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num || 0);
}

export function formatCurrencyShort(num: number): string {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return formatCurrency(num);
}

// Percent formatting
export function formatPercent(num: number): string {
  return `${(num || 0).toFixed(2)}%`;
}

// Number formatting
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num || 0);
}

// Calculation helpers
export function calcBurdenedRate(base: number, burdenPct: number): number {
  return base * (1 + burdenPct / 100);
}

export function calcEfficiencyAdjusted(rate: number, effPct: number): number {
  return rate / (effPct / 100);
}

export function calcHourlyRate(adjusted: number, marginPct: number): number {
  return adjusted / (1 - marginPct / 100);
}

export function calcMarkupFromMargin(margin: number): number {
  return (margin / (100 - margin)) * 100;
}

export function calcMarginFromMarkup(markup: number): number {
  return (markup / (100 + markup)) * 100;
}

export function calcMultiplierFromMargin(margin: number): number {
  return 1 / (1 - margin / 100);
}

export function calcSellPrice(cost: number, margin: number): number {
  return cost / (1 - margin / 100);
}

// Calculate monthly equivalent from frequency
export function calcMonthlyAmount(
  amount: number,
  frequency: "monthly" | "annual" | "quarterly" | "weekly" | "one_time"
): number {
  switch (frequency) {
    case "monthly":
      return amount;
    case "annual":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "weekly":
      return amount * 4.333;
    case "one_time":
      return 0;
    default:
      return amount;
  }
}
