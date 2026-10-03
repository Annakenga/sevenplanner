export type PlannerTheme = "graphite" | "meadow" | "custom";

// New preference key deliberately makes Graphite the default for this release.
// Old background preferences and uploaded images remain untouched.
export const themeStorageKey = "seven-planner-theme-v2";
export const builtInThemes = ["graphite", "meadow"] as const;
export const meadowBackground = "images/seven-bliss-night-3840x2160.jpg";

export function storedTheme(value: string | null, customImage: string | null): PlannerTheme {
  if (value === "meadow") return "meadow";
  if (value === "custom" && customImage) return "custom";
  return "graphite";
}

export function nextBuiltInTheme(theme: PlannerTheme): PlannerTheme {
  return theme === "graphite" ? "meadow" : "graphite";
}
