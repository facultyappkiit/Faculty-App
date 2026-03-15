import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { Platform } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import * as Linking from 'expo-linking';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  initializeNotifications,
} from "../services/notifications";

const RootLayout = () => {
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  // Handle deep links for auth callbacks
  const handleDeepLink = (url: string) => {
    console.log('Deep link received:', url);
    
    // Supabase sends tokens in hash fragment: #access_token=xxx&refresh_token=yyy&type=recovery
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let type: string | null = null;
    
    // Parse hash fragment (after #)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
      type = hashParams.get('type');
      console.log('Hash params - type:', type, 'access_token:', accessToken ? 'found' : 'none');
    }
    
    // Also check query params via Linking.parse
    const parsedUrl = Linking.parse(url);
    if (!accessToken && parsedUrl.queryParams?.access_token) {
      accessToken = parsedUrl.queryParams.access_token as string;
    }
    if (!refreshToken && parsedUrl.queryParams?.refresh_token) {
      refreshToken = parsedUrl.queryParams.refresh_token as string;
    }
    if (!type && parsedUrl.queryParams?.type) {
      type = parsedUrl.queryParams.type as string;
    }
    
    // Handle password reset redirect (type=recovery)
    if (type === 'recovery' || url.includes('reset-password') || parsedUrl.path === 'reset-password') {
      console.log('Navigating to reset-password with tokens');
      router.replace({
        pathname: '/reset-password' as any,
        params: { 
          access_token: accessToken || '',
          refresh_token: refreshToken || ''
        }
      });
    }
    // Handle email confirmation
    else if (url.includes('confirm') || parsedUrl.path === 'confirm') {
      router.replace('/login');
    }
    // Handle auth callback
    else if (url.includes('auth/callback') || parsedUrl.path === 'auth/callback') {
      router.replace('/login');
    }
  };

  useEffect(() => {
    // Handle initial deep link (app opened via deep link)
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };
    getInitialUrl();

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Skip notification setup on web
    if (Platform.OS === 'web') return;

    try {
      initializeNotifications();

      // Handle notification received while app is foregrounded
      notificationListener.current = addNotificationReceivedListener((notification: unknown) => {
        console.log('Notification received:', notification);
      });

      // Handle user tapping on a notification
      responseListener.current = addNotificationResponseListener((response: unknown) => {
        console.log('Notification tapped:', response);
        const data = (response as any)?.notification?.request?.content?.data;

        // Navigate based on notification type using Linking
        if (data?.type === 'new_request') {
          // Navigate directly using Expo Router to avoid deep-link issues in Expo Go
          router.push('/view-requests');
        } else if (data?.type === 'request_accepted' || data?.type === 'request_cancelled') {
          router.push('/my-requests');
        } else if (data?.type === 'request_updated') {
          router.push(data?.target === 'accepted' ? '/accepted-requests' : '/view-requests');
        }
      });
    } catch (error) {
      console.log('Notification setup error:', error);
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="index" />
        <Stack.Screen name="request-substitute" />
        <Stack.Screen name="view-requests" />
        <Stack.Screen name="my-requests" />
        <Stack.Screen name="account" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="accepted-requests" />
      </Stack>
    </AuthProvider>
  );
}

export default RootLayout;