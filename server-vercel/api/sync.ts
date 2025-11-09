// api/sync.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Minimal in-memory store (NOT persistent). Replace with Vercel KV / DB in production.
 */
const MEMORY: Record<string, any> = (global as any).__MEM || ((global as any).__MEM = {});

// TODO: implement MAX launch auth verification here
function verifyLaunchAuth(authHeader?: string) {
  if (!authHeader) return null;
  // Implement according to dev.max.ru docs:
  // parse auth payload, check HMAC/signature with your bot token/secret
  return {}; // return decoded object if valid, or null if invalid
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const auth = req.headers['x-max-auth'] as string | undefined;
  const verified = verifyLaunchAuth(auth);
  if (auth && !verified) {
    return res.status(401).json({ ok: false, error: 'Bad auth' });
  }

  const { user_id, chat_id, data } = req.body || {};
  if (!user_id) return res.status(400).json({ ok: false, error: 'user_id required' });

  const prev = MEMORY[user_id] || {};
  MEMORY[user_id] = { ...prev, ...(data || {}) };
  if (chat_id) MEMORY[user_id].chat_id = chat_id;

  return res.json({ ok: true });
}