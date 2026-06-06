import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';

WebBrowser.maybeCompleteAuthSession();

type PaymentStatusResponse = {
  orderNumber: string;
  paid: boolean;
  paymentStatus: string;
  status: string;
};

function getParameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CheckoutCompleteScreen() {
  const params = useLocalSearchParams<{ order?: string | string[]; outcome?: string | string[] }>();
  const { loading: authLoading, session } = useAuth();
  const { clearCart } = useCart();
  const [state, setState] = useState<'cancelled' | 'checking' | 'error' | 'paid' | 'pending'>(
    'checking',
  );
  const [message, setMessage] = useState('');
  const orderNumber = getParameter(params.order) ?? '';
  const outcome = getParameter(params.outcome);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      if (outcome === 'cancelled') {
        setState('cancelled');
        setMessage('Payment was cancelled. Your cart has not been changed.');
        return;
      }

      if (!session || !orderNumber) {
        setState('error');
        setMessage('Sign in again to confirm this payment.');
        return;
      }

      apiRequest<PaymentStatusResponse>(
        `/api/mobile/checkout/status?order=${encodeURIComponent(orderNumber)}`,
        session,
      )
        .then((status) => {
          if (!active) {
            return;
          }

          if (status.paid) {
            clearCart();
            setState('paid');
            setMessage(`Order ${status.orderNumber} has been paid successfully.`);
          } else {
            setState('pending');
            setMessage(
              `Order ${status.orderNumber} is currently ${status.paymentStatus}. Your cart has not been cleared.`,
            );
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState('error');
            setMessage(error instanceof Error ? error.message : 'Unable to confirm payment.');
          }
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [authLoading, clearCart, orderNumber, outcome, session]);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        {state === 'checking' ? (
          <>
            <ActivityIndicator color={Brand.orange} size="large" />
            <Text style={styles.title}>Confirming payment…</Text>
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>
              {state === 'paid' ? 'PAYMENT COMPLETE' : 'PAYMENT STATUS'}
            </Text>
            <Text style={styles.title}>
              {state === 'paid' ? 'Thank you for your order.' : 'Your cart is unchanged.'}
            </Text>
            <Text style={styles.message}>{message}</Text>
            {state === 'paid' ? (
              <>
                <Pressable onPress={() => router.replace('/products')} style={styles.button}>
                  <Text style={styles.buttonText}>CONTINUE SHOPPING</Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/account')} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>VIEW ORDERS</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => router.replace('/checkout')} style={styles.button}>
                <Text style={styles.buttonText}>RETURN TO CHECKOUT</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { color: Brand.white, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 24,
    gap: 16,
    padding: 24,
    width: '100%',
  },
  eyebrow: { color: Brand.orange, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  message: { color: Brand.muted, fontSize: 15, lineHeight: 23 },
  outlineButton: {
    alignItems: 'center',
    borderColor: Brand.darkGreen,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: Brand.darkGreen,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screen: {
    alignItems: 'center',
    backgroundColor: Brand.cream,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: { color: Brand.darkGreen, fontSize: 29, fontWeight: '800', lineHeight: 36 },
});

