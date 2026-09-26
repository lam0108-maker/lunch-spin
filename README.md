# 抽Lunch（Lunch Spin）

香港 iPhone 午餐抽獎 App。用你附近嘅餐廳做轉盤，加權唔會成日抽中你「唔鍾意」嘅舖。

> 技術路線：**Expo（React Native）+ EAS Build**，唔使本地 Mac / 唔使識 Swift。

## 功能（MVP）

1. 開啟 App → 請求 **When-In-Use** 定位
2. 揀半徑：slider 100m–2km（預設 1km）
3. Google Places Nearby Search（有 API key）或 **Mock 演示資料**（無 key）
4. 加權抽獎：`w = 1 / (1 + rejectCount)^1.3`
5. 轉盤動畫 + 觸覺反饋
6. 「去食」／「唔鍾意再抽」；今日 reject／已去食唔會再入池
7. 用 Google Maps URL（`place_id`）打開地圖

## 目錄結構

```
lunch-spin/
├── app/                    # Expo Router 畫面
│   ├── _layout.tsx
│   ├── index.tsx           # Setup：定位 + 半徑
│   ├── wheel.tsx           # 轉盤
│   └── result.tsx          # 結果
├── src/
│   ├── components/NameReel.tsx
│   ├── constants/          # 主題、HK 地區座標
│   ├── hooks/useLunchSession.tsx
│   ├── services/
│   │   ├── location.ts
│   │   ├── rejectStore.ts  # AsyncStorage
│   │   └── places/         # Google + mock
│   ├── types/
│   └── utils/weightedPick.ts
├── app.config.ts
├── eas.json
└── package.json
```

## 快速開始（Expo Go）

```bash
cd lunch-spin
npm install
npx expo start
```

用 iPhone 開 **Expo Go**，掃 QR code 即可（無需 Apple Developer）。

無設定 API key 時會自動用 **Mock 餐廳**，UI 一樣可以完整體驗。

### 設定 Google Places API Key（可選）

1. 到 [Google Cloud Console](https://console.cloud.google.com/) 啟用 **Places API (New)**
2. 建立 API key，**一定要限制**：
   - API 限制：只開 Places API (New)
   - App 限制：iOS bundle `com.lunchspin.app`（正式包）；開發期可暫時用 IP／唔限制，但唔好公開
3. 複製 `.env.example` 做 `.env`：

```bash
cp .env.example .env
# 編輯：
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=你的_key
```

4. 重新 `npx expo start`

> Client 入面嘅 key 始終有洩漏風險，上線前請務必限制 + 考慮用後端代理。


## 將軍澳／牛頭角／觀塘本地種子

身喺將軍澳（地區標籤含「將軍澳」或座標喺 TKO bbox）時，會用 `src/data/tseung-kwan-o-restaurants.json` 嘅 curated 午餐堂食名單，唔會用嘈雜 OSM bakery／cafe。

- 開關：`.env` 嘅 `EXPO_PUBLIC_LOCAL_SEED`（`1`=開／預設，`0`=關）
- 詳見 `SETUP.md` §5

## 定位被拒？

App 會提示你手動輸入地區（例如「銅鑼灣」），用內建香港地區座標表做搜尋中心。

## 之後上 TestFlight（唔使 Mac）

1. 註冊 [Apple Developer](https://developer.apple.com/)（年費約 USD $99）
2. 安裝 EAS CLI：`npm i -g eas-cli`，然後 `eas login`
3. 喺 [expo.dev](https://expo.dev) 開 project，把 `app.config.ts` 入面 `extra.eas.projectId` 換成真正 ID
4. 雲端打 iOS 包：

```bash
eas build --platform ios --profile preview
# 或正式：
eas build --platform ios --profile production
eas submit --platform ios
```

EAS 會喺雲端編譯，你唔需要本地 Xcode。

## Bundle / Package

- iOS：`com.lunchspin.app`
- Android：`com.lunchspin.app`（預留）

## 加權說明

- 本地用 AsyncStorage 以 `placeId` 記 reject 次數
- 權重：`w = 1 / (1 + rejectCount)^1.3`
- 今日 session 內 reject 嘅舖即刻移出池
- 今日撳過「去食」嘅舖今日唔會再抽中
- **唔會呼叫任何 AI** 幫你揀

## 授權字串（中文）

`NSLocationWhenInUseUsageDescription`：

> 需要你嘅位置，先可以搵附近有午餐供應嘅餐廳。

## 授權

私人專案 scaffold · 按需要自行調整。

## GitHub Pages（靜態網頁）

公開網址：https://lam0108-maker.github.io/lunch-spin/

`app.config.js` 設咗 `experiments.baseUrl: '/lunch-spin'`（project site）。靜態輸出用：

```bash
# 可選：複製並編輯 .env（唔好 commit）
cp .env.example .env
npx expo export --platform web
npx gh-pages -d dist -b gh-pages
```

Pages 來源：`gh-pages` branch、`/`（root）。

### `EXPO_PUBLIC_*` 係 bake-time

呢啲變數會喺 `expo export` 時寫入 JS bundle。Pages 上嘅 build 用 `.env` 嘅預設（`PLACES_PROVIDER=osm`、`LOCAL_SEED=1`、Google keys 留空）。

- **唔好**把真正 Google API keys commit 入 repo
- 要換 key／provider：本地改 `.env` → 重新 `expo export` → 再推 `gh-pages`
- 之後若用 GitHub Actions 重建，把 keys 放喺 Actions secrets，唔好寫死喺 yaml
