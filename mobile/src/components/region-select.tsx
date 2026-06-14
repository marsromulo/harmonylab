import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';

const regionOptions = ['Hong Kong', 'Kowloon', 'New Territories'];

export function RegionSelect({
  hasError = false,
  onChange,
  value,
}: {
  hasError?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityLabel="Region"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.select, hasError && styles.selectError]}>
        <Text style={value ? styles.value : styles.placeholder}>{value || 'Select'}</Text>
        <Ionicons color={Brand.muted} name="chevron-down" size={18} />
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}>
        <View style={styles.modal}>
          <Pressable
            accessibilityLabel="Close region selector"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheet}>
            <Text style={styles.title}>Select region</Text>
            {regionOptions.map((region) => (
              <Pressable
                key={region}
                onPress={() => {
                  onChange(region);
                  setOpen(false);
                }}
                style={[styles.option, value === region && styles.optionSelected]}>
                <Text style={styles.optionText}>{region}</Text>
                {value === region ? (
                  <Ionicons color={Brand.orange} name="checkmark" size={20} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'rgba(18, 63, 52, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  option: {
    alignItems: 'center',
    borderTopColor: '#e5dbcc',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 4,
  },
  optionSelected: {
    backgroundColor: '#fff7f1',
  },
  optionText: {
    color: Brand.darkGreen,
    fontSize: 16,
    fontWeight: '700',
  },
  placeholder: {
    color: '#929a94',
    fontSize: 15,
  },
  select: {
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderColor: '#e5dbcc',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 15,
  },
  selectError: {
    borderColor: '#c83d2c',
  },
  sheet: {
    backgroundColor: Brand.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    color: Brand.darkGreen,
    fontSize: 18,
    fontWeight: '800',
    paddingBottom: 14,
  },
  value: {
    color: Brand.darkGreen,
    fontSize: 15,
  },
});
