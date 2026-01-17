import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface TabItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const tabs: TabItem[] = [
  {
    name: 'modules',
    label: 'Modules',
    icon: 'grid-outline',
    activeIcon: 'grid',
    route: '/(app)/modules',
  },
  {
    name: 'clients',
    label: 'Clients',
    icon: 'people-outline',
    activeIcon: 'people',
    route: '/(app)/clients',
  },
  {
    name: 'settings',
    label: 'Réglages',
    icon: 'settings-outline',
    activeIcon: 'settings',
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

  return (
    <View
      className="flex-row border-t border-border bg-card shadow-lg"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        paddingTop: 12,
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            className="flex-1 items-center justify-center gap-1"
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={24}
              color={active ? lightColors.primary : '#64748B'} // muted-foreground
            />
            <Text
              className={cn(
                "text-[10px] font-medium",
                active ? "text-primary font-bold" : "text-muted-foreground"
              )}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {active && <View className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
