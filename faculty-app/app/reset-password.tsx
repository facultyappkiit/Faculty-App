import { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';

const ResetPasswordScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    // Get the access token from the URL params
    const getTokenFromUrl = async () => {
      try {
        const url = await Linking.getInitialURL();
        console.log('Reset password - Initial URL:', url);
        
        if (url) {
          // Supabase sends tokens in hash fragment: #access_token=xxx&refresh_token=yyy&type=recovery
          // We need to parse both query params and hash fragments
          
          // First try to get from hash fragment (after #)
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
            const access = hashParams.get('access_token');
            const refresh = hashParams.get('refresh_token');
            const type = hashParams.get('type');
            
            console.log('Hash params - access_token:', access ? 'found' : 'not found');
            console.log('Hash params - refresh_token:', refresh ? 'found' : 'not found');
            console.log('Hash params - type:', type);
            
            if (access) setAccessToken(access);
            if (refresh) setRefreshToken(refresh);
          }
          
          // Also try standard URL parsing
          const parsedUrl = Linking.parse(url);
          console.log('Parsed URL:', parsedUrl);
          
          if (parsedUrl.queryParams?.access_token) {
            setAccessToken(parsedUrl.queryParams.access_token as string);
          }
          if (parsedUrl.queryParams?.refresh_token) {
            setRefreshToken(parsedUrl.queryParams.refresh_token as string);
          }
        }
        
        // Also check params directly from expo-router
        if (params.access_token) {
          console.log('Got access_token from router params');
          setAccessToken(params.access_token as string);
        }
        if (params.refresh_token) {
          console.log('Got refresh_token from router params');
          setRefreshToken(params.refresh_token as string);
        }
      } catch (error) {
        console.error('Error parsing reset URL:', error);
        setTokenError('Failed to parse reset link');
      }
    };
    getTokenFromUrl();
  }, [params]);

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!accessToken) {
      Alert.alert('Error', 'Invalid reset link. Please request a new password reset.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Resetting password with access_token:', accessToken ? 'present' : 'missing');
      console.log('Refresh token:', refreshToken ? 'present' : 'missing');
      
      // Call your backend to update password with the tokens
      const queryParams = new URLSearchParams({
        new_password: newPassword,
        access_token: accessToken
      });
      
      if (refreshToken) {
        queryParams.append('refresh_token', refreshToken);
      }
      
      const response = await fetch(`https://faculty-app-j8ct.onrender.com/api/auth/update-password?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reset password');
      }

      Alert.alert(
        'Success',
        'Your password has been reset successfully!',
        [{ text: 'Login', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/login')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.divider} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.lockIcon}>
              <Ionicons name="key" size={40} color="#10B981" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previously used passwords.
          </Text>

          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={newPassword.length >= 6 ? '#10B981' : '#9CA3AF'} 
              />
              <Text style={[styles.requirementText, newPassword.length >= 6 && styles.requirementMet]}>
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword === confirmPassword && newPassword.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={newPassword === confirmPassword && newPassword.length > 0 ? '#10B981' : '#9CA3AF'} 
              />
              <Text style={[styles.requirementText, newPassword === confirmPassword && newPassword.length > 0 && styles.requirementMet]}>
                Passwords match
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 4,
  },
  requirements: {
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#6B7280',
  },
  requirementMet: {
    color: '#10B981',
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default ResetPasswordScreen;
