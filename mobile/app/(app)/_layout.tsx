import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import { BottomTabs } from '@/components/navigation/BottomTabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightColors } from '@/lib/colors';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: lightColors.background }]}>
      <View
        style={{
          flex: 1,
          paddingTop: Math.max(insets.top, 0),
        }}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="modules" />
          <Stack.Screen name="clients" />
          <Stack.Screen name="settings" />
        </Stack>
      </View>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
