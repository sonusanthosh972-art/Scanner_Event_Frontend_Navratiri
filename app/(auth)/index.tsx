import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Animated,
  Easing,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import { Eye, EyeOff, User, Lock, Server } from 'lucide-react-native';
import { LIVE_URL, ServerMode, useLocalServerStore } from '@/store/localServerStore';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  //   const [username, setUsername] = useState('admin');
  // const [password, setPassword] = useState('admin');
  // const [password, setPassword] = useState('IACF@33');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const { mode, offlineIp, setMode, setOfflineIp } = useLocalServerStore();
  const [ipDraft, setIpDraft] = useState(offlineIp);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      rotateAnim.setValue(0);
      return;
    }

    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();

    return () => spin.stop();
  }, [loading]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    if (mode === 'offline') {
      if (!ipDraft.trim()) {
        Alert.alert('Error', 'Please enter the Offline Sync IP');
        return;
      }
      // Saved, and used everywhere: login, scans and entries all go to http://IP:8008
      setOfflineIp(ipDraft);
      setIpDraft(useLocalServerStore.getState().offlineIp);
    }

    setLoading(true);
    try {
      const user = await apiService.login(username, password);
      console.log("Logged in user:", user);
      if (user && user.appUserName) {
        setUser(user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'Invalid credentials');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loaderContainer}>
            <View style={styles.loaderWrapper}>
              <Animated.View
                style={[
                  styles.loaderRing,
                  { transform: [{ rotate: rotateInterpolate }] },
                ]}
              />
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.loaderIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* Top decorative area */}
        <View style={styles.topSection}>
          <View style={styles.decorativeCircle} />
          <View style={styles.decorativeCircle2} />
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>E-Pass Scanner</Text>
          <Text style={styles.appSubtitle}>E-Pass System</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.signInText}>Sign in to continue</Text>

          {/* Server */}
          <View style={styles.modeRow}>
            {([
              ['live', 'Live'],
              ['offline', 'Offline Sync'],
            ] as [ServerMode, string][]).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.modeOption, mode === value && styles.modeOptionActive]}
                onPress={() => setMode(value)}
                disabled={loading}
                activeOpacity={0.85}>
                <Text style={[styles.modeText, mode === value && styles.modeTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {mode === 'offline' ? (
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconContainer}>
                <Server size={18} color="#0042BF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Server IP, e.g. 192.168.0.50"
                placeholderTextColor="#999"
                value={ipDraft}
                onChangeText={setIpDraft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          ) : (
            <Text style={styles.modeHint}>{LIVE_URL}</Text>
          )}

          {/* Username Field */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <User size={18} color="#0042BF" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="default"
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <Lock size={18} color="#0042BF" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={18} color="#999" />
              ) : (
                <Eye size={18} color="#999" />
              )}
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}>
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },

  /* Top Section */
  topSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 66, 191, 0.06)',
  },
  decorativeCircle2: {
    position: 'absolute',
    top: 20,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 66, 191, 0.04)',
  },
  logo: {
    width: 280,
    height: 70,
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0042BF',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
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
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 4,
  },
  signInText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },

  /* Server mode */
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F4FA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeOption: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeOptionActive: {
    backgroundColor: '#0042BF',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0042BF',
  },
  modeTextActive: {
    color: '#fff',
  },
  modeHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
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
  eyeButton: {
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
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

  /* Loader */
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 10,
  },
  loaderWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(0, 66, 191, 0.15)',
    borderTopColor: '#0042BF',
  },
  loaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },

  /* Footer */
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 20,
    paddingBottom: 24,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    width: '88%',
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
});
