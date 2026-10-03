export const builtInThemes = ["graphite"] as const;
export type PlannerTheme = typeof builtInThemes[number];

// New preference key deliberately makes Graphite the default for this release.
// Old background preferences and uploaded images remain untouched.
export const themeStorageKey = "seven-planner-theme-v2";
export function storedTheme(value: string | null): PlannerTheme {
  return builtInThemes.find(theme => theme === value) ?? "graphite";
}
