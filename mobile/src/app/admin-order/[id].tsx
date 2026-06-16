import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { Brand } from '@/constants/brand';
import { apiRequest, type MobileAdminOrderDetails } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';

type Message = { text: string; type: 'error' | 'success' };
type FulfillmentStatus = 'shipped' | 'delivered';
type PaymentStatus = 'unpaid' | 'paid' | 'cancelled';
type ReferralStatus = 'unpaid' | 'paid';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-HK', {
    currency,
    style: 'currency',
  }).format(cents / 100);
}

function getParameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdminOrderScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = getParameter(params.id) ?? '';
  const { loading: authLoading, session } = useAuth();
  const { markOrderRead } = useNotifications();
  const [order, setOrder] = useState<MobileAdminOrderDetails | null>(null);
  const [fulfillmentStatus, setFulfillmentStatus] =
    useState<FulfillmentStatus>('shipped');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>('unpaid');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'fulfillment' | 'payment' | 'referral' | null>(null);

  const applyOrder = useCallback((nextOrder: MobileAdminOrderDetails) => {
    setOrder(nextOrder);
    setFulfillmentStatus(nextOrder.status === 'delivered' ? 'delivered' : 'shipped');
    setPaymentStatus(
      nextOrder.payment_status === 'paid' || nextOrder.payment_status === 'cancelled'
        ? nextOrder.payment_status
        : 'unpaid',
    );
    setReferralStatus(nextOrder.referral_payout_status);
    setCarrier(nextOrder.fulfillment_carrier ?? '');
    setTrackingNumber(nextOrder.fulfillment_tracking_number ?? '');
    setTrackingUrl(nextOrder.fulfillment_tracking_url ?? '');
    setNotes(nextOrder.fulfillment_notes ?? '');
  }, []);

  const loadOrder = useCallback(async () => {
    if (!session || !orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await apiRequest<{ order: MobileAdminOrderDetails }>(
        `/api/mobile/admin/orders/${encodeURIComponent(orderId)}`,
        session,
      );
      applyOrder(result.order);
      await markOrderRead(orderId);
    } catch (loadError) {
      setMessage({
        text: loadError instanceof Error ? loadError.message : 'Unable to load this order.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [applyOrder, markOrderRead, orderId, session]);

  useEffect(() => {
    if (!authLoading) {
      void loadOrder();
    }
  }, [authLoading, loadOrder]);

  async function saveFulfillment() {
    if (!session) {
      return;
    }

    setSaving('fulfillment');
    setMessage(null);

    try {
      const result = await apiRequest<{ order: MobileAdminOrderDetails }>(
        `/api/mobile/admin/orders/${encodeURIComponent(orderId)}`,
        session,
        {
          body: JSON.stringify({
            action: 'fulfillment',
            carrier,
            notes,
            status: fulfillmentStatus,
            trackingNumber,
            trackingUrl,
          }),
          method: 'PATCH',
        },
      );
      applyOrder(result.order);
      setMessage({ text: 'Delivery status updated.', type: 'success' });
    } catch (saveError) {
      setMessage({
        text: saveError instanceof Error ? saveError.message : 'Unable to update delivery.',
        type: 'error',
      });
    } finally {
      setSaving(null);
    }
  }

  async function saveReferralStatus() {
    if (!session) {
      return;
    }

    setSaving('referral');
    setMessage(null);

    try {
      const result = await apiRequest<{ order: MobileAdminOrderDetails }>(
        `/api/mobile/admin/orders/${encodeURIComponent(orderId)}`,
        session,
        {
          body: JSON.stringify({
            action: 'referral_payout',
            status: referralStatus,
          }),
          method: 'PATCH',
        },
      );
      applyOrder(result.order);
      setMessage({ text: 'Referral payout status updated.', type: 'success' });
    } catch (saveError) {
      setMessage({
        text:
          saveError instanceof Error
            ? saveError.message
            : 'Unable to update the referral payout.',
        type: 'error',
      });
    } finally {
      setSaving(null);
    }
  }

  async function savePaymentStatus() {
    if (!session) {
      return;
    }

    setSaving('payment');
    setMessage(null);

    try {
      const result = await apiRequest<{ order: MobileAdminOrderDetails }>(
        `/api/mobile/admin/orders/${encodeURIComponent(orderId)}`,
        session,
        {
          body: JSON.stringify({
            action: 'payment_status',
            status: paymentStatus,
          }),
          method: 'PATCH',
        },
      );
      applyOrder(result.order);
      setMessage({ text: 'Payment status updated.', type: 'success' });
    } catch (saveError) {
      setMessage({
        text:
          saveError instanceof Error
            ? saveError.message
            : 'Unable to update the payment status.',
        type: 'error',
      });
    } finally {
      setSaving(null);
    }
  }

  if (authLoading || loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorText}>Sign in with an admin account to manage orders.</Text>
        <Pressable onPress={() => router.replace('/account')} style={styles.button}>
          <Text style={styles.buttonText}>GO TO ACCOUNT</Text>
        </Pressable>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorText}>{message?.text || 'Order not found.'}</Text>
      </Screen>
    );
  }

  const address = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    order.shipping_city,
    order.shipping_region,
    order.shipping_country,
  ].filter(Boolean);

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>MANAGE ORDER</Text>
          <Text style={styles.title}>{order.order_number}</Text>
          <Text style={styles.subtitle}>
            {new Date(order.created_at).toLocaleString()} ·{' '}
            {formatMoney(order.total_cents, order.currency)}
          </Text>

          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.message,
                message.type === 'error' ? styles.errorMessage : styles.successMessage,
              ]}>
              {message.text}
            </Text>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Detail label="Name" value={order.customer_name || 'Guest customer'} />
            <Detail label="Email" value={order.customer_email || 'Not provided'} />
            <Detail label="Address" value={address.join('\n') || 'Not provided'} />
            {order.delivery_notes ? (
              <Detail label="Customer delivery notes" value={order.delivery_notes} />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Items and payment</Text>
            {order.order_items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.quantity} × {item.product_name}
                </Text>
                <Text style={styles.itemValue}>
                  {formatMoney(item.line_total_cents, order.currency)}
                </Text>
              </View>
            ))}
            <Detail label="Payment method" value={order.payment_method || 'Not selected'} />
            <Detail
              label="Wonder reference"
              value={order.wonder_transaction_id || order.wonder_order_number || 'Pending'}
            />
            <Text style={styles.controlLabel}>Payment status</Text>
            <SegmentedControl
              onChange={(value) => setPaymentStatus(value as PaymentStatus)}
              options={[
                { label: 'Unpaid', value: 'unpaid' },
                { label: 'Paid', value: 'paid' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
              value={paymentStatus}
            />
            {order.payment_status === 'paid' ? (
              <Text style={styles.helpText}>
                Cancelling does not restore inventory or reverse referral points.
              </Text>
            ) : null}
            <Pressable
              disabled={saving !== null}
              onPress={() => void savePaymentStatus()}
              style={[styles.button, saving !== null && styles.buttonDisabled]}>
              {saving === 'payment' ? (
                <ActivityIndicator color={Brand.white} />
              ) : (
                <Text style={styles.buttonText}>UPDATE PAYMENT STATUS</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery update</Text>
            <SegmentedControl
              onChange={(value) => setFulfillmentStatus(value as FulfillmentStatus)}
              options={[
                { label: 'Shipped', value: 'shipped' },
                { label: 'Delivered', value: 'delivered' },
              ]}
              value={fulfillmentStatus}
            />
            <AdminInput label="Carrier" onChangeText={setCarrier} value={carrier} />
            <AdminInput
              label="Tracking number"
              onChangeText={setTrackingNumber}
              value={trackingNumber}
            />
            <AdminInput
              autoCapitalize="none"
              keyboardType="url"
              label="Tracking URL"
              onChangeText={setTrackingUrl}
              value={trackingUrl}
            />
            <AdminInput
              label="Fulfillment notes"
              multiline
              onChangeText={setNotes}
              value={notes}
            />
            <Pressable
              disabled={saving !== null}
              onPress={() => void saveFulfillment()}
              style={[styles.button, saving !== null && styles.buttonDisabled]}>
              {saving === 'fulfillment' ? (
                <ActivityIndicator color={Brand.white} />
              ) : (
                <Text style={styles.buttonText}>UPDATE DELIVERY</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Referral payout</Text>
            <Detail label="Referral code" value={order.referral_code_entered || 'None'} />
            <Detail label="Points awarded" value={String(order.referral_points_awarded)} />
            <SegmentedControl
              onChange={(value) => setReferralStatus(value as ReferralStatus)}
              options={[
                { label: 'Unpaid', value: 'unpaid' },
                { label: 'Paid', value: 'paid' },
              ]}
              value={referralStatus}
            />
            <Pressable
              disabled={saving !== null || !order.referral_code_entered}
              onPress={() => void saveReferralStatus()}
              style={[
                styles.button,
                (saving !== null || !order.referral_code_entered) && styles.buttonDisabled,
              ]}>
              {saving === 'referral' ? (
                <ActivityIndicator color={Brand.white} />
              ) : (
                <Text style={styles.buttonText}>UPDATE REFERRAL STATUS</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function AdminInput({
  label,
  ...props
}: {
  label: string;
  autoCapitalize?: 'none';
  keyboardType?: 'url';
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <TextInput
      placeholder={label}
      placeholderTextColor="#929a94"
      style={[styles.input, props.multiline && styles.multilineInput]}
      {...props}
    />
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SegmentedControl({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <View style={styles.segmentedControl}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 20,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: Brand.white, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: Brand.white, borderRadius: 18, gap: 12, padding: 18 },
  center: { alignItems: 'center', gap: 18, justifyContent: 'center', padding: 24 },
  content: { gap: 16, padding: 22, paddingBottom: 44 },
  controlLabel: { color: Brand.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  detail: { gap: 3 },
  detailLabel: { color: Brand.muted, fontSize: 11, fontWeight: '700' },
  detailValue: { color: Brand.darkGreen, fontSize: 14, lineHeight: 21 },
  errorMessage: { backgroundColor: '#fce8e5', color: '#8b2f23' },
  errorText: { color: '#8b2f23', fontSize: 15, textAlign: 'center' },
  eyebrow: { color: Brand.orange, fontSize: 12, fontWeight: '800' },
  flex: { flex: 1 },
  helpText: { color: Brand.muted, fontSize: 12, lineHeight: 18 },
  input: {
    backgroundColor: Brand.cream,
    borderColor: '#e5dbcc',
    borderRadius: 14,
    borderWidth: 1,
    color: Brand.darkGreen,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 15,
  },
  itemName: { color: Brand.darkGreen, flex: 1, fontSize: 14, fontWeight: '700' },
  itemRow: {
    borderBottomColor: '#eee5d8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 10,
  },
  itemValue: { color: Brand.darkGreen, fontSize: 13, fontWeight: '700' },
  message: { borderRadius: 14, fontSize: 14, fontWeight: '700', padding: 14 },
  multilineInput: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  sectionTitle: { color: Brand.darkGreen, fontSize: 18, fontWeight: '800' },
  segment: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  segmentSelected: { backgroundColor: Brand.darkGreen },
  segmentText: { color: Brand.darkGreen, fontSize: 12, fontWeight: '800' },
  segmentTextSelected: { color: Brand.white },
  segmentedControl: {
    backgroundColor: Brand.lightGreen,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  subtitle: { color: Brand.muted, fontSize: 13, lineHeight: 20 },
  successMessage: { backgroundColor: Brand.lightGreen, color: Brand.darkGreen },
  title: { color: Brand.darkGreen, fontSize: 30, fontWeight: '800' },
});
