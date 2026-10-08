import { create } from 'zustand';
import { File, Paths } from 'expo-file-system';

// Saved in the app's private document directory so the server choice survives restarts
const configFile = () => new File(Paths.document, 'local-server.json');

/** Live backend, used when "Live" is selected on the login screen */
export const LIVE_URL = 'https://epass.scriptindia.in';

/** Port of the local backend + database used in Offline Sync mode */
const DATABASE_PORT = 8008;

const DEFAULT_OFFLINE_IP = '192.168.0.50';

export type ServerMode = 'live' | 'offline';

interface ServerState {
  mode: ServerMode;
  /** Offline Sync backend machine on the WiFi, e.g. "192.168.0.50" */
  offlineIp: string;
  setMode: (mode: ServerMode) => void;
  setOfflineIp: (ip: string) => void;
}

function readConfig(): { mode: ServerMode; offlineIp: string } {
  try {
    const file = configFile();
    if (file.exists) {
      const saved = JSON.parse(file.textSync());
      return {
        mode: saved.mode === 'offline' ? 'offline' : 'live',
        // older versions saved an "address" like "172.29.7.9:4000"
        offlineIp: toHost(saved.offlineIp || saved.address || '') || DEFAULT_OFFLINE_IP,
      };
    }
  } catch {}
  return { mode: 'live', offlineIp: DEFAULT_OFFLINE_IP };
}

export const useLocalServerStore = create<ServerState>((set, get) => {
  const persist = () => {
    try {
      const { mode, offlineIp } = get();
      const file = configFile();
      if (!file.exists) file.create();
      file.write(JSON.stringify({ mode, offlineIp }));
    } catch {}
  };
  return {
    ...readConfig(),
    setMode: (mode) => {
      set({ mode });
      persist();
    },
    setOfflineIp: (ip) => {
      set({ offlineIp: toHost(ip) });
      persist();
    },
  };
});

/** Backend for login, guest lookup and entries: live server, or the Offline Sync database */
export function backendUrl(): string {
  const { mode, offlineIp } = useLocalServerStore.getState();
  return mode === 'live' ? LIVE_URL : `http://${requireIp(offlineIp)}:${DATABASE_PORT}`;
}

function requireIp(ip: string) {
  if (!ip) throw new Error('Offline Sync IP not set. Enter it on the login screen.');
  return ip;
}

/** "http://192.168.0.50:4000/" → "192.168.0.50" */
export function toHost(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d*$/, '');
}
