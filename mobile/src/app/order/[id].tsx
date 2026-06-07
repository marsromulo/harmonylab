import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { Brand } from '@/constants/brand';
import { apiRequest, type MobileOrderDetails } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-HK', {
    currency,
    style: 'currency',
  }).format(cents / 100);
}

function getParameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = getParameter(params.id) ?? '';
  const { loading: authLoading, session } = useAuth();
  const { markOrderRead } = useNotifications();
  const [order, setOrder] = useState<MobileOrderDetails | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!session || !orderId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    apiRequest<{ order: MobileOrderDetails }>(
      `/api/mobile/orders/${encodeURIComponent(orderId)}`,
      session,
    )
      .then(async (result) => {
        if (!cancelled) {
          setOrder(result.order);
          await markOrderRead(orderId);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this order.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, markOrderRead, orderId, session]);

  if (loading || authLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.title}>Sign in to view this order.</Text>
        <Pressable onPress={() => router.replace('/account')} style={styles.button}>
          <Text style={styles.buttonText}>GO TO ACCOUNT</Text>
        </Pressable>
      </Screen>
    );
  }

  if (error || !order) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorText}>{error || 'Order not found.'}</Text>
      </Screen>
    );
  }

  const address = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    order.shipping_city,
    order.shipping_region,
    order.shipping_postal_code,
    order.shipping_country,
  ].filter(Boolean);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ORDER DETAILS</Text>
        <Text style={styles.title}>{order.order_number}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.status}>{order.status.toUpperCase()}</Text>
          <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString()}</Text>
        </View>

        <View style={styles.card}>
          {order.order_items.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.flex}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.muted}>
                  {item.quantity} × {formatMoney(item.unit_price_cents, order.currency)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatMoney(item.line_total_cents, order.currency)}
              </Text>
            </View>
          ))}
          <TotalRow label="Subtotal" value={formatMoney(order.subtotal_cents, order.currency)} />
          <TotalRow label="Shipping" value={formatMoney(order.shipping_cents, order.currency)} />
          {order.discount_cents > 0 ? (
            <TotalRow label="Discount" value={formatMoney(order.discount_cents, order.currency)} />
          ) : null}
          <TotalRow
            emphasized
            label="Order total"
            value={formatMoney(order.total_cents, order.currency)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          <Text style={styles.cardText}>{address.join('\n') || 'Not provided'}</Text>
          {order.delivery_notes ? (
            <>
              <Text style={styles.sectionTitle}>Delivery notes</Text>
              <Text style={styles.cardText}>{order.delivery_notes}</Text>
            </>
          ) : null}
        </View>

        {order.fulfillment_carrier ||
        order.fulfillment_tracking_number ||
        order.fulfillment_tracking_url ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tracking</Text>
            {order.fulfillment_carrier ? (
              <Text style={styles.cardText}>Carrier: {order.fulfillment_carrier}</Text>
            ) : null}
            {order.fulfillment_tracking_number ? (
              <Text style={styles.cardText}>
                Tracking number: {order.fulfillment_tracking_number}
              </Text>
            ) : null}
            {order.fulfillment_tracking_url ? (
              <Pressable onPress={() => Linking.openURL(order.fulfillment_tracking_url!)}>
                <Text style={styles.link}>OPEN TRACKING</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function TotalRow({
  emphasized = false,
  label,
  value,
}: {
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.totalRow, emphasized && styles.totalRowEmphasized]}>
      <Text style={emphasized ? styles.totalStrong : styles.muted}>{label}</Text>
      <Text style={emphasized ? styles.totalStrong : styles.cardText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Brand.orange,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  buttonText: { color: Brand.white, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: Brand.white, borderRadius: 18, gap: 12, padding: 18 },
  cardText: { color: Brand.darkGreen, fontSize: 14, lineHeight: 21 },
  center: { alignItems: 'center', gap: 18, justifyContent: 'center', padding: 24 },
  content: { gap: 16, padding: 22, paddingBottom: 44 },
  date: { color: Brand.muted, fontSize: 13 },
  errorText: { color: '#8b2f23', fontSize: 15, textAlign: 'center' },
  eyebrow: { color: Brand.orange, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  flex: { flex: 1 },
  itemName: { color: Brand.darkGreen, fontSize: 15, fontWeight: '700' },
  itemTotal: { color: Brand.darkGreen, fontSize: 14, fontWeight: '700' },
  lineItem: {
    alignItems: 'center',
    borderBottomColor: '#eee5d8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
  },
  link: { color: Brand.orange, fontSize: 12, fontWeight: '800', marginTop: 4 },
  muted: { color: Brand.muted, fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: Brand.darkGreen, fontSize: 17, fontWeight: '800' },
  status: { color: Brand.orange, fontSize: 12, fontWeight: '800' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: Brand.darkGreen, fontSize: 30, fontWeight: '800', textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRowEmphasized: {
    borderTopColor: '#d9cdbd',
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 12,
  },
  totalStrong: { color: Brand.darkGreen, fontSize: 16, fontWeight: '800' },
});
