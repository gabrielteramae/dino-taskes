export type CookieKind = "essential" | "optional";

export type ConsentChoice = "essential" | "all";

export const CHOICE_COOKIE = "cookie_choice";

export function isEssentialCookie(name: string) {
  return name === CHOICE_COOKIE || name.startsWith("__Host-") || name.startsWith("__Secure-");
}

function secureAttr() {
  return location.protocol === "https:" ? "; Secure" : "";
}

export function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return null;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureAttr()}`;
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secureAttr()}`;
}

export function listCookies(): Array<{ name: string; kind: CookieKind }> {
  if (typeof document === "undefined") return [];
  const seen = new Map<string, CookieKind>();
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const name = eq === -1 ? trimmed : trimmed.slice(0, eq);
    if (!name || seen.has(name)) continue;
    seen.set(name, isEssentialCookie(name) ? "essential" : "optional");
  }
  return [...seen.entries()].map(([name, kind]) => ({ name, kind }));
}

/** Keep the session cookies. Drop every other cookie the page is allowed to see. */
export function applyCookieChoice(choice: ConsentChoice) {
  writeCookie(CHOICE_COOKIE, choice, 60 * 60 * 24 * 180);
  if (choice === "essential") {
    for (const cookie of listCookies()) {
      if (cookie.kind === "optional") deleteCookie(cookie.name);
    }
  }
}

export function readCookieChoice(): ConsentChoice | "" {
  const value = readCookie(CHOICE_COOKIE);
  return value === "all" || value === "essential" ? value : "";
}
