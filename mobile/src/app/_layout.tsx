import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Brand } from '@/constants/brand';
import { AuthProvider } from '@/providers/auth-provider';
import { CartProvider } from '@/providers/cart-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { ReferralProvider } from '@/providers/referral-provider';
import '@/global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ReferralProvider>
        <NotificationProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: Brand.cream },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: Brand.cream },
                headerTintColor: Brand.darkGreen,
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
              <Stack.Screen name="checkout-complete" options={{ title: 'Order confirmation' }} />
              <Stack.Screen name="admin-orders" options={{ title: 'Admin orders' }} />
              <Stack.Screen name="admin-order/[id]" options={{ title: 'Manage order' }} />
              <Stack.Screen name="order/[id]" options={{ title: 'Order details' }} />
              <Stack.Screen name="product/[slug]" options={{ title: 'Product' }} />
            </Stack>
          </CartProvider>
        </NotificationProvider>
      </ReferralProvider>
    </AuthProvider>
  );
}
