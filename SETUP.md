# 抽Lunch — 設定速查

## 1. 安裝

```bash
cd /workspace/lunch-spin   # 或你放專案嘅路徑
npm install
```

## 2. （可選）API Key

```bash
cp .env.example .env
# 填 EXPO_PUBLIC_GOOGLE_PLACES_API_KEY（附近搜尋）
# 同／或 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY（地圖揀位）
```

冇 Places key → Mock／OSM 模式，照常 `npx expo start`。
冇 Maps key → 地圖揀位會顯示設定提示（Places 搜尋唔受影響）。

### 地圖揀位（Google Maps JavaScript API）

地圖針尖揀位用 **Google Maps JavaScript API**（唔係 Places API）。

1. 到 [Google Cloud Console](https://console.cloud.google.com/) **啟用 Maps JavaScript API**  
   （只開 Places API **唔夠**，地圖 picker 會載入失敗。）
2. Key 設定：
   - 可選：獨立 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
   - 或留空，重用 `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`（同一個 Cloud key OK，但該 key 必須同時啟用 Maps JavaScript API）
3. **限制 key**：HTTP referrers（web：`localhost`、`127.0.0.1`、Expo web hosts）；正式 App 再加 iOS／Android 限制
4. **費用**：Google Maps JS 按 map load 計費（每月有免費額度）；請限制 key。個人／開發流量通常留喺 free tier。

改完 `.env` 要重新 `npx expo start`（或 `--web`）。

## 3. 跑起嚟

```bash
npx expo start
# 或 web 測地圖：
npx expo start --web
```

iPhone 裝 Expo Go → 掃碼。

## 4. EAS（之後）

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p ios
```

記得更新 `app.config.ts` 嘅 `projectId`，同埋 Apple Developer 帳號。

## 5. 將軍澳／牛頭角／觀塘本地種子庫

揀地區「將軍澳」或身喺 TKO bbox 內時，Nearby 會優先用 curated 種子（`src/data/tseung-kwan-o-restaurants.json`），避開嘈雜 OSM bakery／cafe。

- 開（預設）：`.env` 設 `EXPO_PUBLIC_LOCAL_SEED=1`，或唔設（預設開）
- 關：`EXPO_PUBLIC_LOCAL_SEED=0` → 強制走 OSM／Google 流程

改完 `.env` 要重新 `npx expo start`。
