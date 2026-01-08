import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightColors } from '@/lib/colors';

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>
              Commencez à gérer vos dossiers CEE dès aujourd'hui.
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View>
              <Controller
                control={control}
                name="full_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nom complet"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.full_name?.message}
                    autoCapitalize="words"
                  />
                )}
              />

              <Controller
                control={control}
                name="company_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Entreprise"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.company_name?.message}
                    autoCapitalize="words"
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email professionnel"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.passwordContainer}>
                    <Text style={styles.passwordLabel}>Mot de passe</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        placeholderTextColor={lightColors.mutedForeground}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                      >
                        <Icon
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={lightColors.mutedForeground}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>
                      8 caractères minimum.
                    </Text>
                    {errors.password && (
                      <Text style={styles.errorHelperText}>
                        {errors.password.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Button
                variant="contained"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                style={styles.submitButton}
              >
                Commencer l'essai gratuit
              </Button>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Déjà un compte ? </Text>
              <Button
                variant="text"
                onPress={() => router.push('/(auth)/login')}
                style={styles.linkButton}
              >
                Se connecter
              </Button>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: lightColors.cardForeground,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: lightColors.mutedForeground,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: `${lightColors.destructive}1A`,
    borderWidth: 1,
    borderColor: `${lightColors.destructive}33`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: lightColors.destructive,
  },
  passwordContainer: {
    marginBottom: 16,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: lightColors.foreground,
    marginBottom: 8,
  },
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: lightColors.input,
    backgroundColor: lightColors.background,
    color: lightColors.foreground,
    fontSize: 16,
    lineHeight: 20,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  helperText: {
    fontSize: 12,
    color: lightColors.mutedForeground,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorHelperText: {
    fontSize: 12,
    color: lightColors.destructive,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  submitButton: {
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
    fontSize: 14,
    color: lightColors.mutedForeground,
    opacity: 0.7,
  },
  linkButton: {
    padding: 0,
  },
});
