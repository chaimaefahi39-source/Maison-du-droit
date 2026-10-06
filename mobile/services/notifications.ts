import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detect whether app is running inside Expo Go
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

let Notifications: typeof import('expo-notifications') | null = null;

// Only load native expo-notifications module when NOT in Expo Go to prevent Android SQLite crashes
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Could not load native notifications module:', e);
  }
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo || Platform.OS === 'web' || !Notifications) {
    return true;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Send an immediate local notification using expo-notifications (with Expo Go / Web fallback)
 */
export async function sendLocalNotification(title: string, body: string) {
  try {
    if (isExpoGo || !Notifications) {
      Alert.alert(title, body);
      return;
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(title, { body });
      } else {
        Alert.alert(title, body);
      }
      return;
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(title, body);
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to send notification via expo-notifications, falling back to Alert:', error);
    Alert.alert(title, body);
  }
}

/**
 * Send notification for legal request updates
 */
export async function notifyRequestStatus(requestTitle: string, status: string) {
  const statusLabels: Record<string, string> = {
    pending: 'est en cours d\'enregistrement.',
    processing: 'est en cours d\'analyse par l\'IA.',
    resolved: 'a été traitée. Votre analyse juridique est disponible !',
    closed: 'a été clôturée.',
  };

  const message = statusLabels[status] || `a un nouveau statut : ${status}`;
  await sendLocalNotification(
    'Maison du Droit ⚖️',
    `Votre demande "${requestTitle}" ${message}`
  );
}
