import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LogOut, CloudDownload, CloudUpload, Laptop, RefreshCw } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useLocalServerStore } from '@/store/localServerStore';
import { localApi, LocalStatus } from '@/services/localApi';

type Busy = null | 'status' | 'download' | 'upload';

/**
 * All phones on the event WiFi send entries to the laptop server, which blocks duplicates even without
 * internet. "Sync from Live" loads the guest list onto the laptop, "Sync to Live" uploads the laptop's
 * entries to the live server.
 */
export default function SyncTab() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { address, setAddress } = useLocalServerStore();
  const [draft, setDraft] = useState(address);
  const [status, setStatus] = useState<LocalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const eventId = String(user?.eventId ?? '');

  const refreshStatus = async (addr = address) => {
    if (!addr) return;
    setBusy('status');
    try {
      setStatus(await localApi.status(addr, eventId));
      setError(null);
    } catch (e: any) {
      setStatus(null);
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshStatus();
    }, [address, eventId]),
  );

  const saveAddress = () => {
    const addr = draft.trim();
    setAddress(addr);
    refreshStatus(addr);
  };

  const run = async (kind: 'download' | 'upload') => {
    setBusy(kind);
    try {
      const res = await localApi[kind](address, eventId);
      setStatus(res);
      setError(null);
      Alert.alert(res.value ? 'Done' : 'Not completed', res.message);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmUpload = () => {
    if (!status?.pending) {
      Alert.alert('Nothing to upload', 'All entries are already on the live server.');
      return;
    }
    Alert.alert(
      'Sync to Live',
      `Upload ${status.pending} entries to the live server? The laptop must have internet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload', onPress: () => run('upload') },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)' as any);
        },
      },
    ]);
  };

  const connected = !!status && !error;
  const disabled = !connected || busy !== null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SI E-Pass Scanner</Text>
          <Text style={styles.headerSubtitle}>Offline Sync</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={22} color="#0042BF" />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Laptop connection */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Laptop size={20} color="#0042BF" />
              <Text style={styles.cardTitle}>Laptop Server</Text>
            </View>

            <Text style={styles.label}>Laptop address</Text>
            <View style={styles.addressRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 192.168.1.10:4000"
                placeholderTextColor="#999"
                value={draft}
                onChangeText={setDraft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.smallButton, busy && styles.buttonDisabled]}
                onPress={saveAddress}
                disabled={busy !== null}>
                <Text style={styles.smallButtonText}>Connect</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: connected ? '#28a745' : '#dc3545' }]} />
              <Text style={styles.statusText} numberOfLines={3}>
                {busy === 'status'
                  ? 'Checking…'
                  : connected
                    ? 'Connected'
                    : error ?? 'Not connected'}
              </Text>
              <TouchableOpacity onPress={() => refreshStatus()} disabled={busy !== null}>
                <RefreshCw size={18} color="#0042BF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.connectHint}>
              Scan, Manual Entry and Entries always go through this laptop.
            </Text>
          </View>

          {/* Counts */}
          {connected && status && (
            <View style={styles.statsRow}>
              <Stat label="Passes" value={status.guests} />
              <Stat label="Entries" value={status.entries} />
              <Stat label="Not uploaded" value={status.pending} highlight={status.pending > 0} />
            </View>
          )}
          {connected && (
            <Text style={styles.lastDownload}>
              {status?.lastDownload
                ? `Guest list downloaded: ${status.lastDownload}`
                : 'Guest list not downloaded yet'}
            </Text>
          )}

          {/* Sync buttons */}
          <TouchableOpacity
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={() => run('download')}
            disabled={disabled}
            activeOpacity={0.85}>
            {busy === 'download' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <CloudDownload size={20} color="#fff" />
                <Text style={styles.buttonText}>Sync from Live</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>
            Downloads all passes for this event onto the laptop. Do this before the event while the
            laptop has internet.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.uploadButton, disabled && styles.buttonDisabled]}
            onPress={confirmUpload}
            disabled={disabled}
            activeOpacity={0.85}>
            {busy === 'upload' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <CloudUpload size={20} color="#fff" />
                <Text style={styles.buttonText}>Sync to Live</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>
            Uploads entries from the laptop to the live server. Safe to tap again: entries already
            uploaded are skipped.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, highlight && { color: '#C98A00' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0042BF' },
  headerSubtitle: { fontSize: 14, color: '#1E1E1E', marginTop: 2 },
  logoutButton: { padding: 8 },
  divider: { height: 1, backgroundColor: '#D9D9D9' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 16,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E1E1E' },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  addressRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1E1E1E',
  },
  smallButton: {
    height: 46,
    paddingHorizontal: 16,
    backgroundColor: '#0042BF',
    borderRadius: 12,
    justifyContent: 'center',
  },
  smallButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { flex: 1, fontSize: 13, color: '#444' },
  connectHint: { fontSize: 12, color: '#6B7280', marginTop: 12 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F6F8FC',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0042BF' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  lastDownload: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 16 },

  button: {
    flexDirection: 'row',
    gap: 8,
    height: 50,
    backgroundColor: '#0042BF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 8,
  },
  uploadButton: { backgroundColor: '#28a745', marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 6, paddingHorizontal: 4 },
});
