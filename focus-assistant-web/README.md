# Focus Assistant — MAX Mini-App (Web Only)

- **Web-only Expo** project (React Native Web + Expo Router).
- Preserves the original design language (colors/typography/layout).
- Includes **MAX bridge** (`app/max-bridge.ts`) to read `user_id/chat_id/auth` from query and sync to backend (optional).
- **OpenAppButton** of the bot should point to: `https://enionis.github.io/focus-assistant`.

## Scripts (npm)

```bash
npm install
npm run start     # dev server (web)
npm run build     # export static web to dist/
```

For GitHub Pages:
```bash
npm run build
cp dist/index.html dist/404.html
# Publish dist/ to GitHub Pages, path: /focus-assistant
```

### Backend (optional for reminders & sync)
If you need reminders/central storage, deploy a small backend and set:
```
EXPO_PUBLIC_MAX_BACKEND=https://<your-server>
```
The app will post snapshots to `<server>/api/sync` via `max-bridge.ts`.