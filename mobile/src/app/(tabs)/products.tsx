import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { ProductCard } from '@/components/product-card';
import { Screen } from '@/components/screen';
import { Brand } from '@/constants/brand';
import { getProducts, type MobileProduct } from '@/lib/products';

export default function ProductsScreen() {
  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    getProducts().then((nextProducts) => {
      if (active) {
        setProducts(nextProducts);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function refreshProducts() {
    setRefreshing(true);
    setProducts(await getProducts());
    setRefreshing(false);
  }

  return (
    <Screen>
      <BrandHeader />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.orange} size="large" />
        </View>
      ) : (
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.content}
          data={products}
          keyExtractor={(product) => product.id}
          ListHeaderComponent={
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>SHOP SKINCARE</Text>
              <Text style={styles.title}>Products</Text>
              <Text style={styles.subtitle}>
                Vitamin C essentials for bright, hydrated, healthy-looking skin.
              </Text>
            </View>
          }
          numColumns={2}
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                void refreshProducts();
              }}
              refreshing={refreshing}
              tintColor={Brand.orange}
            />
          }
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  eyebrow: {
    color: Brand.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heading: {
    gap: 8,
    paddingBottom: 10,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    gap: 12,
  },
  subtitle: {
    color: Brand.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: Brand.darkGreen,
    fontSize: 32,
    fontWeight: '800',
  },
});
