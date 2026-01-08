import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { lightColors } from '@/lib/colors';

export interface ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  variant = 'contained',
  size = 'medium',
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled || loading ? 0.5 : 1,
    };

    if (variant === 'contained') {
      base.backgroundColor = lightColors.primary;
    } else if (variant === 'outlined') {
      base.borderWidth = 1;
      base.borderColor = lightColors.primary;
      base.backgroundColor = 'transparent';
    } else {
      base.backgroundColor = 'transparent';
    }

    if (size === 'small') {
      base.paddingHorizontal = 12;
      base.paddingVertical = 6;
    } else if (size === 'large') {
      base.paddingHorizontal = 24;
      base.paddingVertical = 12;
    } else {
      base.paddingHorizontal = 16;
      base.paddingVertical = 8;
    }

    if (fullWidth) {
      base.width = '100%';
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '500',
    };

    if (variant === 'contained') {
      base.color = lightColors.primaryForeground;
    } else {
      base.color = lightColors.primary;
    }

    if (size === 'small') {
      base.fontSize = 12;
    } else if (size === 'large') {
      base.fontSize = 16;
    } else {
      base.fontSize = 14;
    }

    return base;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'contained' ? lightColors.primaryForeground : lightColors.primary}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}
