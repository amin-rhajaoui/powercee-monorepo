import React from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { lightColors } from '@/lib/colors';

interface TabItem {
  name: string;
  label: string;
  icon: string;
  route: string;
}

const tabs: TabItem[] = [
  {
    name: 'modules',
    label: 'Modules',
    icon: 'package-variant',
    route: '/(app)/modules',
  },
  {
    name: 'add-client',
    label: 'Ajouter client',
    icon: 'account-plus',
    route: '/(app)/clients/add',
  },
  {
    name: 'settings',
    label: 'Réglages',
    icon: 'cog',
    route: '/(app)/settings',
  },
];

export function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    return pathname === route || pathname?.startsWith(route + '/');
  };

  const safeAreaBottom = Math.max(insets.bottom, 0);
  const baseHeight = 56; // Hauteur de base pour la barre
  const paddingTop = 8;
  const totalHeight = baseHeight + paddingTop + safeAreaBottom;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: safeAreaBottom,
          paddingTop: paddingTop,
          minHeight: totalHeight,
        },
        Platform.OS === 'ios' && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Icon
              name={tab.icon}
              size={24}
              color={active ? lightColors.primary : lightColors.mutedForeground}
            />
            <Text
              style={[
                styles.label,
                { color: active ? lightColors.primary : lightColors.mutedForeground },
                active && styles.labelActive,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: lightColors.border,
    backgroundColor: lightColors.card,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 56,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: '100%',
  },
  labelActive: {
    fontWeight: '500',
  },
});
