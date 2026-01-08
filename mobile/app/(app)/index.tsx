import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Bienvenue sur PowerCEE
          </Text>
          {user && (
            <Text variant="bodyLarge" style={styles.subtitle}>
              Connecté en tant que {user.email}
            </Text>
          )}
          {user?.full_name && (
            <Text variant="bodyMedium" style={styles.name}>
              {user.full_name}
            </Text>
          )}
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.button}
            buttonColor="#d32f2f"
          >
            Déconnexion
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  name: {
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
  },
});
