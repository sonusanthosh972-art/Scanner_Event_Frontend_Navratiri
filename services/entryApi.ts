import { ApiMessage, InOutEntry } from '@/lib/types';
import { apiService } from '@/services/api';

/**
 * Scan / Manual Entry / Entries, sent straight to the selected backend: the live server, or the local
 * backend at http://<Offline Sync IP>:8008. The backend rejects duplicate entries.
 */
export const entryApi = {
  async markEntry(
    eventId: string,
    guest: { qrValue: string } | { qrName: string },
  ): Promise<ApiMessage> {
    if ('qrName' in guest) return apiService.eventInTimeByQrName(guest.qrName, eventId);

    const found = await apiService.getEmployeeByBarcode(guest.qrValue);
    const g = Array.isArray(found) ? found[0] : null;
    if (!g) {
      return { value: false, message: (found as ApiMessage)?.message || 'Invalid QR. Visitor not found.' };
    }
    const result = await apiService.createAttendanceEntry(
      {
        EventLogId: g.eventLogId,
        QrName: g.qrName,
        QrId: g.qrId != null ? String(g.qrId) : null,
        EventId: eventId,
      },
      'IN',
    );
    const name = g.fullName || g.qrName || 'Visitor';
    return {
      value: result?.value !== false,
      message: result?.message || `${name} entry marked successfully.`,
    };
  },

  entries(): Promise<InOutEntry[]> {
    return apiService.getTodayEntries();
  },
};
