import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { getModulesByCategory, type Module } from '@/lib/modules';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { lightColors } from '@/lib/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';

function ModuleCard({ module }: { module: Module }) {
  const router = useRouter();

  const iconMap: Record<string, any> = {
    thermometer: { lib: Ionicons, name: 'thermometer-outline' },
    wrench: { lib: Ionicons, name: 'build-outline' },
    home: { lib: Ionicons, name: 'home-outline' },
    building: { lib: Ionicons, name: 'business-outline' },
  };

  const iconData = iconMap[module.icon] || { lib: MaterialCommunityIcons, name: 'package-variant' };
  const IconLib = iconData.lib;

  // Route mapping for implemented modules
  const getModuleRoute = (id: string) => {
    const routes: Record<string, string> = {
      'bar-th-171': '/bar-th-171',
    };
    return routes[id] || `/modules/${id}`;
  };

  const handlePress = () => {
    const route = getModuleRoute(module.id);
    router.push(route as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={{
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{
        height: 56,
        width: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: 'rgba(139, 26, 43, 0.1)',
        marginRight: 16,
      }}>
        <IconLib name={iconData.name} size={28} color={lightColors.primary} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1a1f2e' }}>
          {module.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: '#64748b',
            backgroundColor: '#f1f5f9',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
            textTransform: 'uppercase',
          }}>
            {module.code}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748B" />
    </TouchableOpacity>
  );
}

export default function ModulesPage() {
  const particulierModules = getModulesByCategory('PARTICULIER');
  const professionnelModules = getModulesByCategory('PROFESSIONNEL');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground mb-2">Tableau de bord</Text>
          <Text className="text-base text-muted-foreground leading-relaxed">
            Sélectionnez un module pour commencer{'\n'}votre étude énergétique.
          </Text>
        </View>

        {particulierModules.length > 0 && (
          <View className="mb-10">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="h-8 w-1 bg-primary rounded-full" />
              <Text className="text-xl font-bold text-foreground">Particulier</Text>
            </View>
            <View>
              {particulierModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </View>
          </View>
        )}

        {professionnelModules.length > 0 && (
          <View className="mb-10">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="h-8 w-1 bg-[#2D3748] rounded-full" />
              <Text className="text-xl font-bold text-foreground">Professionnel</Text>
            </View>
            <View>
              {professionnelModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </View>
          </View>
        )}

        {particulierModules.length === 0 && professionnelModules.length === 0 && (
          <View className="items-center py-20 bg-card rounded-3xl border border-dashed border-border gap-4">
            <Ionicons name="folder-open-outline" size={64} color={lightColors.mutedForeground} />
            <Text className="text-base text-muted-foreground text-center px-10">
              Aucun module n'a été configuré pour votre compte.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
