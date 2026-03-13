import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Expo recommends checking both expoConfig and easConfig for EAS builds.
const PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  'ed1e64f3-437b-4909-b789-f85fdc03f788';

function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Initialize notification handler - call this once when app starts
 */
export function initializeNotifications(): void {
  if (Platform.OS === 'web') {
    return;
  }

  if (isExpoGo()) {
    console.warn('[Notifications] Running in Expo Go. Remote push notifications may not work reliably. Use an EAS build.');
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Register for push notifications and get the Expo push token
 * Returns the token string or null if registration fails
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Skip on web
  if (Platform.OS === 'web') {
    return null;
  }

  // Must be a physical device
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  try {
    if (!PROJECT_ID) {
      console.error('[Notifications] Missing EAS projectId; cannot request Expo push token');
      return null;
    }

    console.log('[Notifications] Using projectId:', PROJECT_ID);

    // Set up Android notification channel first
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('substitute-requests', {
        name: 'Substitute Requests',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E3A5F',
        sound: 'default',
      });
    }

    // Check and request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('[Notifications] Existing permission status:', existingStatus);

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Notifications] Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    // Get the Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    });

    console.log('[Notifications] Expo push token generated:', tokenResponse.data);

    return tokenResponse.data;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return null;
  }
}

/**
 * Add listener for notifications received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user taps on a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
