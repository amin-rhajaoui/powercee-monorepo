import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { getModulesByCategory, type Module } from '@/lib/modules';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { lightColors } from '@/lib/colors';

function ModuleCard({ module }: { module: Module }) {
  const router = useRouter();

  const iconMap: Record<string, string> = {
    thermometer: 'thermometer',
    wrench: 'wrench',
    home: 'home',
    building: 'office-building',
  };

  const iconName = iconMap[module.icon] || 'package-variant';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/modules/${module.id}` as any)}
      activeOpacity={0.7}
    >
      <Card style={styles.moduleCard}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Icon name={iconName} size={24} color={lightColors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            <Text style={styles.moduleCode}>{module.code}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function ModulesPage() {
  const particulierModules = getModulesByCategory('PARTICULIER');
  const professionnelModules = getModulesByCategory('PROFESSIONNEL');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Modules</Text>
        <Text style={styles.subtitle}>
          Accédez aux différents modules de calcul pour la rénovation énergétique.
        </Text>
      </View>

      {particulierModules.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="home" size={20} color={lightColors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Particulier</Text>
              <Text style={styles.sectionDescription}>
                Modules destinés aux particuliers
              </Text>
            </View>
          </View>
          <View>
            {particulierModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </View>
        </View>
      )}

      {professionnelModules.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="office-building" size={20} color={lightColors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Professionnel</Text>
              <Text style={styles.sectionDescription}>
                Modules destinés aux professionnels
              </Text>
            </View>
          </View>
          <View>
            {professionnelModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </View>
        </View>
      )}

      {particulierModules.length === 0 && professionnelModules.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Aucun module disponible pour le moment.
          </Text>
        </View>
      )}
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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${lightColors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: lightColors.foreground,
  },
  sectionDescription: {
    fontSize: 14,
    color: lightColors.mutedForeground,
    marginTop: 2,
  },
  moduleCard: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${lightColors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: lightColors.cardForeground,
    marginBottom: 4,
  },
  moduleCode: {
    fontSize: 12,
    color: lightColors.mutedForeground,
    fontFamily: 'monospace',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: lightColors.mutedForeground,
    textAlign: 'center',
  },
});
