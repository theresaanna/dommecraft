export type CurrencyCode = "USD" | "GBP" | "AUD" | "EUR";

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  GBP: "\u00A3",
  AUD: "A$",
  EUR: "\u20AC",
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: "en-US",
  GBP: "en-GB",
  AUD: "en-AU",
  EUR: "de-DE",
};

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: "USD", label: "USD ($)" },
  { value: "GBP", label: "GBP (\u00A3)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "EUR", label: "EUR (\u20AC)" },
];

export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency] || "$";
}

export function formatCurrency(
  value: string | number,
  currency: CurrencyCode = "USD"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `${getCurrencySymbol(currency)}0.00`;
  const locale = CURRENCY_LOCALES[currency] || "en-US";
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
