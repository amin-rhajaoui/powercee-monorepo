import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { clientCreateSchema, clientTypeOptions, type ClientFormValues } from '@/lib/schemas/client';
import { createClient } from '@/lib/api/clients';
import { lightColors } from '@/lib/colors';

export default function AddClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: {
      type: 'PARTICULIER',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      contact_name: '',
    },
    mode: 'onChange',
  });

  const clientType = watch('type');

  const onSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      await createClient({
        type: values.type,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        company_name: values.company_name || undefined,
        contact_name: values.contact_name || undefined,
        email: values.email,
        phone: values.phone || undefined,
        agency_id: null,
      });
      
      Alert.alert('Succès', 'Client créé avec succès', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error?.message || 'Une erreur est survenue lors de la création du client'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Nouveau client</Text>
          <Text style={styles.subtitle}>
            Ajoutez un nouveau client à votre base de données.
          </Text>
        </View>

        <Card>
          <View>
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Type de client"
                  value={value}
                  options={clientTypeOptions}
                  onValueChange={onChange}
                  error={errors.type?.message}
                />
              )}
            />

            {clientType === 'PARTICULIER' && (
              <>
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Prénom"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.first_name?.message}
                      autoCapitalize="words"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="last_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Nom"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.last_name?.message}
                      autoCapitalize="words"
                    />
                  )}
                />
              </>
            )}

            {clientType === 'PROFESSIONNEL' && (
              <>
                <Controller
                  control={control}
                  name="company_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Raison sociale"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.company_name?.message}
                      autoCapitalize="words"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="contact_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Contact principal"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.contact_name?.message}
                      placeholder="Nom du contact"
                      autoCapitalize="words"
                    />
                  )}
                />
              </>
            )}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Téléphone"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                />
              )}
            />

            <View style={styles.actions}>
              <Button
                variant="outlined"
                onPress={() => router.back()}
                disabled={isSubmitting}
                style={styles.cancelButton}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                loading={isSubmitting}
                style={styles.submitButton}
              >
                Créer le client
              </Button>
            </View>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  scrollContent: {
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
