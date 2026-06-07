import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { validateReferralCode } from '@/lib/api';

type ReferralContextValue = {
  referralCode: string;
};

const storageKey = 'harmonylab-validated-referral-code-v1';

const ReferralContext = createContext<ReferralContextValue>({
  referralCode: '',
});

function normalizeReferralCode(value: string) {
  return value
    .trim()
    .replace(/[^\w-]/g, '')
    .toUpperCase()
    .slice(0, 40);
}

export function ReferralProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [input, setInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(storageKey)
      .then((storedCode) => {
        if (!active) {
          return;
        }

        const normalizedCode = normalizeReferralCode(storedCode ?? '');

        if (normalizedCode) {
          setReferralCode(normalizedCode);
          setAccessGranted(true);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const proceed = useCallback(async () => {
    const normalizedCode = normalizeReferralCode(input);
    setInput(normalizedCode);
    setErrorMessage('');

    if (!normalizedCode) {
      setReferralCode('');
      setAccessGranted(true);
      await AsyncStorage.removeItem(storageKey).catch(() => undefined);
      return;
    }

    setSubmitting(true);

    try {
      const valid = await validateReferralCode(normalizedCode);

      if (!valid) {
        setErrorMessage(
          'This referral code was not found. Please contact your referrer for the correct code and try again.',
        );
        return;
      }

      await AsyncStorage.setItem(storageKey, normalizedCode);
      setReferralCode(normalizedCode);
      setAccessGranted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to check the referral code. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [input]);

  const value = useMemo(() => ({ referralCode }), [referralCode]);

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </SafeAreaView>
    );
  }

  if (!accessGranted) {
    return (
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <View style={styles.card}>
            <Image
              contentFit="contain"
              source={require('@/assets/images/harmonylab/full-logo-new.png')}
              style={styles.logo}
            />

            <View style={styles.copy}>
              <Text style={styles.eyebrow}>WELCOME TO HARMONY LAB</Text>
              <Text style={styles.title}>Enter your referral code</Text>
              <Text style={styles.description}>
                If a member referred you, enter their referral code below.
              </Text>
              <Text style={styles.optionalText}>
                You may also leave the Referral Code empty and tap Proceed.
              </Text>
            </View>

            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!submitting}
              maxLength={40}
              onChangeText={(value) => {
                setInput(value);
                setErrorMessage('');
              }}
              onSubmitEditing={() => void proceed()}
              placeholder="Referral Code"
              placeholderTextColor="#949b96"
              returnKeyType="done"
              style={[styles.input, errorMessage ? styles.inputError : null]}
              value={input}
            />

            {errorMessage ? (
              <View style={styles.error}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={submitting}
              onPress={() => void proceed()}
              style={({ pressed }) => [
                styles.button,
                pressed && !submitting ? styles.buttonPressed : null,
                submitting ? styles.buttonDisabled : null,
              ]}>
              {submitting ? (
                <ActivityIndicator color={Brand.white} />
              ) : (
                <Text style={styles.buttonText}>PROCEED</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return <ReferralContext.Provider value={value}>{children}</ReferralContext.Provider>;
}

export function useReferral() {
  return useContext(ReferralContext);
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    height: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: Brand.white,
    borderColor: '#eadfce',
    borderRadius: 24,
    borderWidth: 1,
    gap: 20,
    maxWidth: 460,
    padding: 26,
    width: '100%',
  },
  copy: {
    gap: 9,
  },
  description: {
    color: Brand.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    backgroundColor: '#fff1eb',
    borderColor: '#f3c5b0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  errorText: {
    color: '#a94418',
    fontSize: 13,
    lineHeight: 19,
  },
  eyebrow: {
    color: Brand.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  input: {
    backgroundColor: '#fffdfa',
    borderColor: '#ddd3c4',
    borderRadius: 14,
    borderWidth: 1,
    color: Brand.darkGreen,
    fontSize: 16,
    fontWeight: '700',
    height: 52,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: '#d86a3b',
  },
  keyboardView: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: Brand.cream,
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    alignSelf: 'center',
    height: 64,
    width: 270,
  },
  optionalText: {
    color: Brand.darkGreen,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  screen: {
    backgroundColor: Brand.cream,
    flex: 1,
  },
  title: {
    color: Brand.darkGreen,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
});
