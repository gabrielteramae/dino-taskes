export const LOCATION_KEY = "location-use";

export type LocationBrowser = "granted" | "denied" | "prompt" | "unsupported";

export function appUsesLocation() {
  try {
    return localStorage.getItem(LOCATION_KEY) === "on";
  } catch {
    return false;
  }
}

export function stopUsingLocation() {
  try {
    localStorage.setItem(LOCATION_KEY, "off");
  } catch {
    /* ignore */
  }
}

export async function browserLocationState(): Promise<LocationBrowser> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  if (!navigator.permissions?.query) return "prompt";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted" || status.state === "denied") return status.state;
    return "prompt";
  } catch {
    return "prompt";
  }
}

export function askForLocation() {
  return new Promise<"granted" | "denied">((resolve) => {
    if (!navigator.geolocation) {
      stopUsingLocation();
      resolve("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        try {
          localStorage.setItem(LOCATION_KEY, "on");
        } catch {
          /* ignore */
        }
        resolve("granted");
      },
      () => {
        stopUsingLocation();
        resolve("denied");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  });
}
