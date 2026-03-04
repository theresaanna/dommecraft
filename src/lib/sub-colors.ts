/**
 * Shared color palette — matches the calendar event color options.
 * Used for subs (auto-assigned) and projects (user-picked).
 */

export const SUB_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#22c55e", // Green
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#ec4899", // Pink
] as const;

export const COLOR_OPTIONS = [
  { label: "None", value: "" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Red", value: "#ef4444" },
  { label: "Green", value: "#22c55e" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Orange", value: "#f97316" },
  { label: "Pink", value: "#ec4899" },
] as const;

/**
 * Maps a hex color to muted Tailwind row background classes.
 * Returns gray classes when color is null/undefined.
 */
const COLOR_ROW_STYLES: Record<string, { row: string; dark: string }> = {
  "#3b82f6": { row: "bg-blue-50/60", dark: "dark:bg-blue-950/20" },
  "#ef4444": { row: "bg-red-50/60", dark: "dark:bg-red-950/20" },
  "#22c55e": { row: "bg-green-50/60", dark: "dark:bg-green-950/20" },
  "#8b5cf6": { row: "bg-purple-50/60", dark: "dark:bg-purple-950/20" },
  "#f97316": { row: "bg-orange-50/60", dark: "dark:bg-orange-950/20" },
  "#ec4899": { row: "bg-pink-50/60", dark: "dark:bg-pink-950/20" },
};

const DEFAULT_ROW_STYLE = { row: "bg-zinc-50/60", dark: "dark:bg-zinc-900/20" };

export function getRowClassName(color: string | null | undefined): string {
  const style = color ? COLOR_ROW_STYLES[color] || DEFAULT_ROW_STYLE : DEFAULT_ROW_STYLE;
  return `${style.row} ${style.dark}`;
}

/** @deprecated Use getRowClassName instead */
export const getSubRowClassName = getRowClassName;

/**
 * Pick the next color for a new sub by cycling through the palette,
 * based on how many subs the domme already has.
 */
export function pickSubColor(existingCount: number): string {
  return SUB_COLORS[existingCount % SUB_COLORS.length];
}
