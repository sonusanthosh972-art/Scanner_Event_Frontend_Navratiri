import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, Check, X, User, CloudOff } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { isOfflineError } from '@/services/api';
import { entryApi } from '@/services/entryApi';
import { ApiMessage } from '@/lib/types';

/** Manual entry tab: type a QR name; the backend marks it for the logged-in user's event */
export default function ManualEntryTab() {
  const user = useAuthStore((state) => state.user);
  const [qrName, setQrName] = useState('');
  const [loading, setLoading] = useState(false);
  // offline = the backend could not be reached
  const [result, setResult] = useState<(ApiMessage & { offline?: boolean }) | null>(null);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!qrName.trim()) {
      Alert.alert('Error', 'Please enter QR name');
      return;
    }
    if (!user?.eventId) {
      Alert.alert('Error', 'No event ID found for this login');
      return;
    }

    const name = qrName.trim();
    const eventId = String(user.eventId);

    setLoading(true);
    try {
      // Sent straight to the selected backend (Live, or Offline Sync IP:8008)
      setResult(await entryApi.markEntry(eventId, { qrName: name }));
    } catch (error: any) {
      setResult({ value: false, offline: isOfflineError(error), message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const closeResult = () => {
    // Clear the QR name for the next entry
    if (result?.value) setQrName('');
    setResult(null);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SI E-Pass Scanner</Text>
          <Text style={styles.headerSubtitle}>Manual Entry</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={22} color="#0042BF" />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mark Entry</Text>

            <Text style={styles.label}>QR Name</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconContainer}>
                <User size={18} color="#0042BF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. UNR10R962"
                placeholderTextColor="#999"
                value={qrName}
                onChangeText={setQrName}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!result} transparent animationType="fade" onRequestClose={closeResult}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialog}>
            {result && (
              <>
                <View
                  style={[
                    styles.resultIconCircle,
                    result.offline
                      ? styles.resultIconOffline
                      : result.value
                        ? styles.resultIconSuccess
                        : styles.resultIconError,
                  ]}>
                  {result.offline ? (
                    <CloudOff size={32} color="#fff" strokeWidth={2.5} />
                  ) : result.value ? (
                    <Check size={36} color="#fff" strokeWidth={3} />
                  ) : (
                    <X size={36} color="#fff" strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeResult}>
                  <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0042BF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#1E1E1E',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#D9D9D9',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 32,
  },

  /* Card */
  card: {
    width: '88%',
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },

  /* Input */
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    height: 50,
  },
  inputIconContainer: {
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#1E1E1E',
  },

  /* Button */
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#0042BF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Result modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  resultIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIconSuccess: {
    backgroundColor: '#28a745',
  },
  resultIconError: {
    backgroundColor: '#dc3545',
  },
  resultIconOffline: {
    backgroundColor: '#C98A00',
  },
  resultMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    width: '80%',
    height: 44,
    backgroundColor: '#0042BF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});
