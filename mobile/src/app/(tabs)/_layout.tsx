import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useCart } from '@/providers/cart-provider';
import { useNotifications } from '@/providers/notification-provider';

export default function TabLayout() {
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.orange,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: Brand.muted,
        tabBarItemStyle: {
          height: 50,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: Brand.white,
          borderTopColor: '#e8dfd1',
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'home' : 'home-outline'} size={17} />
          ),
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          tabBarAccessibilityLabel: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'storefront' : 'storefront-outline'} size={17} />
          ),
          title: 'Shop',
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Brand.orange,
            color: Brand.white,
            fontSize: 10,
          },
          tabBarAccessibilityLabel: `Cart${itemCount > 0 ? `, ${itemCount} items` : ''}`,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'cart' : 'cart-outline'} size={18} />
          ),
          title: 'Cart',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarAccessibilityLabel: `Account${unreadCount > 0 ? `, ${unreadCount} unread notifications` : ''}`,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Brand.orange,
            color: Brand.white,
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'person' : 'person-outline'} size={17} />
          ),
          title: 'Account',
        }}
      />
    </Tabs>
  );
}
