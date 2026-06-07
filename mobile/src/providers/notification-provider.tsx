import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import { apiRequest, type MobileNotification } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

type NotificationContextValue = {
  notifications: MobileNotification[];
  refreshNotifications: () => Promise<void>;
  markOrderRead: (orderId: string) => Promise<void>;
  unreadCount: number;
  unregisterDevice: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue>({
  markOrderRead: async () => undefined,
  notifications: [],
  refreshNotifications: async () => undefined,
  unreadCount: 0,
  unregisterDevice: async () => undefined,
});

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function getNotificationUrl(notification: Notifications.Notification) {
  const url = notification.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/order/') ? url : null;
}

async function getExpoPushToken() {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      importance: Notifications.AndroidImportance.HIGH,
      name: 'Order updates',
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  const finalPermissions =
    existingPermissions.status === 'granted'
      ? existingPermissions
      : await Notifications.requestPermissionsAsync();

  if (finalPermissions.status !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error('Expo project ID is missing.');
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const handledInitialNotification = useRef(false);

  const applyUnreadCount = useCallback(async (count: number) => {
    setUnreadCount(count);

    if (Platform.OS !== 'web') {
      await Notifications.setBadgeCountAsync(count).catch(() => false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      await applyUnreadCount(0);
      return;
    }

    const result = await apiRequest<{
      notifications: MobileNotification[];
      unreadCount: number;
    }>('/api/mobile/notifications', session);
    setNotifications(result.notifications);
    await applyUnreadCount(result.unreadCount);
  }, [applyUnreadCount, session]);

  const markOrderRead = useCallback(
    async (orderId: string) => {
      if (!session) {
        return;
      }

      const result = await apiRequest<{ unreadCount: number }>(
        '/api/mobile/notifications',
        session,
        {
          body: JSON.stringify({ orderId }),
          method: 'PATCH',
        },
      );
      setNotifications((current) =>
        current.map((notification) =>
          notification.order_id === orderId
            ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
            : notification,
        ),
      );
      await applyUnreadCount(result.unreadCount);
    },
    [applyUnreadCount, session],
  );

  const unregisterDevice = useCallback(async () => {
    if (!session || !expoPushToken) {
      return;
    }

    await apiRequest('/api/mobile/push-token', session, {
      body: JSON.stringify({ expoPushToken }),
      method: 'DELETE',
    }).catch(() => undefined);
    setExpoPushToken(null);
    await applyUnreadCount(0);
  }, [applyUnreadCount, expoPushToken, session]);

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      void applyUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function initializeNotifications() {
      try {
        await refreshNotifications();
        const token = await getExpoPushToken();

        if (!token || cancelled) {
          return;
        }

        await apiRequest('/api/mobile/push-token', session!, {
          body: JSON.stringify({
            deviceName: Device.deviceName ?? Device.modelName ?? '',
            expoPushToken: token,
            platform: Platform.OS,
          }),
          method: 'POST',
        });

        if (!cancelled) {
          setExpoPushToken(token);
        }
      } catch (error) {
        console.warn(
          error instanceof Error ? error.message : 'Unable to initialize push notifications.',
        );
      }
    }

    void initializeNotifications();

    return () => {
      cancelled = true;
    };
  }, [applyUnreadCount, refreshNotifications, session]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    function openNotification(notification: Notifications.Notification) {
      const url = getNotificationUrl(notification);

      if (url) {
        router.push(url as Href);
      }
    }

    if (!handledInitialNotification.current) {
      handledInitialNotification.current = true;
      const initialResponse = Notifications.getLastNotificationResponse();

      if (initialResponse?.notification) {
        openNotification(initialResponse.notification);
      }
    }

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void refreshNotifications();
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        openNotification(response.notification);
        void refreshNotifications();
      },
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [refreshNotifications]);

  const value = useMemo(
    () => ({
      markOrderRead,
      notifications,
      refreshNotifications,
      unreadCount,
      unregisterDevice,
    }),
    [markOrderRead, notifications, refreshNotifications, unreadCount, unregisterDevice],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
