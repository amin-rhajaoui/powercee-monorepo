import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';

const registerSchema = z.object({
  company_name: z.string().min(2, { message: 'Le nom de l\'entreprise doit faire au moins 2 caractères' }),
  full_name: z.string().min(2, { message: 'Le nom complet doit faire au moins 2 caractères' }),
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(8, { message: 'Le mot de passe doit faire au moins 8 caractères' }),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      company_name: '',
      full_name: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: RegisterValues) {
    setIsLoading(true);
    setError(null);

    try {
      await register(values);
      router.replace('/(app)');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Une erreur est survenue lors de l\'inscription.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Créer un compte
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Commencez à gérer vos dossiers CEE dès aujourd'hui.
            </Text>

            {error && (
              <Card style={styles.errorCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.errorText}>
                    {error}
                  </Text>
                </Card.Content>
              </Card>
            )}

            <View style={styles.form}>
              <Controller
                control={control}
                name="full_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      label="Nom complet"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      error={!!errors.full_name}
                      style={styles.input}
                    />
                    {errors.full_name && (
                      <HelperText type="error" visible={!!errors.full_name}>
                        {errors.full_name.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="company_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      label="Entreprise"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      error={!!errors.company_name}
                      style={styles.input}
                    />
                    {errors.company_name && (
                      <HelperText type="error" visible={!!errors.company_name}>
                        {errors.company_name.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      label="Email professionnel"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      error={!!errors.email}
                      style={styles.input}
                    />
                    {errors.email && (
                      <HelperText type="error" visible={!!errors.email}>
                        {errors.email.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      label="Mot de passe"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      error={!!errors.password}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? 'eye-off' : 'eye'}
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                      style={styles.input}
                    />
                    <HelperText type="info" visible={true}>
                      8 caractères minimum.
                    </HelperText>
                    {errors.password && (
                      <HelperText type="error" visible={!!errors.password}>
                        {errors.password.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
              >
                Commencer l'essai gratuit
              </Button>
            </View>

            <View style={styles.footer}>
              <Text variant="bodySmall" style={styles.footerText}>
                Déjà un compte ?{' '}
              </Text>
              <Button
                mode="text"
                onPress={() => router.push('/(auth)/login')}
                compact
              >
                Se connecter
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    opacity: 0.7,
  },
});
