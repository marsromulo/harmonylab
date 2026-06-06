import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  addItem: (productId: string) => void;
  clearCart: () => void;
  hydrated: boolean;
  itemCount: number;
  items: CartItem[];
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
};

const storageKey = 'harmonylab-cart-v1';

const CartContext = createContext<CartContextValue>({
  addItem: () => undefined,
  clearCart: () => undefined,
  hydrated: false,
  itemCount: 0,
  items: [],
  removeItem: () => undefined,
  updateQuantity: () => undefined,
});

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!active || !value) {
          return;
        }

        const stored = JSON.parse(value) as CartItem[];
        setItems(
          stored.filter(
            (item) =>
              typeof item.productId === 'string' &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              item.quantity <= 20,
          ),
        );
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

  useEffect(() => {
    if (hydrated) {
      void AsyncStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [hydrated, items]);

  const addItem = useCallback((productId: string) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);

      if (existing) {
        return current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(item.quantity + 1, 20) }
            : item,
        );
      }

      return [...current, { productId, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((item) => item.productId !== productId));
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.min(quantity, 20) } : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const value = useMemo(
    () => ({
      addItem,
      clearCart,
      hydrated,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      items,
      removeItem,
      updateQuantity,
    }),
    [addItem, clearCart, hydrated, items, removeItem, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

