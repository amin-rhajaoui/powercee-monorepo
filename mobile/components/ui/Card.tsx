import React from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { lightColors } from '@/lib/colors';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export function Card({
  children,
  title,
  description,
  header,
  footer,
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        style,
      ]}
    >
      {(header || title || description) && (
        <View style={styles.header}>
          {header || (
            <>
              {title && (
                <Text style={styles.title}>
                  {title}
                </Text>
              )}
              {description && (
                <Text style={styles.description}>
                  {description}
                </Text>
              )}
            </>
          )}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
      {footer && (
        <View style={styles.footer}>
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: lightColors.cardForeground,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: lightColors.mutedForeground,
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
