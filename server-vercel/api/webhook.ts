// api/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_API_BASE = process.env.MAX_API_BASE || ''; // e.g. https://api.max.ru/bot
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://enionis.github.io/focus-assistant';

async function sendMessage(chat_id: string | number, text: string, attachments?: any) {
  if (!MAX_API_BASE || !MAX_BOT_TOKEN) {
    console.warn('[webhook] MAX_API_BASE or MAX_BOT_TOKEN not set');
    return;
  }
  // TODO: replace with real MAX send endpoint, taken from dev.max.ru
  await fetch(`${MAX_API_BASE}/messages.send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MAX_BOT_TOKEN}` },
    body: JSON.stringify({ chat_id, text, attachments }),
  });
}

function openAppKeyboard() {
  // TODO: replace with real OpenAppButton payload according to MAX docs
  return {
    buttons: [
      [
        {
          type: 'open_app',
          text: 'Открыть мини-приложение',
          web_app: WEB_APP_URL,
        }
      ]
    ]
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const event = req.body || {};

  try {
    if (event.type === 'message_created') {
      const chat_id = event.message?.chat_id;
      const text = (event.message?.body?.text || '').trim();

      if (text === '/start' && chat_id) {
        await sendMessage(chat_id, 'Привет! Нажмите, чтобы открыть мини-приложение и внести данные.', { keyboard: openAppKeyboard() });
      } else if (chat_id) {
        await sendMessage(chat_id, 'Напишите /start, чтобы открыть мини-приложение.');
      }
    } else if (event.type === 'bot_started') {
      const chat_id = event.chat_id;
      if (chat_id) {
        await sendMessage(chat_id, 'Добро пожаловать! Откройте мини-приложение.', { keyboard: openAppKeyboard() });
      }
    }
  } catch (e) {
    console.error('[webhook] error', e);
  }

  return res.json({ ok: true });
}