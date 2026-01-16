import React, { useState } from 'react';
import { View, ScrollView, Alert, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Réglages</Text>
        <Text style={styles.subtitle}>
          Gérez vos préférences et votre compte.
        </Text>
      </View>

      {/* Section Profil */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account" size={24} color={lightColors.primary} />
          <Text style={styles.sectionTitle}>Profil</Text>
        </View>
        <View style={styles.divider} />
        {user && (
          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
            {user.full_name && (
              <View style={styles.profileRow}>
                <Text style={styles.label}>Nom complet</Text>
                <Text style={styles.value}>{user.full_name}</Text>
              </View>
            )}
            {user.role && (
              <View style={styles.profileRow}>
                <Text style={styles.label}>Rôle</Text>
                <Text style={styles.value}>{user.role}</Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Section Apparence */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="palette" size={24} color={lightColors.primary} />
          <Text style={styles.sectionTitle}>Apparence</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Mode sombre</Text>
            <Text style={styles.settingDescription}>
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
      </Card>

      {/* Section Compte */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="cog" size={24} color={lightColors.primary} />
          <Text style={styles.sectionTitle}>Compte</Text>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <MaterialCommunityIcons name="logout" size={20} color={lightColors.destructive} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </Card>

      {/* Version info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>PowerCEE Mobile v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: lightColors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: lightColors.mutedForeground,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: lightColors.cardForeground,
  },
  divider: {
    height: 1,
    backgroundColor: lightColors.border,
    marginBottom: 12,
  },
  profileInfo: {
    gap: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: lightColors.mutedForeground,
    opacity: 0.7,
  },
  value: {
    fontSize: 16,
    color: lightColors.cardForeground,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: lightColors.cardForeground,
  },
  settingDescription: {
    fontSize: 14,
    color: lightColors.mutedForeground,
    marginTop: 4,
    opacity: 0.7,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: lightColors.destructive,
    fontWeight: '500',
  },
  footer: {
    marginTop: 24,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: lightColors.mutedForeground,
    textAlign: 'center',
  },
});
