// api/cron.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_API_BASE = process.env.MAX_API_BASE || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';

// In-memory storage (replace with KV/DB)
const MEMORY: Record<string, any> = (global as any).__MEM || ((global as any).__MEM = {});

async function sendMessage(chat_id: string | number, text: string) {
  if (!MAX_API_BASE || !MAX_BOT_TOKEN) {
    console.warn('[cron] MAX_API_BASE or MAX_BOT_TOKEN not set');
    return;
  }
  // TODO: replace with real MAX send endpoint
  await fetch(`${MAX_API_BASE}/messages.send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MAX_BOT_TOKEN}` },
    body: JSON.stringify({ chat_id, text }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const now = new Date();
  const hour = now.getUTCHours();

  for (const [userId, data] of Object.entries(MEMORY)) {
    const chat_id = (data as any)['chat_id'];
    if (!chat_id) continue;

    const settings = (data as any)['settings'] || {};
    const tasks = (data as any)['tasks'] || [];

    const productiveTime = settings.productiveTime || 'morning';
    const dailyHours = Number(settings.dailyHours || 4);

    const startHourMap: Record<string, number> = { morning: 8, afternoon: 12, evening: 17, night: 21 };
    const startHour = startHourMap[productiveTime] ?? 8;
    const endHour = startHour + dailyHours;

    if (hour >= startHour && hour < endHour) {
      const incomplete: string[] = [];
      tasks.forEach((t: any) => {
        (t.subTasks || []).forEach((st: any) => {
          if (!st.completed) incomplete.push(`• ${t.title} — ${st.title}`);
        });
      });
      if (incomplete.length) {
        const list = incomplete.slice(0, 5).join('\n');
        await sendMessage(chat_id, `⏰ Напоминание: незавершённые дела:\n${list}\n\nОткройте мини-приложение, чтобы продолжить.`);
      }
    }
  }

  return res.json({ ok: true });
}