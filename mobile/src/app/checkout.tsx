import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand } from '@/constants/brand';
import { apiRequest, type MobileAccount } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';

type PaymentStatusResponse = {
  orderNumber: string;
  paid: boolean;
  paymentStatus: string;
  status: string;
};

export default function CheckoutScreen() {
  const { session } = useAuth();
  const { clearCart, items } = useCart();
  const [account, setAccount] = useState<MobileAccount | null>(null);
  const [addressId, setAddressId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [completedOrder, setCompletedOrder] = useState('');

  useEffect(() => {
    if (!session) {
      router.replace('/account');
      return;
    }

    let active = true;

    apiRequest<MobileAccount>('/api/mobile/account', session)
      .then((result) => {
        if (active) {
          setAccount(result);
          setAddressId(
            result.addresses.find((address) => address.is_default)?.id ??
              result.addresses[0]?.id ??
              '',
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : 'Unable to load checkout.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session]);

  async function confirmPayment(orderNumber: string) {
    if (!session) {
      return false;
    }

    setVerifying(true);

    try {
      const status = await apiRequest<PaymentStatusResponse>(
        `/api/mobile/checkout/status?order=${encodeURIComponent(orderNumber)}`,
        session,
      );

      if (status.paid) {
        clearCart();
        setCompletedOrder(status.orderNumber);
        setMessage('');
        return true;
      }

      setMessage(
        `Payment for order ${status.orderNumber} is still ${status.paymentStatus}. You can check again without creating another order.`,
      );
      return false;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to confirm payment.');
      return false;
    } finally {
      setVerifying(false);
    }
  }

  async function beginCheckout() {
    if (!session || !addressId || items.length === 0) {
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const returnUrl = Linking.createURL('checkout-complete');
      const result = await apiRequest<{ checkoutUrl: string; orderNumber: string }>(
        '/api/mobile/checkout',
        session,
        {
          body: JSON.stringify({
            addressId,
            deliveryNotes,
            items,
            referralCode,
            returnUrl,
          }),
          method: 'POST',
        },
      );

      if (Platform.OS === 'web') {
        window.location.assign(result.checkoutUrl);
        return;
      }

      await WebBrowser.openAuthSessionAsync(result.checkoutUrl, returnUrl);
      await confirmPayment(result.orderNumber);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start checkout.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </View>
    );
  }

  if (completedOrder) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successCard}>
          <Text style={styles.eyebrow}>PAYMENT COMPLETE</Text>
          <Text style={styles.title}>Thank you for your order.</Text>
          <Text style={styles.subtitle}>Order {completedOrder} has been paid successfully.</Text>
          <Pressable onPress={() => router.replace('/products')} style={styles.button}>
            <Text style={styles.buttonText}>CONTINUE SHOPPING</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/account')} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>VIEW ORDERS</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>SECURE CHECKOUT</Text>
      <Text style={styles.title}>Delivery and payment</Text>
      <Text style={styles.subtitle}>
        Choose a saved address. Payment is verified before HarmonyLab clears your cart.
      </Text>

      {message ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Delivery address</Text>
      {account?.addresses.length ? (
        account.addresses.map((address) => (
          <Pressable
            key={address.id}
            onPress={() => setAddressId(address.id)}
            style={[styles.address, addressId === address.id && styles.addressSelected]}>
            <View style={[styles.radio, addressId === address.id && styles.radioSelected]} />
            <View style={styles.addressCopy}>
              <Text style={styles.addressTitle}>{address.label || 'Address'}</Text>
              <Text style={styles.addressText}>
                {[address.first_name, address.last_name].filter(Boolean).join(' ')}
                {'\n'}
                {address.address_line1}
                {address.address_line2 ? `, ${address.address_line2}` : ''}
                {'\n'}
                {[address.city, address.region].filter(Boolean).join(', ')}
              </Text>
            </View>
          </Pressable>
        ))
      ) : (
        <View style={styles.message}>
          <Text style={styles.messageText}>Add a saved address in Account before checkout.</Text>
          <Pressable onPress={() => router.push('/account')}>
            <Text style={styles.link}>OPEN ACCOUNT</Text>
          </Pressable>
        </View>
      )}

      <TextInput
        autoCapitalize="characters"
        onChangeText={setReferralCode}
        placeholder="Referral code (optional)"
        placeholderTextColor="#929a94"
        style={styles.input}
        value={referralCode}
      />
      <TextInput
        multiline
        onChangeText={setDeliveryNotes}
        placeholder="Delivery notes (optional)"
        placeholderTextColor="#929a94"
        style={[styles.input, styles.notes]}
        value={deliveryNotes}
      />

      <Pressable
        disabled={submitting || verifying || !addressId || items.length === 0}
        onPress={() => void beginCheckout()}
        style={[
          styles.button,
          (!addressId || items.length === 0 || submitting || verifying) && styles.buttonDisabled,
        ]}>
        {submitting || verifying ? (
          <ActivityIndicator color={Brand.white} />
        ) : (
          <Text style={styles.buttonText}>CONTINUE TO SECURE PAYMENT</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  address: {
    backgroundColor: Brand.white,
    borderColor: '#e5dbcc',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  addressCopy: { flex: 1, gap: 5 },
  addressSelected: { borderColor: Brand.orange, borderWidth: 2 },
  addressText: { color: Brand.muted, fontSize: 13, lineHeight: 19 },
  addressTitle: { color: Brand.darkGreen, fontSize: 16, fontWeight: '800' },
  button: {
    alignItems: 'center',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    minHeight: 52,
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 18,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Brand.white, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  center: { alignItems: 'center', backgroundColor: Brand.cream, flex: 1, justifyContent: 'center' },
  content: { gap: 14, padding: 20, paddingBottom: 42 },
  eyebrow: { color: Brand.orange, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  input: {
    backgroundColor: Brand.white,
    borderColor: '#e5dbcc',
    borderRadius: 14,
    borderWidth: 1,
    color: Brand.darkGreen,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 15,
  },
  link: { color: Brand.orange, fontSize: 12, fontWeight: '800', marginTop: 8 },
  message: { backgroundColor: Brand.lightGreen, borderRadius: 16, padding: 16 },
  messageText: { color: Brand.darkGreen, fontSize: 13, lineHeight: 20 },
  notes: { minHeight: 90, paddingTop: 14, textAlignVertical: 'top' },
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
  radio: {
    borderColor: Brand.muted,
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    marginTop: 2,
    width: 18,
  },
  radioSelected: { backgroundColor: Brand.orange, borderColor: Brand.orange },
  screen: { backgroundColor: Brand.cream },
  sectionTitle: { color: Brand.darkGreen, fontSize: 19, fontWeight: '800', marginTop: 6 },
  subtitle: { color: Brand.muted, fontSize: 14, lineHeight: 21 },
  successCard: {
    backgroundColor: Brand.white,
    borderRadius: 24,
    gap: 16,
    padding: 24,
    width: '100%',
  },
  successScreen: {
    alignItems: 'center',
    backgroundColor: Brand.cream,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: { color: Brand.darkGreen, fontSize: 30, fontWeight: '800', lineHeight: 36 },
});

