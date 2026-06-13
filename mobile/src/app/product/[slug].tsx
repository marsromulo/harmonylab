import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import {
  formatPrice,
  getFallbackProductImage,
  getProductBySlug,
  type MobileProduct,
} from '@/lib/products';
import { useCart } from '@/providers/cart-provider';

export default function ProductDetailScreen() {
  const { addItem, animateAddToCart } = useCart();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<MobileProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;

    getProductBySlug(slug).then((result) => {
      if (active) {
        setProduct(result);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Brand.orange} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loading}>
        <Text style={styles.notFound}>Product not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Image
        contentFit="cover"
        source={product.imageUrl || getFallbackProductImage(product.slug)}
        style={styles.image}
      />
      <Text style={styles.eyebrow}>HARMONY LAB</Text>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>{formatPrice(product)}</Text>
      <Text style={styles.description}>
        {product.description || 'Thoughtful skincare made for your daily routine.'}
      </Text>
      <View style={styles.stockCard}>
        <Text style={styles.stockTitle}>
          {product.inventoryQuantity > 0 ? 'Available' : 'Currently unavailable'}
        </Text>
        <Text style={styles.stockText}>Secure checkout is available through your mobile cart.</Text>
      </View>
      <Pressable
        disabled={product.inventoryQuantity < 1}
        onPress={(event) => {
          addItem(product.id);
          animateAddToCart({
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          });
        }}
        style={styles.button}>
        <Text style={styles.buttonText}>
          {product.inventoryQuantity > 0 ? 'ADD TO CART' : 'SOLD OUT'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    minHeight: 52,
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 40,
  },
  description: {
    color: Brand.muted,
    fontSize: 16,
    lineHeight: 25,
  },
  eyebrow: {
    color: Brand.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  image: {
    aspectRatio: 1,
    backgroundColor: Brand.lightGreen,
    borderRadius: 24,
    width: '100%',
  },
  loading: {
    alignItems: 'center',
    backgroundColor: Brand.cream,
    flex: 1,
    justifyContent: 'center',
  },
  notFound: {
    color: Brand.darkGreen,
    fontSize: 18,
    fontWeight: '700',
  },
  price: {
    color: Brand.orange,
    fontSize: 22,
    fontWeight: '800',
  },
  screen: {
    backgroundColor: Brand.cream,
  },
  stockCard: {
    backgroundColor: Brand.lightGreen,
    borderRadius: 18,
    gap: 6,
    marginTop: 10,
    padding: 18,
  },
  stockText: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  stockTitle: {
    color: Brand.darkGreen,
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    color: Brand.darkGreen,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 37,
  },
});
