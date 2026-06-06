import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/brand';

export function BrandHeader() {
  return (
    <View style={styles.header}>
      <Image
        contentFit="contain"
        source={require('@/assets/images/harmonylab/logo-final.png')}
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: Brand.cream,
    borderBottomColor: '#e8dfd1',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logo: {
    height: 38,
    width: 205,
  },
});
