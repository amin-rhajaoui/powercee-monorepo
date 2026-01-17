import React, { useState } from 'react';
import { View, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { lightColors } from '@/lib/colors';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false); // TODO: Implémenter la gestion du thème

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground mb-2">Réglages</Text>
          <Text className="text-base text-muted-foreground leading-relaxed">
            Gérez vos préférences et votre compte.
          </Text>
        </View>

        {/* Section Profil */}
        <View className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
          <View className="flex-row items-center gap-3 mb-4">
            <MaterialCommunityIcons name="account" size={24} color={lightColors.primary} />
            <Text className="text-xl font-semibold text-card-foreground">Profil</Text>
          </View>
          <View className="h-[1px] bg-border mb-4" />
          {user && (
            <View className="gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-base text-muted-foreground opacity-70">Email</Text>
                <Text className="text-base text-card-foreground">{user.email}</Text>
              </View>
              {user.full_name && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-muted-foreground opacity-70">Nom complet</Text>
                  <Text className="text-base text-card-foreground">{user.full_name}</Text>
                </View>
              )}
              {user.role && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-muted-foreground opacity-70">Rôle</Text>
                  <Text className="text-base text-card-foreground">{user.role}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section Apparence */}
        <View className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
          <View className="flex-row items-center gap-3 mb-4">
            <MaterialCommunityIcons name="palette" size={24} color={lightColors.primary} />
            <Text className="text-xl font-semibold text-card-foreground">Apparence</Text>
          </View>
          <View className="h-[1px] bg-border mb-4" />
          <View className="flex-row justify-between items-center py-1">
            <View className="flex-1 mr-4">
              <Text className="text-base font-medium text-card-foreground">Mode sombre</Text>
              <Text className="text-sm text-muted-foreground mt-1 opacity-70">
                Activer le thème sombre
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#CBD5E1', true: lightColors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section Compte */}
        <View className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
          <View className="flex-row items-center gap-3 mb-4">
            <MaterialCommunityIcons name="cog" size={24} color={lightColors.primary} />
            <Text className="text-xl font-semibold text-card-foreground">Compte</Text>
          </View>
          <View className="h-[1px] bg-border mb-4" />
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center gap-3 py-4"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={20} color={lightColors.destructive} />
            <Text className="text-base text-destructive font-medium">Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/* Version info */}
        <View className="mt-6 mb-4">
          <Text className="text-xs text-muted-foreground text-center">PowerCEE Mobile v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

