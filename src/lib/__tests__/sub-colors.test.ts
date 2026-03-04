import { describe, it, expect } from "vitest";
import {
  getRowClassName,
  getSubRowClassName,
  pickSubColor,
  SUB_COLORS,
  COLOR_OPTIONS,
} from "../sub-colors";

describe("getRowClassName", () => {
  it("returns blue background classes for blue color", () => {
    expect(getRowClassName("#3b82f6")).toBe(
      "bg-blue-50/60 dark:bg-blue-950/20"
    );
  });

  it("returns red background classes for red color", () => {
    expect(getRowClassName("#ef4444")).toBe("bg-red-50/60 dark:bg-red-950/20");
  });

  it("returns green background classes for green color", () => {
    expect(getRowClassName("#22c55e")).toBe(
      "bg-green-50/60 dark:bg-green-950/20"
    );
  });

  it("returns purple background classes for purple color", () => {
    expect(getRowClassName("#8b5cf6")).toBe(
      "bg-purple-50/60 dark:bg-purple-950/20"
    );
  });

  it("returns orange background classes for orange color", () => {
    expect(getRowClassName("#f97316")).toBe(
      "bg-orange-50/60 dark:bg-orange-950/20"
    );
  });

  it("returns pink background classes for pink color", () => {
    expect(getRowClassName("#ec4899")).toBe(
      "bg-pink-50/60 dark:bg-pink-950/20"
    );
  });

  it("returns gray background for null color", () => {
    expect(getRowClassName(null)).toBe("bg-zinc-50/60 dark:bg-zinc-900/20");
  });

  it("returns gray background for undefined color", () => {
    expect(getRowClassName(undefined)).toBe(
      "bg-zinc-50/60 dark:bg-zinc-900/20"
    );
  });

  it("returns gray background for unknown color", () => {
    expect(getRowClassName("#000000")).toBe(
      "bg-zinc-50/60 dark:bg-zinc-900/20"
    );
  });
});

describe("getSubRowClassName", () => {
  it("is an alias for getRowClassName", () => {
    expect(getSubRowClassName).toBe(getRowClassName);
  });
});

describe("pickSubColor", () => {
  it("picks colors by cycling through the palette", () => {
    expect(pickSubColor(0)).toBe(SUB_COLORS[0]);
    expect(pickSubColor(1)).toBe(SUB_COLORS[1]);
    expect(pickSubColor(5)).toBe(SUB_COLORS[5]);
  });

  it("wraps around when count exceeds palette size", () => {
    expect(pickSubColor(6)).toBe(SUB_COLORS[0]);
    expect(pickSubColor(7)).toBe(SUB_COLORS[1]);
  });
});

describe("COLOR_OPTIONS", () => {
  it("includes a None option with empty value", () => {
    expect(COLOR_OPTIONS[0]).toEqual({ label: "None", value: "" });
  });

  it("includes all SUB_COLORS values", () => {
    const optionValues = COLOR_OPTIONS.filter((o) => o.value !== "").map(
      (o) => o.value
    );
    expect(optionValues).toEqual([...SUB_COLORS]);
  });

  it("has 7 options total (None + 6 colors)", () => {
    expect(COLOR_OPTIONS).toHaveLength(7);
  });
});
