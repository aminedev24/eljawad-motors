import { Html, Head, Main, NextScript } from "next/document";
import getConfig from 'next/config';

// Aurora chat widget (public/widget.js) is switched off for now; set to true
// to load it again. Both scripts below are skipped while this is false.
const CHAT_WIDGET_ENABLED = false;

export default function Document() {
    const { publicRuntimeConfig } = getConfig() || {};
    const basePath = publicRuntimeConfig?.basePath || '';
  return (
    <Html lang="en">
      <Head>
        {/*<link rel="icon" href= {`${basePath}/images/logo3.png`} />*/}

          {/* Standard favicons for various sizes */}
        <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/icons/favicon-32x32.png`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/icons/favicon-16x16.png`} />
        
        {/* Traditional .ico favicon (often used as a fallback) */}
        <link rel="shortcut icon" type="image/x-icon" href={`${basePath}/icons/favicon.ico`} />

        {/* Apple Touch Icon (for iOS home screen) */}
        <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/icons/apple-touch-icon.png`} />
        
        {/* Android Chrome icons (for Android home screen and PWA manifest) */}
        <link rel="icon" type="image/png" sizes="192x192" href={`${basePath}/icons/android-chrome-192x192.png`} />
        <link rel="icon" type="image/png" sizes="512x512" href={`${basePath}/icons/android-chrome-512x512.png`} />

        {/* Web App Manifest (for Progressive Web Apps) */}
        <link rel="manifest" href={`${basePath}/icons/site.webmanifest`} />

      </Head>
      <body>
        <Main />
        <NextScript />
        {CHAT_WIDGET_ENABLED && (<>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const path = window.location.pathname;
              const isAdmin = path === "/admin" || path.startsWith("/admin/");
              if (isAdmin) return;
              const script = document.createElement("script");
              script.src = ${JSON.stringify(`${basePath}/widget.js?v=20260713-2`)};
              script.dataset.slug = "artisbay";
              script.async = true;
              document.body.appendChild(script);
            })();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const isAskAurora = (button) => !!button && /ask\\s+aurora/i.test((button.textContent || "").trim());
              const openAuroraWidget = (attempt = 0) => {
                if (window.__auroraWidget && typeof window.__auroraWidget.open === "function") {
                  window.__auroraWidget.open();
                  return;
                }
                if (attempt < 20) {
                  setTimeout(() => openAuroraWidget(attempt + 1), 100);
                }
              };

              document.addEventListener("click", (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const askButton = target.closest(".droid-action-row .droid-action-btn.primary");
                if (askButton && isAskAurora(askButton)) {
                  setTimeout(openAuroraWidget, 0);
                  return;
                }

                const droidHit = target.closest(".droid-body, .droid-aurora-canvas");
                if (!droidHit) return;

                const primaryAction = document.querySelector(".droid-action-row .droid-action-btn.primary");
                if (isAskAurora(primaryAction)) {
                  openAuroraWidget();
                }
              }, true);
            })();`,
          }}
        />
        </>)}
      </body>
    </Html>
  );
}
