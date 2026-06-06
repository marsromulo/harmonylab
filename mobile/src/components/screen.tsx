import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, type ViewProps } from 'react-native';

import { Brand } from '@/constants/brand';

export function Screen({ style, ...props }: ViewProps) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, style]} {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Brand.cream,
    flex: 1,
  },
});
