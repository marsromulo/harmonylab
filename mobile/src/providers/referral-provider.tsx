import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

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
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(storageKey)
      .then((storedCode) => {
        if (active) {
          setReferralCode(normalizeReferralCode(storedCode ?? ''));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ referralCode }), [referralCode]);

  return <ReferralContext.Provider value={value}>{children}</ReferralContext.Provider>;
}

export function useReferral() {
  return useContext(ReferralContext);
}
