import axios from 'axios';
import { ApiMessage, InOutEntry } from '@/lib/types';
import { captureDeviceIp } from '@/lib/deviceIp';
import { laptopUrl, toBaseUrl } from '@/store/localServerStore';

/** Calls to the laptop server (local-server/server.js) on the event WiFi */

export interface LocalStatus {
  guests: number;
  entries: number;
  pending: number;
  lastDownload: string | null;
}

async function call<T>(baseUrl: string, method: 'GET' | 'POST', path: string, data: object, timeout = 8000) {
  try {
    const res = await axios.request<T>({
      baseURL: baseUrl,
      url: path,
      method,
      timeout,
      ...(method === 'GET' ? { params: data } : { data }),
    });
    return res.data;
  } catch (error: any) {
    const body = error?.response?.data;
    if (body?.message) throw new Error(body.message);
    const err = new Error(`Laptop server not reachable at ${baseUrl}. Check it is running and on the same WiFi.`);
    (err as any).offline = true; // read by isOfflineError()
    throw err;
  }
}

export const localApi = {
  status: (address: string, eventId: string) =>
    call<LocalStatus & ApiMessage>(toBaseUrl(address), 'GET', '/status', { eventId }),

  /** Sync from Live: the laptop downloads the guest list (the laptop needs internet for this) */
  download: (address: string, eventId: string) =>
    call<LocalStatus & ApiMessage>(toBaseUrl(address), 'POST', '/download', { eventId }, 120000),

  /** Sync to Live: the laptop uploads pending entries (the laptop needs internet for this) */
  upload: (address: string, eventId: string) =>
    call<LocalStatus & ApiMessage>(toBaseUrl(address), 'POST', '/upload', { eventId }, 600000),

  /** Mark IN by scanned QR value or typed QR name; the laptop rejects duplicates from any phone */
  async markEntry(
    eventId: string,
    guest: { qrValue: string } | { qrName: string },
    source: 'scan' | 'manual',
  ) {
    const baseUrl = laptopUrl();
    const mobileName = await captureDeviceIp();
    return call<ApiMessage>(baseUrl, 'POST', '/entry', { eventId, ...guest, mobileName, source });
  },

  entries: (eventId: string) =>
    call<InOutEntry[]>(laptopUrl(), 'GET', '/entries', { eventId }),
};
