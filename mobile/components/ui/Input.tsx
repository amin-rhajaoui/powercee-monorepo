import React from 'react';
import { TextInput, Text, View, TextInputProps, ViewStyle, StyleSheet } from 'react-native';
import { lightColors } from '@/lib/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  containerStyle?: ViewStyle;
  className?: string;
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  className,
  style,
  ...props
}: InputProps) {
  const hasError = Boolean(error);

  return (
    <View style={[containerStyle, styles.container]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          hasError && styles.inputError,
          style,
        ]}
        placeholderTextColor={lightColors.mutedForeground}
        {...props}
      />
      {(hasError || helperText) && (
        <Text
          style={[
            styles.helperText,
            hasError ? styles.errorText : styles.infoText,
          ]}
        >
          {hasError ? (typeof error === 'string' ? error : '') : helperText}
        </Text>
      )}
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
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: lightColors.input,
    backgroundColor: lightColors.background,
    color: lightColors.foreground,
    fontSize: 16,
    lineHeight: 20,
  },
  inputError: {
    borderColor: lightColors.destructive,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    color: lightColors.destructive,
  },
  infoText: {
    color: lightColors.mutedForeground,
  },
});
