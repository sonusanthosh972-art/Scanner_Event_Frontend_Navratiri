/**
 * Offline event server — run on a laptop connected to the same WiFi as the scanner phones.
 *
 *   node local-server/server.js            (port 4000)
 *   PORT=5000 node local-server/server.js
 *
 * Every phone sends its scans here, so a guest can only be entered once per day across all phones,
 * even when the WiFi has no internet. Data is kept in local-server/data.json.
 *
 *   POST /download {eventId}   "Sync from Live": fetch the guest list + today's live entries
 *   POST /entry    {eventId, qrValue | qrName, mobileName}   mark a guest IN (duplicate-checked)
 *   GET  /entries?eventId=     local entries, newest first (same shape as GetEventAttendanceLog)
 *   GET  /status?eventId=      counts + last download time
 *   POST /upload   {eventId}   "Sync to Live": send entries not yet on the live server
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT) || 4000;
const LIVE_URL = process.env.LIVE_URL || 'https://epass.scriptindia.in';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

/* ---------- storage ---------- */

// events[eventId] = { guests: [...GetAllGenerateQr rows], lastDownload }
// entries = [{ id, eventId, qrId, qrName, passValidity, logDate, day, mobileName, source, synced, syncMessage }]
let db = { events: {}, entries: [], nextId: 1 };
if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

function save() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DATA_FILE); // atomic: a crash never leaves a half-written file
}

// Lookup maps per event, rebuilt after each download
const indexes = {};
function guestIndex(eventId) {
  if (!indexes[eventId]) {
    const byValue = new Map();
    const byName = new Map();
    for (const g of db.events[eventId]?.guests ?? []) {
      if (g.QrValue) byValue.set(norm(g.QrValue), g);
      if (g.QrName) byName.set(norm(g.QrName), g);
    }
    indexes[eventId] = { byValue, byName };
  }
  return indexes[eventId];
}

const norm = (s) => String(s).trim().toUpperCase();

/* ---------- dates (IST) ---------- */

const pad = (n) => String(n).padStart(2, '0');

/** "YYYY-MM-DD HH:mm:ss" in IST — same format the app sends to the live server */
function nowIST() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

/** "YYYY-MM-DD ..." or live's "07-Oct-2026 13:54:15" → "YYYY-MM-DD" */
function dayOf(logDate) {
  const s = String(logDate || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  return m ? `${m[3]}-${pad(MONTHS[m[2]] || 0)}-${pad(m[1])}` : '';
}

/* ---------- handlers ---------- */

async function download({ eventId }) {
  eventId = String(eventId || '');
  if (!eventId) return { value: false, message: 'eventId is required' };

  const guests = await fetchJson(`${LIVE_URL}/GetAllGenerateQr?EventId=${encodeURIComponent(eventId)}`);
  if (!Array.isArray(guests)) return { value: false, message: 'Live server returned no guest list' };

  db.events[eventId] = { guests, lastDownload: nowIST() };
  delete indexes[eventId];
  const { byName } = guestIndex(eventId);

  // Entries already made on the live server today also count as duplicates
  let imported = 0;
  const log = await fetchJson(`${LIVE_URL}/GetEventAttendanceLog`).catch(() => []);
  for (const e of Array.isArray(log) ? log : []) {
    const guest = e.qrName && byName.get(norm(e.qrName));
    const day = dayOf(e.logDate);
    if (!guest || !day || findEntry(eventId, guest.QrName, day)) continue;
    db.entries.push({
      id: db.nextId++,
      eventId,
      qrId: guest.QrId,
      qrName: guest.QrName,
      passValidity: guest.PassValidity,
      logDate: e.logDate,
      day,
      mobileName: e.deviceIp || 'live',
      source: 'live',
      synced: true,
      syncMessage: 'Already on live server',
    });
    imported++;
  }
  save();
  return {
    value: true,
    message: `Downloaded ${guests.length} passes and ${imported} existing live entries.`,
    ...status({ eventId }),
  };
}

function findEntry(eventId, qrName, day) {
  const name = norm(qrName);
  return db.entries.find((e) => e.eventId === eventId && e.day === day && norm(e.qrName) === name);
}

function markEntry({ eventId, qrValue, qrName, mobileName, source }) {
  eventId = String(eventId || '');
  if (!db.events[eventId]) {
    return { value: false, message: 'Guest list not downloaded on the laptop. Tap "Sync from Live" first.' };
  }
  const { byValue, byName } = guestIndex(eventId);
  const guest = qrValue ? byValue.get(norm(qrValue)) : qrName ? byName.get(norm(qrName)) : null;
  if (!guest) return { value: false, message: 'Invalid QR. This pass is not registered for this event.' };
  if (guest.IsActive === 0 || guest.IsActive === false) {
    return { value: false, message: `${guest.QrName}: this pass is inactive.` };
  }

  const logDate = nowIST();
  const day = logDate.slice(0, 10);
  // Node handles one request at a time, so check + insert cannot race between phones
  const existing = findEntry(eventId, guest.QrName, day);
  if (existing) {
    const at = existing.logDate.includes(' ') ? existing.logDate.split(' ')[1] : existing.logDate;
    return { value: false, message: `${guest.QrName} already entered today at ${at}.` };
  }

  db.entries.push({
    id: db.nextId++,
    eventId,
    qrId: guest.QrId,
    qrName: guest.QrName,
    passValidity: guest.PassValidity,
    logDate,
    day,
    mobileName: mobileName || '',
    source: source || 'scan',
    synced: false,
    syncMessage: null,
  });
  save();
  return { value: true, message: `${guest.QrName} entry marked successfully.` };
}

function listEntries({ eventId }) {
  eventId = String(eventId || '');
  return db.entries
    .filter((e) => e.eventId === eventId)
    .sort((a, b) => b.id - a.id)
    .map((e) => ({
      eventLogId: e.id,
      logDate: e.logDate,
      qrId: e.qrId,
      qrName: e.qrName,
      inFlag: '1',
      passValidity: e.passValidity,
      synced: e.synced,
    }));
}

function status({ eventId }) {
  eventId = String(eventId || '');
  const entries = db.entries.filter((e) => e.eventId === eventId);
  return {
    guests: db.events[eventId]?.guests.length ?? 0,
    entries: entries.length,
    pending: entries.filter((e) => !e.synced).length,
    lastDownload: db.events[eventId]?.lastDownload ?? null,
  };
}

let uploading = false;
async function upload({ eventId }) {
  eventId = String(eventId || '');
  if (uploading) return { value: false, message: 'Sync to Live is already running.' };
  uploading = true;
  let sent = 0;
  let rejected = 0;
  try {
    for (const e of db.entries.filter((x) => x.eventId === eventId && !x.synced)) {
      let res;
      try {
        res = await fetchJson(`${LIVE_URL}/EventInTimeByQrName`, {
          method: 'POST',
          body: {
            QrName: e.qrName,
            eventid: eventId,
            DeviceIp: 'Insert using Mobile App',
            MobileName: e.mobileName,
            LogDate: e.logDate,
            EntryDate: e.logDate,
            InFlag: '1',
          },
        });
      } catch (err) {
        // No internet: stop and keep the rest pending for the next try
        save();
        return {
          value: false,
          message: `Live server not reachable (${err.message}). Sent ${sent}, ${status({ eventId }).pending} still pending.`,
          ...status({ eventId }),
        };
      }
      // Any reply from the backend (accepted or e.g. "already marked") means it has seen this entry
      e.synced = true;
      e.syncMessage = res?.message ?? '';
      if (res?.value === false) rejected++;
      else sent++;
      save();
    }
  } finally {
    uploading = false;
  }
  const extra = rejected ? ` ${rejected} were refused by the live server (usually already entered there).` : '';
  return { value: true, message: `Uploaded ${sent} entries.${extra}`, ...status({ eventId }) };
}

/* ---------- http ---------- */

async function fetchJson(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status} from live server`);
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const routes = {
  'GET /status': (q) => ({ value: true, ...status(q) }),
  'GET /entries': listEntries,
  'POST /entry': markEntry,
  'POST /download': download,
  'POST /upload': upload,
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const handler = routes[`${req.method} ${url.pathname}`];
    let status = 200;
    let out;
    try {
      if (!handler) {
        status = 404;
        out = { value: false, message: 'Not found' };
      } else {
        const input = req.method === 'GET' ? Object.fromEntries(url.searchParams) : await readBody(req);
        out = await handler(input);
      }
    } catch (err) {
      status = 500;
      out = { value: false, message: err.message };
    }
    console.log(`${nowIST()}  ${req.method} ${url.pathname}  ${out?.message ?? ''}`);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out));
  })
  .listen(PORT, '0.0.0.0', () => {
    const ips = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => i.address);
    console.log(`Event server running. In the app's Sync tab enter one of:`);
    for (const ip of ips) console.log(`   ${ip}:${PORT}`);
  });
