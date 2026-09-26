import { applyCookieChoice, readCookie, writeCookie, CHOICE_COOKIE } from "@/lib/cookies";
import { clearStoredKind, CONSENT_STORAGE_KEY } from "@/lib/storage";

export type Consent = {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  thirdParty: boolean;
};

export { CONSENT_STORAGE_KEY };

export const CONSENT_OFF: Consent = { preferences: false, analytics: false, marketing: false, thirdParty: false };
export const CONSENT_ON: Consent = { preferences: true, analytics: true, marketing: true, thirdParty: true };

export function parseConsent(raw: string | null): Consent | null {
  if (!raw) return null;
  if (raw === "all") return { ...CONSENT_ON };
  if (raw === "essential") return { ...CONSENT_OFF };
  try {
    const data = JSON.parse(raw) as Partial<Consent>;
    if (typeof data.preferences !== "boolean") return null;
    const everythingElse = data.preferences && data.analytics === true && data.marketing === true;
    return {
      preferences: data.preferences,
      analytics: data.analytics === true,
      marketing: data.marketing === true,
      thirdParty: data.thirdParty === true || (data.thirdParty === undefined && everythingElse),
    };
  } catch {
    return null;
  }
}

export function readSavedConsent(): Consent | null {
  const fromCookie = parseConsent(readCookie(CHOICE_COOKIE));
  if (fromCookie) return fromCookie;
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function consentLabel(value: Consent | null | undefined) {
  if (!value) return "Ainda sem escolha.";
  if (value.preferences && value.analytics && value.marketing && value.thirdParty) return "Tudo aceito.";
  if (!value.preferences && !value.analytics && !value.marketing && !value.thirdParty) return "Só o necessário.";
  return "Escolha personalizada.";
}

export function saveConsent(value: Consent) {
  const raw = JSON.stringify(value);
  writeCookie(CHOICE_COOKIE, raw, 60 * 60 * 24 * 180);
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
  applyCookieChoice(value.analytics || value.marketing);
  if (!value.preferences) clearStoredKind("preferences");
}
