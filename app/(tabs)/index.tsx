import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { localApi } from '@/services/localApi';
import { LogOut, Check, X, ScanLine, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAMERA_SIZE = SCREEN_WIDTH - 48;

export default function ScanTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);

    const qrValue = data.trim();
    if (!qrValue) {
      setScanned(false);
      return;
    }

    setLoading(true);
    try {
      // Every entry goes through the laptop, which checks the QR and blocks duplicates across all phones
      const result = await localApi.markEntry(String(user?.eventId ?? ''), { qrValue }, 'scan');
      setAttendanceResult({ success: result.value === true, message: result.message });
      setShowDialog(true);
    } catch (error: any) {
      setAttendanceResult({ success: false, message: error.message });
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setAttendanceResult(null);
    setScanned(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          console.log('Logging out user');
          logout();
          router.replace('/(auth)' as any);
        },
      },
    ]);
  };

  // Camera permission handling
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" color="#0042BF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredMessage}>
          <Camera size={48} color="#0042BF" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SI E-Pass Scanner</Text>
          <Text style={styles.headerSubtitle}>E-Pass Scanner</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={22} color="#0042BF" />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Camera Preview */}
      <View style={styles.cameraWrapper}>
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          {/* Scan overlay */}
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
          </View>

          {/* Loading overlay */}
          {loading && (
            <View style={styles.cameraLoading}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.cameraLoadingText}>Processing...</Text>
            </View>
          )}
        </View>
      </View>

      {/* User Info */}
      {/* <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {user ? `Logged in as: ${user.appUserName}` : 'Not logged in'}
        </Text>
        <Text style={styles.instructionText}>
          Position QR code within the camera frame
        </Text>
      </View> */}

      {/* Footer */}
      <TouchableOpacity
        style={styles.footerContainer}
        onPress={() => Linking.openURL('https://scriptindia.in/')}
        activeOpacity={0.7}>
        <Text style={styles.footer}>Designed & Developed by</Text>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.footerIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Guest Details / Result Modal */}
      <Modal
        visible={showDialog}
        transparent
        animationType="fade"
        onRequestClose={closeDialog}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialog}>
            {loading && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0042BF" />
              </View>
            )}

            {attendanceResult && (
              <View style={styles.resultContainer}>
                <View
                  style={[
                    styles.resultIconCircle,
                    attendanceResult.success
                      ? styles.resultIconSuccess
                      : styles.resultIconError,
                  ]}>
                  {attendanceResult.success ? (
                    <Check size={36} color="#fff" strokeWidth={3} />
                  ) : (
                    <X size={36} color="#fff" strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.resultMessage}>{attendanceResult.message}</Text>
                <TouchableOpacity style={styles.button} onPress={closeDialog}>
                  <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
              </View>
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
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
    marginTop: 20,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#0042BF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

  /* Scan Action Toggle */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1E1E',
    marginRight: 12,
  },
  actionToggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionToggle: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0042BF',
    backgroundColor: '#fff',
  },
  actionToggleActive: {
    backgroundColor: '#0042BF',
  },
  actionToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0042BF',
  },
  actionToggleTextActive: {
    color: '#fff',
  },

  /* Camera */
  cameraWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cameraContainer: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: CAMERA_SIZE * 0.65,
    height: CAMERA_SIZE * 0.65,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  cameraLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraLoadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },

  /* Info */
  infoContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#1E1E1E',
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },

  /* Footer */
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    paddingBottom: 12,
  },
  footer: {
    fontSize: 19,
    color: '#666',
    fontWeight: '500',
  },
  footerIcon: {
    width: 72,
    height: 72,
  },

  /* Modal */
  button: {
    width: '80%',
    height: 40,
    backgroundColor: '#0042BF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E1E',
    marginBottom: 20,
    textAlign: 'center',
  },
  employeeDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
    marginRight: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#1E1E1E',
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  securityButton: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  inButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },
  cancelButtonText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 8,
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
  resultMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 20,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 10,
    borderRadius: 12,
  },
});
