import * as Network from 'expo-network';
import { File, Paths } from 'expo-file-system';

// Stored in the app's private document directory: <documents>/device-ip.json
const ipFile = () => new File(Paths.document, 'device-ip.json');

const isUsableIp = (ip?: string | null) => !!ip && ip !== '0.0.0.0';

/**
 * expo-network reads the IP from the Wi-Fi interface, so on mobile data it returns '0.0.0.0'.
 * In that case fall back to the phone's public IP as seen from the internet.
 */
async function fetchPublicIp(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    const { ip } = await res.json();
    return typeof ip === 'string' ? ip : '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

/** Reads the phone's current IP, saves it to device-ip.json and returns it ('' if unavailable) */
export async function captureDeviceIp(): Promise<string> {
  try {
    let ipAddress = '';
    try {
      ipAddress = await Network.getIpAddressAsync();
    } catch {}
    if (!isUsableIp(ipAddress)) ipAddress = await fetchPublicIp();

    const file = ipFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify({ ipAddress, capturedAt: new Date().toISOString() }));
    return ipAddress;
  } catch {
    return '';
  }
}
