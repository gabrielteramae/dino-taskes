import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/toaster";
import { readSavedConsent } from "@/lib/consent";
import { getPrefs } from "@/lib/prefs";
import { applyTheme, readStoredTheme } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Tarefas";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#09090b" },
      {
        name: "description",
        content: "Lista de tarefas simples para o celular.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
});

function ThirdPartyFonts() {
  useEffect(() => {
    const id = "third-party-font";
    const sync = () => {
      const allow = readSavedConsent()?.thirdParty === true;
      const current = document.getElementById(id);
      if (!allow) {
        current?.remove();
        return;
      }
      if (current) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    };
    sync();
    window.addEventListener("cookie-consent", sync);
    return () => window.removeEventListener("cookie-consent", sync);
  }, []);
  return null;
}

function ThemeSync() {
  useEffect(() => {
    applyTheme(readStoredTheme());
    void getPrefs()
      .then((prefs) => applyTheme(prefs.theme))
      .catch(() => undefined);
  }, []);
  return null;
}

function Root() {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(localStorage.getItem("dino-theme")==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()',
          }}
        />
        <HeadContent />
      </head>
      <body>
        <ThemeSync />
        <ThirdPartyFonts />
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <CookieConsent />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
