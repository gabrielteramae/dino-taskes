import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { getPrefs } from "@/lib/prefs";
import { applyTheme, readStoredTheme } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Fantasma";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#09090b" },
      {
        name: "description",
        content: "Lista de tarefas simples com um fantasma que interage com você.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: Root,
});

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
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
