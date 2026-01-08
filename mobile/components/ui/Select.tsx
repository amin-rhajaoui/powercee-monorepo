import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ViewStyle, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { lightColors } from '@/lib/colors';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  error?: string | boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

export function Select({
  label,
  placeholder = 'Sélectionner...',
  value,
  options,
  onValueChange,
  error = false,
  disabled = false,
  style,
}: SelectProps) {
  const [visible, setVisible] = useState(false);
  const hasError = Boolean(error);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
        style={[
          styles.select,
          hasError && styles.selectError,
          disabled && styles.selectDisabled,
        ]}
      >
        <Text
          style={[
            styles.selectText,
            !selectedOption && styles.selectTextPlaceholder,
          ]}
        >
          {displayText}
        </Text>
        <Icon
          name="chevron-down"
          size={20}
          color={hasError ? lightColors.destructive : lightColors.mutedForeground}
        />
      </TouchableOpacity>

      {hasError && typeof error === 'string' && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Sélectionner'}
              </Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Icon name="close" size={24} color={lightColors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onValueChange(option.value);
                    setVisible(false);
                  }}
                  style={[
                    styles.option,
                    value === option.value && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: lightColors.foreground,
    marginBottom: 8,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: lightColors.input,
    backgroundColor: lightColors.background,
    minHeight: 48,
  },
  selectError: {
    borderColor: lightColors.destructive,
  },
  selectDisabled: {
    opacity: 0.5,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: lightColors.foreground,
  },
  selectTextPlaceholder: {
    color: lightColors.mutedForeground,
  },
  errorText: {
    fontSize: 12,
    color: lightColors.destructive,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: lightColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightColors.cardForeground,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  optionSelected: {
    backgroundColor: `${lightColors.primary}1A`,
  },
  optionText: {
    fontSize: 16,
    color: lightColors.cardForeground,
  },
  optionTextSelected: {
    color: lightColors.primary,
    fontWeight: '600',
  },
});
