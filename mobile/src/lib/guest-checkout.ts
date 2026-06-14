import AsyncStorage from '@react-native-async-storage/async-storage';

export type GuestCheckoutDetails = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  postalCode: string;
  region: string;
};

export const emptyGuestCheckoutDetails: GuestCheckoutDetails = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  postalCode: '',
  region: '',
};

const storageKey = 'harmonylab-guest-checkout-v1';

export function normalizeLocalPhone(value: string) {
  return value.replace(/\D/g, '').replace(/^852/, '').slice(0, 8);
}

export async function loadGuestCheckoutDetails() {
  const value = await AsyncStorage.getItem(storageKey);

  if (!value) {
    return emptyGuestCheckoutDetails;
  }

  try {
    return {
      ...emptyGuestCheckoutDetails,
      ...(JSON.parse(value) as Partial<GuestCheckoutDetails>),
    };
  } catch {
    return emptyGuestCheckoutDetails;
  }
}

export async function saveGuestCheckoutDetails(details: GuestCheckoutDetails) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(details));
}
