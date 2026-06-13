import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Screen } from '@/components/screen';
import { Brand } from '@/constants/brand';
import {
  apiRequest,
  type MobileAccount,
  type MobileAddress,
  type MobileOrder,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';

type FormMessage = { text: string; type: 'error' | 'success' };

const emptyAddressForm = {
  addressLine1: '',
  addressLine2: '',
  city: 'Hong Kong',
  firstName: '',
  label: 'Home',
  lastName: '',
  phone: '',
  postalCode: '',
  region: '',
};

function formatOrderTotal(order: MobileOrder) {
  return new Intl.NumberFormat('en-HK', {
    currency: order.currency,
    style: 'currency',
  }).format(order.total_cents / 100);
}

export default function AccountScreen() {
  const { loading: sessionLoading, session } = useAuth();
  const {
    notifications,
    pushRegistrationError,
    pushRegistrationStatus,
    registerDevice,
    unregisterDevice,
  } = useNotifications();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState<MobileAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);

  async function loadAccount(showRefresh = false) {
    if (!session) {
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setAccountLoading(true);
    }

    try {
      setAccount(await apiRequest<MobileAccount>('/api/mobile/account', session));
      setMessage(null);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Unable to load your account.',
        type: 'error',
      });
    } finally {
      setAccountLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    const timer = setTimeout(() => {
      void loadAccount();
    }, 0);

    return () => clearTimeout(timer);
    // Reload whenever the authenticated identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  async function submitAuth() {
    setMessage(null);

    if (
      !email.trim() ||
      password.length < 6 ||
      (mode === 'register' && (!firstName.trim() || !lastName.trim()))
    ) {
      setMessage({
        text:
          mode === 'register'
            ? 'Enter your first name, last name, email, and a password with at least 6 characters.'
            : 'Enter your email and password.',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);

    try {
      const result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                data: {
                  first_name: firstName.trim(),
                  full_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
                  last_name: lastName.trim(),
                  phone: phone ? `+852${phone}` : '',
                },
              },
            });

      if (result.error) {
        setMessage({
          text:
            mode === 'login' && result.error.message.toLowerCase().includes('invalid login')
              ? 'The email or password is incorrect.'
              : result.error.message,
          type: 'error',
        });
      } else if (mode === 'register' && !result.data.session) {
        setMessage({
          text: 'Account created. Confirm your email address, then return here to sign in.',
          type: 'success',
        });
      }
    } catch {
      setMessage({ text: 'Unable to connect. Check your internet connection and try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAddress() {
    if (!session) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await apiRequest<{ address: MobileAddress }>('/api/mobile/addresses', session, {
        body: JSON.stringify({ ...addressForm, isDefault: true }),
        method: 'POST',
      });
      setAddressForm(emptyAddressForm);
      setShowAddressForm(false);
      setMessage({ text: 'Address saved.', type: 'success' });
      await loadAccount();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Unable to save this address.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!session) {
      return;
    }

    try {
      await apiRequest(`/api/mobile/addresses/${id}`, session, { method: 'DELETE' });
      await loadAccount();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Unable to delete this address.',
        type: 'error',
      });
    }
  }

  if (sessionLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </Screen>
    );
  }

  if (session) {
    return (
      <Screen>
        <BrandHeader />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              onRefresh={() => void loadAccount(true)}
              refreshing={refreshing}
              tintColor={Brand.orange}
            />
          }>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>{session.user.email}</Text>
          {message ? <Message message={message} /> : null}

          {accountLoading && !account ? (
            <ActivityIndicator color={Brand.orange} size="large" />
          ) : (
            <>
              <View style={styles.notificationSettingsCard}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.cardTitle}>Phone notifications</Text>
                  <Text
                    style={[
                      styles.notificationStatus,
                      pushRegistrationStatus === 'registered'
                        ? styles.notificationStatusEnabled
                        : styles.notificationStatusAttention,
                    ]}>
                    {pushRegistrationStatus === 'registered'
                      ? 'ENABLED'
                      : pushRegistrationStatus === 'registering'
                        ? 'CHECKING'
                        : 'ACTION NEEDED'}
                  </Text>
                </View>
                <Text style={styles.cardText}>
                  {pushRegistrationStatus === 'registered'
                    ? 'Order confirmations and shipping updates can appear in the phone notification area.'
                    : pushRegistrationError ??
                      'Enable notifications to receive order updates outside the app.'}
                </Text>
                {pushRegistrationStatus !== 'registered' ? (
                  <Pressable
                    disabled={pushRegistrationStatus === 'registering'}
                    onPress={() => {
                      if (pushRegistrationStatus === 'permission-denied') {
                        void Linking.openSettings();
                      } else {
                        void registerDevice();
                      }
                    }}
                    style={styles.notificationButton}>
                    {pushRegistrationStatus === 'registering' ? (
                      <ActivityIndicator color={Brand.white} />
                    ) : (
                      <Text style={styles.buttonText}>
                        {pushRegistrationStatus === 'permission-denied'
                          ? 'OPEN ANDROID SETTINGS'
                          : 'ENABLE NOTIFICATIONS'}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Saved addresses</Text>
                <Pressable onPress={() => setShowAddressForm((current) => !current)}>
                  <Text style={styles.actionText}>{showAddressForm ? 'CANCEL' : 'ADD ADDRESS'}</Text>
                </Pressable>
              </View>

              {showAddressForm ? (
                <View style={styles.formCard}>
                  <View style={styles.row}>
                    <AddressInput
                      label="First name"
                      onChangeText={(value) => setAddressForm((form) => ({ ...form, firstName: value }))}
                      value={addressForm.firstName}
                    />
                    <AddressInput
                      label="Last name"
                      onChangeText={(value) => setAddressForm((form) => ({ ...form, lastName: value }))}
                      value={addressForm.lastName}
                    />
                  </View>
                  {(['label', 'addressLine1', 'addressLine2', 'region', 'postalCode'] as const).map(
                    (field) => (
                      <TextInput
                        key={field}
                        onChangeText={(value) => setAddressForm((form) => ({ ...form, [field]: value }))}
                        placeholder={{
                          addressLine1: 'Address line 1',
                          addressLine2: 'Address line 2 (optional)',
                          label: 'Label, e.g. Home',
                          phone: 'Phone',
                          postalCode: 'Postal code (optional)',
                          region: 'District / region (optional)',
                        }[field]}
                        placeholderTextColor="#929a94"
                        style={styles.input}
                        value={addressForm[field]}
                      />
                    ),
                  )}
                  <View style={styles.phoneField}>
                    <Text style={styles.phonePrefix}>+852</Text>
                    <TextInput
                      keyboardType="number-pad"
                      maxLength={8}
                      onChangeText={(value) =>
                        setAddressForm((form) => ({
                          ...form,
                          phone: value.replace(/\D/g, '').slice(0, 8),
                        }))
                      }
                      placeholder="Phone number"
                      placeholderTextColor="#929a94"
                      style={[styles.input, styles.phoneInput]}
                      value={addressForm.phone}
                    />
                  </View>
                  <TextInput
                    onChangeText={(value) => setAddressForm((form) => ({ ...form, city: value }))}
                    placeholder="City"
                    placeholderTextColor="#929a94"
                    style={styles.input}
                    value={addressForm.city}
                  />
                  <Pressable disabled={submitting} onPress={() => void saveAddress()} style={styles.button}>
                    {submitting ? (
                      <ActivityIndicator color={Brand.white} />
                    ) : (
                      <Text style={styles.buttonText}>SAVE AS DEFAULT</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {account?.addresses.length ? (
                account.addresses.map((address) => (
                  <View key={address.id} style={styles.card}>
                    <View style={styles.sectionHeading}>
                      <Text style={styles.cardTitle}>
                        {address.label || 'Address'} {address.is_default ? '· Default' : ''}
                      </Text>
                      <Pressable onPress={() => void deleteAddress(address.id)}>
                        <Text style={styles.deleteText}>DELETE</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.cardText}>
                      {[address.first_name, address.last_name].filter(Boolean).join(' ')}
                      {'\n'}
                      {address.address_line1}
                      {address.address_line2 ? `, ${address.address_line2}` : ''}
                      {'\n'}
                      {[address.city, address.region, address.postal_code].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No saved address yet. Add one before checkout.</Text>
              )}

              <Text style={styles.sectionTitle}>Recent orders</Text>
              {account?.orders.length ? (
                account.orders.map((order) => (
                  <Pressable
                    key={order.id}
                    onPress={() =>
                      router.push({ pathname: '/order/[id]', params: { id: order.id } })
                    }
                    style={styles.card}>
                    <View style={styles.sectionHeading}>
                      <Text style={styles.cardTitle}>{order.order_number}</Text>
                      <Text style={styles.orderStatus}>{order.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.cardText}>
                      {new Date(order.created_at).toLocaleDateString()} · {formatOrderTotal(order)}
                      {'\n'}
                      {order.order_items.map((item) => `${item.quantity}× ${item.product_name}`).join(', ')}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>Your orders will appear here.</Text>
              )}

              {notifications.length ? (
                <>
                  <Text style={styles.sectionTitle}>Notifications</Text>
                  {notifications.slice(0, 10).map((notification) => (
                    <Pressable
                      key={notification.id}
                      onPress={() => {
                        if (notification.order_id) {
                          router.push({
                            pathname: '/order/[id]',
                            params: { id: notification.order_id },
                          });
                        }
                      }}
                      style={[styles.card, !notification.read_at && styles.unreadCard]}>
                      <Text style={styles.cardTitle}>{notification.title}</Text>
                      <Text style={styles.cardText}>{notification.body}</Text>
                      <Text style={styles.notificationDate}>
                        {new Date(notification.created_at).toLocaleString()}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
            </>
          )}

          <Pressable
            onPress={() => {
              void unregisterDevice().finally(() => supabase.auth.signOut());
            }}
            style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>SIGN OUT</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandHeader />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>{mode === 'login' ? 'WELCOME BACK' : 'JOIN HARMONY LAB'}</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
          <Text style={styles.subtitle}>Access your HarmonyLab account across web and mobile.</Text>
          {message ? <Message message={message} /> : null}
          {mode === 'register' ? (
            <>
              <View style={styles.row}>
                <AddressInput label="First name" onChangeText={setFirstName} value={firstName} />
                <AddressInput label="Last name" onChangeText={setLastName} value={lastName} />
              </View>
              <View style={styles.phoneField}>
                <Text style={styles.phonePrefix}>+852</Text>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={8}
                  onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Phone number"
                  placeholderTextColor="#929a94"
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                />
              </View>
            </>
          ) : null}
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setMessage(null);
            }}
            placeholder="Email address"
            placeholderTextColor="#929a94"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChangeText={(value) => {
              setPassword(value);
              setMessage(null);
            }}
            placeholder="Password"
            placeholderTextColor="#929a94"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <Pressable disabled={submitting} onPress={() => void submitAuth()} style={styles.button}>
            {submitting ? (
              <ActivityIndicator color={Brand.white} />
            ) : (
              <Text style={styles.buttonText}>{mode === 'login' ? 'SIGN IN' : 'REGISTER'}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              setMessage(null);
              setMode((current) => (current === 'login' ? 'register' : 'login'));
            }}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'New to HarmonyLab? Create an account' : 'Already registered? Sign in'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Message({ message }: { message: FormMessage }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.message, message.type === 'error' ? styles.errorMessage : styles.successMessage]}>
      <Text style={message.type === 'error' ? styles.errorText : styles.successText}>{message.text}</Text>
    </View>
  );
}

function AddressInput({
  label,
  onChangeText,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <TextInput
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor="#929a94"
      style={[styles.input, styles.flex]}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  actionText: { color: Brand.orange, fontSize: 11, fontWeight: '800' },
  button: {
    alignItems: 'center',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: { color: Brand.white, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  card: { backgroundColor: Brand.white, borderRadius: 18, gap: 8, padding: 18 },
  cardText: { color: Brand.muted, fontSize: 13, lineHeight: 20 },
  cardTitle: { color: Brand.darkGreen, fontSize: 16, fontWeight: '800' },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { gap: 14, padding: 22, paddingBottom: 40, paddingTop: 34 },
  deleteText: { color: '#9d4335', fontSize: 10, fontWeight: '800' },
  emptyText: { color: Brand.muted, fontSize: 13, lineHeight: 20 },
  errorMessage: { backgroundColor: '#fce8e5', borderColor: '#e8b7af' },
  errorText: { color: '#8b2f23', fontSize: 14, fontWeight: '700' },
  eyebrow: { color: Brand.orange, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  flex: { flex: 1 },
  formCard: { backgroundColor: Brand.lightGreen, borderRadius: 18, gap: 10, padding: 16 },
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
  message: { borderRadius: 14, borderWidth: 1, padding: 14 },
  notificationDate: { color: Brand.muted, fontSize: 11 },
  notificationButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
  },
  notificationSettingsCard: {
    backgroundColor: Brand.lightGreen,
    borderRadius: 18,
    gap: 10,
    padding: 18,
  },
  notificationStatus: { fontSize: 10, fontWeight: '800' },
  notificationStatusAttention: { color: '#9d4335' },
  notificationStatusEnabled: { color: Brand.darkGreen },
  orderStatus: { color: Brand.orange, fontSize: 10, fontWeight: '800' },
  outlineButton: {
    alignItems: 'center',
    borderColor: Brand.darkGreen,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    padding: 14,
  },
  outlineButtonText: { color: Brand.darkGreen, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: Brand.darkGreen, fontSize: 20, fontWeight: '800', marginTop: 8 },
  subtitle: { color: Brand.muted, fontSize: 15, lineHeight: 22 },
  successMessage: { backgroundColor: Brand.lightGreen, borderColor: '#b9d1bf' },
  successText: { color: Brand.darkGreen, fontSize: 14, fontWeight: '700' },
  switchText: { color: Brand.darkGreen, fontSize: 14, fontWeight: '700', padding: 8, textAlign: 'center' },
  title: { color: Brand.darkGreen, fontSize: 32, fontWeight: '800' },
  unreadCard: { borderColor: Brand.orange, borderWidth: 1 },
});
