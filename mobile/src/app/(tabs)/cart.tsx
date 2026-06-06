import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Screen } from '@/components/screen';
import { Brand } from '@/constants/brand';
import {
  formatPrice,
  getFallbackProductImage,
  getProductsByIds,
  type MobileProduct,
} from '@/lib/products';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';

export default function CartScreen() {
  const { session } = useAuth();
  const { clearCart, hydrated, items, removeItem, updateQuantity } = useCart();
  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getProductsByIds(items.map((item) => item.productId)).then((result) => {
      if (active) {
        setProducts(result);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [items]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const subtotal = items.reduce((total, item) => {
    const product = productsById.get(item.productId);
    return total + (product?.priceCents ?? 0) * item.quantity;
  }, 0);

  if (!hydrated || loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR SELECTION</Text>
          <Text style={styles.title}>Cart</Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.cardTitle}>Your cart is empty.</Text>
            <Text style={styles.muted}>Browse the shop and add your skincare essentials.</Text>
            <Pressable onPress={() => router.push('/products')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>SHOP PRODUCTS</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {items.map((item) => {
              const product = productsById.get(item.productId);

              if (!product) {
                return null;
              }

              return (
                <View key={item.productId} style={styles.item}>
                  <Image
                    contentFit="cover"
                    source={product.imageUrl || getFallbackProductImage(product.slug)}
                    style={styles.image}
                  />
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{product.name}</Text>
                    <Text style={styles.price}>{formatPrice(product)}</Text>
                    <View style={styles.quantityRow}>
                      <Pressable
                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                        style={styles.quantityButton}>
                        <Text style={styles.quantityText}>−</Text>
                      </Pressable>
                      <Text style={styles.quantityValue}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                        style={styles.quantityButton}>
                        <Text style={styles.quantityText}>+</Text>
                      </Pressable>
                      <Pressable onPress={() => removeItem(item.productId)}>
                        <Text style={styles.remove}>REMOVE</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.cardTitle}>Subtotal</Text>
                <Text style={styles.total}>HK$ {(subtotal / 100).toLocaleString('en-HK')}</Text>
              </View>
              <Text style={styles.muted}>Shipping is calculated securely at checkout.</Text>
              <Pressable
                onPress={() => router.push(session ? '/checkout' : '/account')}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {session ? 'CONTINUE TO CHECKOUT' : 'SIGN IN TO CHECK OUT'}
                </Text>
              </Pressable>
              <Pressable onPress={clearCart}>
                <Text style={styles.clear}>CLEAR CART</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: Brand.darkGreen, fontSize: 18, fontWeight: '800' },
  center: { alignItems: 'center', justifyContent: 'center' },
  clear: { color: Brand.muted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  content: { gap: 14, padding: 16, paddingBottom: 36 },
  empty: { backgroundColor: Brand.white, borderRadius: 20, gap: 14, padding: 22 },
  eyebrow: { color: Brand.orange, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  heading: { gap: 7, paddingVertical: 8 },
  image: { backgroundColor: Brand.lightGreen, borderRadius: 14, height: 92, width: 92 },
  item: {
    backgroundColor: Brand.white,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 14,
    padding: 12,
  },
  itemCopy: { flex: 1, gap: 7, justifyContent: 'center' },
  itemName: { color: Brand.darkGreen, fontSize: 16, fontWeight: '700' },
  muted: { color: Brand.muted, fontSize: 13, lineHeight: 19 },
  price: { color: Brand.orange, fontSize: 15, fontWeight: '800' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: Brand.white, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  quantityButton: {
    alignItems: 'center',
    backgroundColor: Brand.lightGreen,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  quantityRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  quantityText: { color: Brand.darkGreen, fontSize: 18, fontWeight: '800' },
  quantityValue: { color: Brand.darkGreen, fontSize: 14, fontWeight: '800', minWidth: 16, textAlign: 'center' },
  remove: { color: Brand.muted, fontSize: 10, fontWeight: '800', marginLeft: 4 },
  summary: { backgroundColor: Brand.lightGreen, borderRadius: 20, gap: 14, marginTop: 4, padding: 20 },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: Brand.darkGreen, fontSize: 32, fontWeight: '800' },
  total: { color: Brand.orange, fontSize: 20, fontWeight: '800' },
});

