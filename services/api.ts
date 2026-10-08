import { ApiMessage, Employee, GuestDetails, InOutEntry, User } from '@/lib/types';
import { captureDeviceIp } from '@/lib/deviceIp';
import axios from 'axios';

import { backendUrl } from '@/store/localServerStore';

// Base URL is read on every request, so switching Live / Offline Sync or changing the IP applies at once
const useBackend = (config: any) => {
  config.baseURL = backendUrl();
  return config;
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});
api.interceptors.request.use(useBackend);

const guestLookupApi = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});
guestLookupApi.interceptors.request.use(useBackend);

// types/employee.ts

export interface AttendanceEntry {
  id: string;
  employee_id: string;
  scan_type: 'IN' | 'OUT';
  scanned_by: string;
  scan_time: string;
  created_at: string;
  employee?: Employee;
}

export const apiService = {
  /** Marks entry for a scanned QR; returns the backend's { value, message } as-is */
  async eventInTimeByQrName(
    qrName: string,
    eventId: string,
    dateTime = formatIST().dateTime, // pass the original time when syncing offline entries
  ): Promise<ApiMessage> {
    const mobileName = await captureDeviceIp();
    try {
      const { data } = await axios.post(`${backendUrl()}/EventInTimeByQrName`, {
        QrName: qrName,
        eventid: eventId,
        DeviceIp: 'Insert using Mobile App',
        MobileName: mobileName, // phone IP, captured at submit
        LogDate: dateTime,
        EntryDate: dateTime,
        InFlag: '1',
      });
      return data;
    } catch (error: any) {
      const data = error?.response?.data;
      if (data && typeof data.value === 'boolean') return data;
      throw backendError(error);
    }
  },

  async login(AppUserName: string, AppPassword: string): Promise<User> {
    try {
      const response = await guestLookupApi.post('/AppUserAuthentication', {
        AppUserName,
        AppPassword,
      });
      if (response.data) {
        return response.data;
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Login failed');
      }
      throw error;
    }
  },

  async eventTime(payload: any) {
    try {
      const response = await api.post('/EventInTime', payload);
      if (response.data) {
        return response.data;
      } else {
        throw new Error('event failed');
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Login failed');
      }
      throw error;
    }
  },

  async getEmployeeByBarcode(qrValue: string): Promise<GuestDetails[] | ApiMessage> {
    try {
      const response = await guestLookupApi.get('/QrCodeGuestDetails', {
        params: { QRValue: qrValue },
      });
      return response.data;
    } catch (error: any) {
      throw backendError(error);
    }
  },

  async postIn(payload: any) {
    const data = await guestLookupApi.post('/EventInTime', payload);
    return data.data;
  },

  async postOut(payload: any) {
    const { data } = await api.post('/EventOutTime', payload);
    return data;
  },

  /** High-level helper that chooses endpoint and builds the right payload */
  async createAttendanceEntry(employee: EmployeeLite, type: ScanType, dateTime?: string) {
    const payload = buildPayload(employee, await captureDeviceIp(), dateTime);

    console.log('Attendance Payload:', payload);

    try {
      return type === 'IN'
        ? await this.postIn(payload)
        : await this.postOut(payload);
    } catch (err: any) {
      throw backendError(err);
    }
  },

  async getTodayEntries(): Promise<InOutEntry[]> {
    try {
      const response = await api.get(`/GetEventAttendanceLog`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Failed to fetch entries');
      }
      throw error;
    }
  },
};

function backendError(error: any) {
  const data = error?.response?.data;
  const err = new Error(data?.message || data?.error || data?.ErrorMessage || error?.message);
  // No response at all → request never reached the backend (no internet / timeout)
  (err as any).offline = !!error?.isAxiosError && !error.response;
  return err;
}

/** True when an error from apiService means the backend couldn't be reached */
export function isOfflineError(error: any) {
  return !!error?.offline;
}

export { formatIST };

type ScanType = 'IN' | 'OUT';

interface EmployeeLite {
  EventLogId: string | number | null;
  QrId: string | null;
  QrName: string | null;
  EventId: string | number | null;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format a JS Date to IST "YYYY-MM-DD HH:mm:ss" and "YYYY-MM-DD" */
function formatIST(date = new Date()) {
  // Convert to IST (UTC+5:30)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 60 * 60 * 1000);

  const Y = istDate.getUTCFullYear();
  const M = pad(istDate.getUTCMonth() + 1);
  const D = pad(istDate.getUTCDate());
  const h = pad(istDate.getUTCHours());
  const m = pad(istDate.getUTCMinutes());
  const s = pad(istDate.getUTCSeconds());

  return {
    dateTime: `${Y}-${M}-${D} ${h}:${m}:${s}`,
    dateOnly: `${Y}-${M}-${D}`,
  };
}

function buildPayload(employee: EmployeeLite, mobileName: string, dateTime = formatIST().dateTime) {

  return {
    DeviceIp: 'Insert using Mobile App',
    MobileName: mobileName, // phone IP, captured when IN is pressed
    LogDate: dateTime, // "YYYY-MM-DD HH:mm:ss"
    QrName: employee.QrName,
    QrId: employee.QrId,
    EntryDate: dateTime, // "YYYY-MM-DD HH:mm:ss"
    InFlag: '1', // "1" = IN, "2" = OUT
    eventid: employee.EventId != null ? String(employee.EventId) : null, // from login response
  };
}
