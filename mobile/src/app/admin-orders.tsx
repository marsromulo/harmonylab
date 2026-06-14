import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { Brand } from '@/constants/brand';
import { apiRequest, type MobileAdminOrder } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-HK', {
    currency,
    style: 'currency',
  }).format(cents / 100);
}

export default function AdminOrdersScreen() {
  const { loading: authLoading, session } = useAuth();
  const [orders, setOrders] = useState<MobileAdminOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(
    async (refresh = false) => {
      if (!session) {
        setLoading(false);
        return;
      }

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const result = await apiRequest<{ orders: MobileAdminOrder[] }>(
          '/api/mobile/admin/orders',
          session,
        );
        setOrders(result.orders);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load customer orders.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useEffect(() => {
    if (!authLoading) {
      void loadOrders();
    }
  }, [authLoading, loadOrders]);

  if (authLoading || loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadOrders(true)}
            refreshing={refreshing}
            tintColor={Brand.orange}
          />
        }>
        <Text style={styles.eyebrow}>ADMIN ORDERS</Text>
        <Text style={styles.title}>Customer orders</Text>
        <Text style={styles.subtitle}>Showing the latest {orders.length} orders.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {orders.map((order) => (
          <Pressable
            key={order.id}
            onPress={() =>
              router.push({
                pathname: '/admin-order/[id]',
                params: { id: order.id },
              } as unknown as Href)
            }
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.headingRow}>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <Text style={styles.total}>{formatMoney(order.total_cents, order.currency)}</Text>
            </View>
            <Text style={styles.customer}>
              {order.customer_name || 'Guest customer'}
              {order.customer_email ? `\n${order.customer_email}` : ''}
            </Text>
            <View style={styles.metaRow}>
              <Status label="Delivery" value={order.status} />
              <Status label="Payment" value={order.payment_status} />
              <Status
                label="Referral Points"
                value={
                  order.referral_code_entered
                    ? `${order.referral_payout_status}: ${order.referral_points_awarded}`
                    : 'None'
                }
              />
            </View>
            {order.referral_code_entered ? (
              <View style={styles.referralRow}>
                <Text style={styles.referralLabel}>Referral code</Text>
                <Text style={styles.referralCode}>{order.referral_code_entered}</Text>
              </View>
            ) : null}
            <Text style={styles.date}>{new Date(order.created_at).toLocaleString()}</Text>
          </Pressable>
        ))}

        {!orders.length && !error ? (
          <Text style={styles.empty}>No customer orders were found.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusGroup}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value.replaceAll('_', ' ').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Brand.white, borderRadius: 18, gap: 11, padding: 18 },
  cardPressed: { opacity: 0.72 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { gap: 14, padding: 22, paddingBottom: 44 },
  customer: { color: Brand.darkGreen, fontSize: 14, lineHeight: 21 },
  date: { color: Brand.muted, fontSize: 11 },
  empty: { color: Brand.muted, fontSize: 14 },
  error: {
    backgroundColor: '#fce8e5',
    borderColor: '#e8b7af',
    borderRadius: 14,
    borderWidth: 1,
    color: '#8b2f23',
    fontSize: 14,
    fontWeight: '700',
    padding: 14,
  },
  eyebrow: { color: Brand.orange, fontSize: 12, fontWeight: '800' },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  orderNumber: {
    color: Brand.darkGreen,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  referralCode: {
    color: Brand.darkGreen,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  referralRow: {
    alignItems: 'center',
    backgroundColor: Brand.lightGreen,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  referralLabel: { color: Brand.muted, fontSize: 10, fontWeight: '700' },
  statusGroup: { gap: 3 },
  statusLabel: { color: Brand.muted, fontSize: 10, fontWeight: '700' },
  statusValue: { color: Brand.orange, fontSize: 11, fontWeight: '800' },
  subtitle: { color: Brand.muted, fontSize: 14 },
  title: { color: Brand.darkGreen, fontSize: 30, fontWeight: '800' },
  total: { color: Brand.darkGreen, fontSize: 15, fontWeight: '800' },
});
