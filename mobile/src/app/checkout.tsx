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
import { apiRequest, publicApiRequest, type MobileAccount } from '@/lib/api';
import {
  emptyGuestCheckoutDetails,
  loadGuestCheckoutDetails,
  normalizeLocalPhone,
  saveGuestCheckoutDetails,
  type GuestCheckoutDetails,
} from '@/lib/guest-checkout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { useReferral } from '@/providers/referral-provider';

type PaymentStatusResponse = {
  orderNumber: string;
  paid: boolean;
  paymentStatus: string;
  status: string;
};

type CheckoutQuote = {
  currency: string;
  discountCents: number;
  discountDetails: {
    amount_cents: number;
    name: string;
    type: 'minimum_order' | 'referral' | 'shipping';
  }[];
  shippingCents: number;
  subtotalCents: number;
  totalCents: number;
};

type PaymentMethod = 'alipay_hk' | 'credit_card' | 'fps';

const paymentMethods: {
  detail: string;
  id: PaymentMethod;
  label: string;
}[] = [
  {
    id: 'credit_card',
    label: 'Credit Card',
    detail: 'Visa, Mastercard, and supported card networks.',
  },
  {
    id: 'alipay_hk',
    label: 'AlipayHK',
    detail: 'Continue to Wonder and pay from the AlipayHK app.',
  },
  {
    id: 'fps',
    label: 'FPS',
    detail: 'Continue to Wonder and pay with Hong Kong FPS.',
  },
];

function formatMoney(cents: number, currency = 'HKD') {
  return new Intl.NumberFormat('en-HK', {
    currency,
    style: 'currency',
  }).format(cents / 100);
}

export default function CheckoutScreen() {
  const { loading: authLoading, session } = useAuth();
  const { clearCart, items } = useCart();
  const { referralCode: savedReferralCode } = useReferral();
  const [account, setAccount] = useState<MobileAccount | null>(null);
  const [addressId, setAddressId] = useState('');
  const [referralCode, setReferralCode] = useState(savedReferralCode);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [completedOrder, setCompletedOrder] = useState('');
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [guestDetails, setGuestDetails] = useState<GuestCheckoutDetails>(
    emptyGuestCheckoutDetails,
  );
  const isGuest = !session || session.user.is_anonymous === true;

  useEffect(() => {
    let active = true;

    loadGuestCheckoutDetails()
      .then((details) => {
        if (active) {
          setGuestDetails(details);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (savedReferralCode && !referralCode) {
      setReferralCode(savedReferralCode);
    }
  }, [referralCode, savedReferralCode]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!session) {
      setLoading(false);
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
          const defaultAddress =
            result.addresses.find((address) => address.is_default) ?? result.addresses[0];

          if (session.user.is_anonymous && defaultAddress) {
            setGuestDetails((current) => ({
              ...current,
              addressLine1: defaultAddress.address_line1,
              addressLine2: defaultAddress.address_line2 ?? '',
              city: defaultAddress.city,
              email: result.profile.email ?? current.email,
              firstName: defaultAddress.first_name ?? result.profile.firstName ?? '',
              lastName: defaultAddress.last_name ?? result.profile.lastName ?? '',
              phone: normalizeLocalPhone(defaultAddress.phone ?? result.profile.phone ?? ''),
              postalCode: defaultAddress.postal_code ?? '',
              region: defaultAddress.region ?? 'Hong Kong',
            }));
          }
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
  }, [authLoading, session]);

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setQuoteLoading(true);
      publicApiRequest<CheckoutQuote>('/api/mobile/checkout/quote', {
        body: JSON.stringify({ items, referralCode }),
        method: 'POST',
      })
        .then((result) => {
          if (active) {
            setQuote(result);
          }
        })
        .catch(() => {
          if (active) {
            setQuote(null);
          }
        })
        .finally(() => {
          if (active) {
            setQuoteLoading(false);
          }
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [items, referralCode]);

  async function confirmPayment(orderNumber: string, checkoutSession = session) {
    if (!checkoutSession) return false;
    setVerifying(true);

    try {
      const status = await apiRequest<PaymentStatusResponse>(
        `/api/mobile/checkout/status?order=${encodeURIComponent(orderNumber)}`,
        checkoutSession,
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
    if (items.length === 0 || (!isGuest && !addressId)) {
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      let checkoutSession = session;

      if (isGuest) {
        await saveGuestCheckoutDetails(guestDetails);
      }

      if (!checkoutSession) {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              checkout_type: 'guest',
              first_name: guestDetails.firstName.trim(),
              full_name: [guestDetails.firstName.trim(), guestDetails.lastName.trim()]
                .filter(Boolean)
                .join(' '),
              last_name: guestDetails.lastName.trim(),
              phone: guestDetails.phone ? `+852${guestDetails.phone}` : '',
            },
          },
        });

        if (error || !data.session) {
          throw new Error(
            error?.code === 'anonymous_provider_disabled'
              ? 'Guest checkout is not enabled yet. Please create an account or sign in.'
              : error?.message || 'Unable to start a guest session.',
          );
        }

        checkoutSession = data.session;
      }

      const returnUrl = Linking.createURL('checkout-complete');
      const result = await apiRequest<{ checkoutUrl: string; orderNumber: string }>(
        '/api/mobile/checkout',
        checkoutSession,
        {
          body: JSON.stringify({
            addressId: isGuest ? '' : addressId,
            deliveryNotes,
            ...(isGuest ? guestDetails : {}),
            items,
            paymentMethod,
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
      await confirmPayment(result.orderNumber, checkoutSession);
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

  const guestDetailsComplete =
    guestDetails.firstName.trim() &&
    guestDetails.lastName.trim() &&
    guestDetails.email.trim() &&
    guestDetails.phone.length === 8 &&
    guestDetails.addressLine1.trim() &&
    guestDetails.city.trim();
  const checkoutDisabled =
    submitting ||
    verifying ||
    items.length === 0 ||
    (isGuest ? !guestDetailsComplete : !addressId);

  function updateGuestDetail(key: keyof GuestCheckoutDetails, value: string) {
    setGuestDetails((current) => ({ ...current, [key]: value }));
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>SECURE CHECKOUT</Text>
      <Text style={styles.title}>Delivery and payment</Text>
      <Text style={styles.subtitle}>
        {isGuest
          ? 'Continue as a guest. Your details will be remembered securely on this device.'
          : 'Choose a saved address. Payment is verified before HarmonyLab clears your cart.'}
      </Text>

      {message ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Delivery address</Text>
      {isGuest ? (
        <View style={styles.guestForm}>
          <View style={styles.inputRow}>
            <TextInput
              autoCapitalize="words"
              onChangeText={(value) => updateGuestDetail('firstName', value)}
              placeholder="First name"
              placeholderTextColor="#929a94"
              style={[styles.input, styles.rowInput]}
              value={guestDetails.firstName}
            />
            <TextInput
              autoCapitalize="words"
              onChangeText={(value) => updateGuestDetail('lastName', value)}
              placeholder="Last name"
              placeholderTextColor="#929a94"
              style={[styles.input, styles.rowInput]}
              value={guestDetails.lastName}
            />
          </View>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(value) => updateGuestDetail('email', value)}
            placeholder="Email address"
            placeholderTextColor="#929a94"
            style={styles.input}
            value={guestDetails.email}
          />
          <View style={styles.phoneField}>
            <Text style={styles.phonePrefix}>+852</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={8}
              onChangeText={(value) => updateGuestDetail('phone', normalizeLocalPhone(value))}
              placeholder="Phone number"
              placeholderTextColor="#929a94"
              style={[styles.input, styles.phoneInput]}
              value={guestDetails.phone}
            />
          </View>
          <TextInput
            onChangeText={(value) => updateGuestDetail('addressLine1', value)}
            placeholder="Shipping address"
            placeholderTextColor="#929a94"
            style={styles.input}
            value={guestDetails.addressLine1}
          />
          <TextInput
            onChangeText={(value) => updateGuestDetail('addressLine2', value)}
            placeholder="Address line 2 (optional)"
            placeholderTextColor="#929a94"
            style={styles.input}
            value={guestDetails.addressLine2}
          />
          <View style={styles.inputRow}>
            <TextInput
              onChangeText={(value) => updateGuestDetail('city', value)}
              placeholder="District / city"
              placeholderTextColor="#929a94"
              style={[styles.input, styles.rowInput]}
              value={guestDetails.city}
            />
            <TextInput
              onChangeText={(value) => updateGuestDetail('region', value)}
              placeholder="Region"
              placeholderTextColor="#929a94"
              style={[styles.input, styles.rowInput]}
              value={guestDetails.region}
            />
          </View>
          <TextInput
            onChangeText={(value) => updateGuestDetail('postalCode', value)}
            placeholder="Postal code (optional)"
            placeholderTextColor="#929a94"
            style={styles.input}
            value={guestDetails.postalCode}
          />
        </View>
      ) : account?.addresses.length ? (
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
        onChangeText={(value) =>
          setReferralCode(
            value
              .replace(/[^\w-]/g, '')
              .toUpperCase()
              .slice(0, 40),
          )
        }
        placeholder="Referral code (optional)"
        placeholderTextColor="#929a94"
        style={styles.input}
        value={referralCode}
      />
      <Text style={styles.helperText}>
        Enter a valid code to receive any referral benefit available for this purchase.
      </Text>
      <TextInput
        multiline
        onChangeText={setDeliveryNotes}
        placeholder="Delivery notes (optional)"
        placeholderTextColor="#929a94"
        style={[styles.input, styles.notes]}
        value={deliveryNotes}
      />

      <Text style={styles.sectionTitle}>Payment method</Text>
      <View style={styles.paymentOptions}>
        {paymentMethods.map((method) => {
          const selected = paymentMethod === method.id;

          return (
            <Pressable
              key={method.id}
              onPress={() => setPaymentMethod(method.id)}
              style={[styles.paymentOption, selected && styles.paymentOptionSelected]}>
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <View style={styles.paymentCopy}>
                <Text style={styles.paymentTitle}>{method.label}</Text>
                <Text style={styles.paymentDetail}>{method.detail}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summary}>
        <Text style={styles.sectionTitle}>Order summary</Text>
        {quoteLoading && !quote ? (
          <ActivityIndicator color={Brand.orange} />
        ) : quote ? (
          <>
            <SummaryRow
              label="Subtotal"
              value={formatMoney(quote.subtotalCents, quote.currency)}
            />
            <SummaryRow
              label="Shipping"
              value={
                quote.shippingCents === 0
                  ? 'FREE'
                  : formatMoney(quote.shippingCents, quote.currency)
              }
            />
            {quote.discountDetails
              .filter((discount) => discount.type !== 'shipping')
              .map((discount, index) => (
              <SummaryRow
                key={`${discount.type}-${discount.name}-${index}`}
                label={discount.name}
                value={`-${formatMoney(discount.amount_cents, quote.currency)}`}
              />
              ))}
            <SummaryRow
              emphasized
              label="Total"
              value={formatMoney(quote.totalCents, quote.currency)}
            />
          </>
        ) : (
          <Text style={styles.helperText}>The final total will be confirmed securely.</Text>
        )}
      </View>

      <Pressable
        disabled={Boolean(checkoutDisabled)}
        onPress={() => void beginCheckout()}
        style={[styles.button, checkoutDisabled && styles.buttonDisabled]}>
        {submitting || verifying ? (
          <ActivityIndicator color={Brand.white} />
        ) : (
          <Text style={styles.buttonText}>CONTINUE TO SECURE PAYMENT</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function SummaryRow({
  emphasized = false,
  label,
  value,
}: {
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.summaryRow, emphasized && styles.summaryRowEmphasized]}>
      <Text style={emphasized ? styles.summaryStrong : styles.summaryLabel}>{label}</Text>
      <Text style={emphasized ? styles.summaryStrong : styles.summaryValue}>{value}</Text>
    </View>
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
  guestForm: { gap: 10 },
  helperText: { color: Brand.muted, fontSize: 12, lineHeight: 18, marginTop: -8 },
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
  inputRow: { flexDirection: 'row', gap: 10 },
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
  paymentCopy: { flex: 1, gap: 4 },
  paymentDetail: { color: Brand.muted, fontSize: 12, lineHeight: 18 },
  paymentOption: {
    alignItems: 'flex-start',
    backgroundColor: Brand.white,
    borderColor: '#e5dbcc',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  paymentOptionSelected: { borderColor: Brand.orange, borderWidth: 2 },
  paymentOptions: { gap: 10 },
  paymentTitle: { color: Brand.darkGreen, fontSize: 15, fontWeight: '800' },
  phoneField: { alignItems: 'center', flexDirection: 'row' },
  phoneInput: { borderBottomLeftRadius: 0, borderTopLeftRadius: 0, flex: 1 },
  phonePrefix: {
    backgroundColor: Brand.lightGreen,
    borderBottomLeftRadius: 14,
    borderTopLeftRadius: 14,
    color: Brand.darkGreen,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 50,
    paddingHorizontal: 14,
    paddingTop: 16,
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
  rowInput: { flex: 1 },
  screen: { backgroundColor: Brand.cream },
  sectionTitle: { color: Brand.darkGreen, fontSize: 19, fontWeight: '800', marginTop: 6 },
  subtitle: { color: Brand.muted, fontSize: 14, lineHeight: 21 },
  summary: {
    backgroundColor: Brand.white,
    borderColor: '#e5dbcc',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  summaryLabel: { color: Brand.muted, flex: 1, fontSize: 13 },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  summaryRowEmphasized: {
    borderTopColor: '#e5dbcc',
    borderTopWidth: 1,
    marginTop: 3,
    paddingTop: 12,
  },
  summaryStrong: { color: Brand.darkGreen, fontSize: 17, fontWeight: '800' },
  summaryValue: { color: Brand.darkGreen, fontSize: 13, fontWeight: '700' },
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
