import { create } from 'zustand';
import { File, Paths } from 'expo-file-system';

// Saved in the app's private document directory so the laptop address survives restarts
const configFile = () => new File(Paths.document, 'local-server.json');

/** Event laptop running local-server/server.js; every entry goes through it */
const DEFAULT_ADDRESS = '172.29.7.9:4000';

interface LocalServerState {
  /** Laptop address on the WiFi, e.g. "172.29.7.9:4000" */
  address: string;
  setAddress: (address: string) => void;
}

function readAddress(): string {
  try {
    const file = configFile();
    if (file.exists) return JSON.parse(file.textSync()).address || DEFAULT_ADDRESS;
  } catch {}
  return DEFAULT_ADDRESS;
}

export const useLocalServerStore = create<LocalServerState>((set) => ({
  address: readAddress(),
  setAddress: (address) => {
    set({ address });
    try {
      const file = configFile();
      if (!file.exists) file.create();
      file.write(JSON.stringify({ address }));
    } catch {}
  },
}));

/** Base URL of the laptop server; throws if no address is set */
export function laptopUrl(): string {
  const { address } = useLocalServerStore.getState();
  if (!address.trim()) throw new Error('Laptop address not set. Enter it in the Sync tab.');
  return toBaseUrl(address);
}

export function toBaseUrl(address: string) {
  const a = address.trim().replace(/\/+$/, '');
  const withScheme = /^https?:\/\//.test(a) ? a : `http://${a}`;
  // Default port of local-server/server.js
  return /:\d+$/.test(withScheme) ? withScheme : `${withScheme}:4000`;
}
