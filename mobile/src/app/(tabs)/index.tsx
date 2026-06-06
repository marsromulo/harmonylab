import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Screen } from '@/components/screen';
import { Brand } from '@/constants/brand';

const benefits = [
  ['BRIGHTEN', 'Improve dull and uneven-looking skin.'],
  ['HYDRATE', 'Support soft, comfortable skin all day.'],
  ['PROTECT', 'Help maintain a healthy-looking barrier.'],
];

export default function HomeScreen() {
  return (
    <Screen>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image
            contentFit="cover"
            source={require('@/assets/images/harmonylab/hero-bg.jpg')}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlay} />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>VITAMIN C SKINCARE</Text>
            <Text style={styles.title}>Glow Naturally,{'\n'}Everyday.</Text>
            <Text style={styles.lead}>
              Brightening skincare essentials designed for healthier, radiant-looking skin.
            </Text>
            <Pressable onPress={() => router.push('/products')} style={styles.button}>
              <Text style={styles.buttonText}>SHOP NOW</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.benefits}>
          {benefits.map(([title, text]) => (
            <View key={title} style={styles.benefit}>
              <Text style={styles.benefitTitle}>{title}</Text>
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.about}>
          <Image
            contentFit="cover"
            source={require('@/assets/images/harmonylab/about-us-banner.png')}
            style={styles.aboutImage}
          />
          <Text style={styles.aboutEyebrow}>ABOUT HARMONY LAB</Text>
          <Text style={styles.aboutTitle}>Skincare that cares for your natural beauty.</Text>
          <Text style={styles.aboutText}>
            High-quality ingredients and thoughtful daily care, created to brighten, hydrate, and
            protect.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  about: {
    backgroundColor: Brand.white,
    borderRadius: 20,
    gap: 10,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  aboutEyebrow: {
    color: Brand.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    paddingHorizontal: 18,
  },
  aboutImage: {
    height: 170,
    width: '100%',
  },
  aboutText: {
    color: Brand.muted,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 18,
  },
  aboutTitle: {
    color: Brand.darkGreen,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    paddingHorizontal: 18,
  },
  benefit: {
    backgroundColor: Brand.lightGreen,
    borderRadius: 16,
    flex: 1,
    gap: 5,
    minWidth: 105,
    padding: 14,
  },
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  benefitText: {
    color: Brand.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  benefitTitle: {
    color: Brand.darkGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Brand.orange,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  buttonText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    gap: 18,
    padding: 16,
    paddingBottom: 32,
  },
  eyebrow: {
    color: Brand.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  hero: {
    borderRadius: 24,
    minHeight: 470,
    overflow: 'hidden',
  },
  heroCopy: {
    gap: 17,
    padding: 26,
    paddingTop: 48,
    width: '82%',
  },
  lead: {
    color: Brand.darkGreen,
    fontSize: 15,
    lineHeight: 23,
  },
  overlay: {
    bottom: 0,
    backgroundColor: 'rgba(251,246,237,0.38)',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  title: {
    color: Brand.darkGreen,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
});
