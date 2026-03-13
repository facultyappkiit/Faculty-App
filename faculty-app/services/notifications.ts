import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Expo recommends checking both expoConfig and easConfig for EAS builds.
const PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  'ed1e64f3-437b-4909-b789-f85fdc03f788';

let lastPushDebugState = 'not_started';
let lastPermissionStatus = 'unknown';
let lastPushError = '';

export function getLastPushDebugState(): string {
  return lastPushDebugState;
}

export function getPushDebugDetails() {
  return {
    state: lastPushDebugState,
    permission: lastPermissionStatus,
    lastError: lastPushError,
    projectId: PROJECT_ID,
    executionEnvironment: Constants.executionEnvironment,
    isDevice: Device.isDevice,
    platform: Platform.OS,
  };
}

function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    lastPushDebugState = 'web_platform';
    lastPermissionStatus = 'web';
    return null;
  }

  // Must be a physical device
  if (!Device.isDevice) {
    lastPushDebugState = 'not_physical_device';
    lastPermissionStatus = 'not_applicable';
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  try {
    if (!PROJECT_ID) {
      lastPushDebugState = 'missing_project_id';
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
    lastPermissionStatus = existingStatus;
    console.log('[Notifications] Existing permission status:', existingStatus);

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      lastPermissionStatus = status;
      console.log('[Notifications] Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
      lastPushDebugState = `permission_${finalStatus}`;
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    // Token generation can intermittently fail on Android devices; retry a few times.
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        console.log(`[Notifications] Requesting Expo push token (attempt ${attempt}/3)`);
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: PROJECT_ID,
        });

        console.log('[Notifications] Expo push token generated:', tokenResponse.data);
        lastPushDebugState = 'token_generated';
        return tokenResponse.data;
      } catch (error) {
        lastError = error;
        lastPushError = String(error);
        console.warn(`[Notifications] Token request attempt ${attempt} failed:`, error);
        lastPushDebugState = `token_attempt_${attempt}_failed`;
        if (attempt < 3) {
          await sleep(1200 * attempt);
        }
      }
    }

    console.error('[Notifications] Failed to get Expo push token after 3 attempts:', lastError);
    lastPushError = String(lastError);
    lastPushDebugState = `token_generation_failed:${String(lastError)}`;
    return null;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    console.error('[Notifications] Common causes: denied notification permission, missing Android FCM credentials, or wrong EAS projectId');
    lastPushError = String(error);
    lastPushDebugState = `unexpected_error:${String(error)}`;
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
