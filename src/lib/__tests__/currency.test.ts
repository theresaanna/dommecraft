import { describe, it, expect } from "vitest";
import {
  getCurrencySymbol,
  formatCurrency,
  CURRENCY_OPTIONS,
  type CurrencyCode,
} from "../currency";

describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns A$ for AUD", () => {
    expect(getCurrencySymbol("AUD")).toBe("A$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });
});

describe("formatCurrency", () => {
  it("formats number as USD by default", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("formats string value as USD", () => {
    expect(formatCurrency("250.5")).toBe("$250.50");
  });

  it("formats with GBP symbol", () => {
    expect(formatCurrency(100, "GBP")).toBe("£100.00");
  });

  it("formats with AUD symbol", () => {
    expect(formatCurrency(100, "AUD")).toBe("A$100.00");
  });

  it("formats with EUR symbol and German locale", () => {
    expect(formatCurrency(100, "EUR")).toBe("€100,00");
  });

  it("formats large numbers with locale-appropriate separators", () => {
    const result = formatCurrency(1500, "USD");
    expect(result).toBe("$1,500.00");
  });

  it("returns symbol with 0.00 for NaN input", () => {
    expect(formatCurrency("not-a-number", "USD")).toBe("$0.00");
    expect(formatCurrency("not-a-number", "GBP")).toBe("£0.00");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats decimal values with two decimal places", () => {
    expect(formatCurrency(99.9)).toBe("$99.90");
    expect(formatCurrency(99.999)).toBe("$100.00");
  });
});

describe("CURRENCY_OPTIONS", () => {
  it("contains all four currency options", () => {
    expect(CURRENCY_OPTIONS).toHaveLength(4);
  });

  it("has correct values", () => {
    const values = CURRENCY_OPTIONS.map((o) => o.value);
    expect(values).toEqual(["USD", "GBP", "AUD", "EUR"]);
  });

  it("has labels with symbols", () => {
    const labels = CURRENCY_OPTIONS.map((o) => o.label);
    expect(labels).toEqual(["USD ($)", "GBP (£)", "AUD (A$)", "EUR (€)"]);
  });
});
