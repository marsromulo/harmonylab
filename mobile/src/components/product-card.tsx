import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import {
  formatPrice,
  getFallbackProductImage,
  type MobileProduct,
} from '@/lib/products';
import { useCart } from '@/providers/cart-provider';

export function ProductCard({ product }: { product: MobileProduct }) {
  const { addItem, animateAddToCart } = useCart();

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/product/[slug]',
            params: { slug: product.slug },
          })
        }
        style={({ pressed }) => pressed && styles.pressed}>
      <Image
        contentFit="cover"
        source={product.imageUrl || getFallbackProductImage(product.slug)}
        style={styles.image}
        transition={200}
      />
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {product.description}
        </Text>
        <Text style={styles.price}>{formatPrice(product)}</Text>
      </View>
      </Pressable>
      <Pressable
        disabled={product.inventoryQuantity < 1}
        onPress={(event) => {
          addItem(product.id);
          animateAddToCart({
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          });
        }}
        style={styles.addButton}>
        <Text style={styles.addButtonText}>
          {product.inventoryQuantity > 0 ? 'ADD TO CART' : 'SOLD OUT'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: Brand.darkGreen,
    margin: 12,
    marginTop: 0,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 999,
  },
  addButtonText: {
    color: Brand.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 18,
    flex: 1,
    minWidth: 150,
    overflow: 'hidden',
  },
  copy: {
    gap: 7,
    padding: 14,
  },
  description: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 34,
  },
  image: {
    aspectRatio: 1.12,
    backgroundColor: Brand.lightGreen,
    width: '100%',
  },
  name: {
    color: Brand.darkGreen,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    minHeight: 42,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  price: {
    color: Brand.orange,
    fontSize: 16,
    fontWeight: '800',
  },
});
