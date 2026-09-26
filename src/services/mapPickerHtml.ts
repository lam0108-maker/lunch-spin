/** Google Maps JavaScript API map HTML for iframe (web) / WebView (native). */

export type MapPickerInitial = {
  lat: number;
  lng: number;
  zoom?: number;
  /** Google Maps JS API key; if missing/invalid, returns 繁中 error page */
  apiKey?: string;
};

const DEFAULT_ZOOM = 15;

/** Safe embed: alphanumeric + underscore + hyphen only */
function sanitizeApiKey(key: string | undefined): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed || !/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

function buildMissingKeyHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #e8eef2; font-family: system-ui, -apple-system, sans-serif; }
    .box { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 24px; box-sizing: border-box; text-align: center; }
    h1 { font-size: 16px; color: #1a1a1a; margin: 0 0 12px; }
    p { font-size: 13px; color: #6b6b6b; line-height: 1.5; margin: 0; max-width: 320px; }
    code { font-size: 12px; background: #fff; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>未設定 Google Maps API key</h1>
    <p>請喺 <code>.env</code> 設定 <code>EXPO_PUBLIC_GOOGLE_MAPS_API_KEY</code>（或重用 <code>EXPO_PUBLIC_GOOGLE_PLACES_API_KEY</code>），並喺 Google Cloud Console 啟用 <strong>Maps JavaScript API</strong>。詳見 <code>SETUP.md</code>。</p>
  </div>
</body>
</html>`;
}

/**
 * Build Google Maps picker HTML.
 * Placeholders __LAT__/__LNG__/__ZOOM__/__API_KEY__ are replaced before return.
 */
export function buildMapPickerHtml(initial: MapPickerInitial): string {
  const apiKey = sanitizeApiKey(initial.apiKey);
  if (!apiKey) {
    return buildMissingKeyHtml();
  }

  const lat = Number.isFinite(initial.lat) ? initial.lat : 22.3193;
  const lng = Number.isFinite(initial.lng) ? initial.lng : 114.1694;
  const zoom =
    Number.isFinite(initial.zoom) && initial.zoom != null
      ? initial.zoom
      : DEFAULT_ZOOM;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #e8eef2; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    window.INITIAL = { lat: __LAT__, lng: __LNG__, zoom: __ZOOM__ };
  </script>
  <script>
    (function () {
      function postCenter(map) {
        var c = map.getCenter();
        if (!c) return;
        var payload = JSON.stringify({
          type: 'center',
          lat: c.lat(),
          lng: c.lng(),
          zoom: map.getZoom()
        });
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(payload);
          }
        } catch (e) {}
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, '*');
          }
        } catch (e) {}
      }

      window.initMapPicker = function () {
        var init = window.INITIAL || { lat: 22.3193, lng: 114.1694, zoom: 15 };
        var map = new google.maps.Map(document.getElementById('map'), {
          center: { lat: init.lat, lng: init.lng },
          zoom: init.zoom,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false
        });

        map.addListener('idle', function () { postCenter(map); });
        map.addListener('click', function (e) {
          if (e.latLng) map.panTo(e.latLng);
        });
      };
    })();
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=__API_KEY__&callback=initMapPicker" async defer></script>
</body>
</html>`
    .replace('__LAT__', String(lat))
    .replace('__LNG__', String(lng))
    .replace('__ZOOM__', String(zoom))
    .replace('__API_KEY__', apiKey);
}

/** Hong Kong default (旺角) when no session coords */
export const HK_DEFAULT_CENTER = {
  lat: 22.3193,
  lng: 114.1694,
  zoom: DEFAULT_ZOOM,
} as const;
