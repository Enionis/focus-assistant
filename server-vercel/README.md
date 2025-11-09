# Focus Assistant — Vercel Server (MAX Bot + Sync + Cron)

This folder is a separate Vercel project that powers:
- `/api/webhook` — MAX bot webhook (sends OpenAppButton pointing to your mini-app)
- `/api/sync` — receives snapshots from the mini-app (state sync)
- `/api/cron` — runs every 10 minutes (Vercel Cron) and sends reminders during active hours

## Setup

1) Create a Vercel project from this `server-vercel` folder.
2) Set Environment Variables:
```
MAX_API_BASE=<real max api base>   # e.g. https://api.max.ru/bot
MAX_BOT_TOKEN=<your bot token>
WEB_APP_URL=https://enionis.github.io/focus-assistant
```
3) Deploy. Copy the deployed webhook URL and set it in MAX console.

> NOTE: For production, use persistent storage (Vercel KV/DB) instead of the in-memory store.
> Also implement real MAX **launch auth verification** in `/api/sync` and replace `sendMessage()` with official endpoints.