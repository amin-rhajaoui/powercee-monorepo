import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { getModuleById } from '@/lib/modules';
import { lightColors } from '@/lib/colors';

export default function ModuleDetailPage() {
  const router = useRouter();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const module = moduleId ? getModuleById(moduleId) : undefined;

  if (!module) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Module non trouvé</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>{module.title}</Text>
      <Text style={styles.code}>{module.code}</Text>
      <Text style={styles.description}>{module.description}</Text>
      <Button
        variant="outlined"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        Retour
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: lightColors.foreground,
    marginBottom: 8,
  },
  code: {
    fontSize: 16,
    color: lightColors.mutedForeground,
    marginTop: 8,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  description: {
    fontSize: 18,
    color: lightColors.foreground,
    marginTop: 16,
    lineHeight: 24,
  },
  backButton: {
    marginTop: 24,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: lightColors.foreground,
  },
});
