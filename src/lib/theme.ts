export type ThemeMode = "dark" | "light";

const KEY = "dino-theme";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const previous = root.dataset.theme;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (previous && previous !== theme && !reduce) {
    root.classList.add("theme-swap");
    void root.offsetHeight;
    window.setTimeout(() => root.classList.remove("theme-swap"), 380);
  }
  root.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f3f6f3" : "#09090b");
}
