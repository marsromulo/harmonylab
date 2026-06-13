import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

import { Brand } from '@/constants/brand';

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartAnimationPoint = {
  x: number;
  y: number;
};

type CartContextValue = {
  addItem: (productId: string) => void;
  animateAddToCart: (origin: CartAnimationPoint) => void;
  cartIconScale: Animated.Value;
  clearCart: () => void;
  hydrated: boolean;
  itemCount: number;
  items: CartItem[];
  registerCartTarget: (target: CartAnimationPoint) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
};

type CartFlight = {
  origin: CartAnimationPoint;
  target: CartAnimationPoint;
};

const storageKey = 'harmonylab-cart-v1';
const defaultCartIconScale = new Animated.Value(1);

const CartContext = createContext<CartContextValue>({
  addItem: () => undefined,
  animateAddToCart: () => undefined,
  cartIconScale: defaultCartIconScale,
  clearCart: () => undefined,
  hydrated: false,
  itemCount: 0,
  items: [],
  registerCartTarget: () => undefined,
  removeItem: () => undefined,
  updateQuantity: () => undefined,
});

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartFlight, setCartFlight] = useState<CartFlight | null>(null);
  const animationIdRef = useRef(0);
  const cartTargetRef = useRef<CartAnimationPoint | null>(null);
  const cartIconScale = useRef(new Animated.Value(1)).current;
  const flightProgress = useRef(new Animated.Value(0)).current;

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

  const registerCartTarget = useCallback((target: CartAnimationPoint) => {
    cartTargetRef.current = target;
  }, []);

  const animateAddToCart = useCallback(
    (origin: CartAnimationPoint) => {
      const window = Dimensions.get('window');
      const target = cartTargetRef.current ?? {
        x: window.width * 0.625,
        y: window.height - 30,
      };
      const animationId = animationIdRef.current + 1;

      animationIdRef.current = animationId;
      flightProgress.stopAnimation();
      cartIconScale.stopAnimation();
      flightProgress.setValue(0);
      cartIconScale.setValue(1);
      setCartFlight({ origin, target });

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(flightProgress, {
            duration: 650,
            easing: Easing.inOut(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(cartIconScale, {
              duration: 120,
              easing: Easing.out(Easing.quad),
              toValue: 1.35,
              useNativeDriver: true,
            }),
            Animated.spring(cartIconScale, {
              damping: 7,
              mass: 0.55,
              stiffness: 240,
              toValue: 1,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          if (animationIdRef.current === animationId) {
            setCartFlight(null);
          }
        });
      });
    },
    [cartIconScale, flightProgress],
  );

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
      animateAddToCart,
      cartIconScale,
      clearCart,
      hydrated,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      items,
      registerCartTarget,
      removeItem,
      updateQuantity,
    }),
    [
      addItem,
      animateAddToCart,
      cartIconScale,
      clearCart,
      hydrated,
      items,
      registerCartTarget,
      removeItem,
      updateQuantity,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {cartFlight ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flyingDot,
              {
                opacity: flightProgress.interpolate({
                  inputRange: [0, 0.08, 0.82, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateX: flightProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        cartFlight.origin.x - 5,
                        cartFlight.target.x - 5,
                      ],
                    }),
                  },
                  {
                    translateY: flightProgress.interpolate({
                      inputRange: [0, 0.55, 1],
                      outputRange: [
                        cartFlight.origin.y - 5,
                        Math.min(cartFlight.origin.y, cartFlight.target.y) - 70,
                        cartFlight.target.y - 5,
                      ],
                    }),
                  },
                  {
                    scale: flightProgress.interpolate({
                      inputRange: [0, 0.18, 0.8, 1],
                      outputRange: [0.7, 1.25, 1, 0.45],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}
      </View>
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

const styles = StyleSheet.create({
  flyingDot: {
    backgroundColor: Brand.orange,
    borderRadius: 5,
    elevation: 20,
    height: 10,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 10,
    zIndex: 1000,
  },
  root: {
    flex: 1,
  },
});
