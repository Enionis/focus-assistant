// app/max-bridge.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type BridgeInfo = {
  user_id?: string;
  chat_id?: string;
  auth?: string;
};

export async function initMaxBridge(baseApiUrl: string) {
  try {
    const params = new URLSearchParams(globalThis.location?.search || '');
    const info: BridgeInfo = {
      user_id: params.get('user_id') || undefined,
      chat_id: params.get('chat_id') || undefined,
      auth: params.get('auth') || undefined,
    };
    await AsyncStorage.setItem('max_bridge', JSON.stringify(info));
    return info;
  } catch (e) {
    console.warn('[max-bridge] init error', e);
    return {};
  }
}

export async function syncToServer(baseApiUrl: string, payload: any) {
  try {
    const bridgeRaw = await AsyncStorage.getItem('max_bridge');
    const bridge = bridgeRaw ? JSON.parse(bridgeRaw) as BridgeInfo : {};
    if (!baseApiUrl) return; // optional: allow pure-GH-Pages mode
    await fetch(`${baseApiUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bridge.auth ? { 'X-Max-Auth': bridge.auth } : {}),
      },
      body: JSON.stringify({
        user_id: bridge.user_id,
        chat_id: bridge.chat_id,
        data: payload,
      }),
    });
  } catch (e) {
    console.warn('[max-bridge] sync error', e);
  }
}