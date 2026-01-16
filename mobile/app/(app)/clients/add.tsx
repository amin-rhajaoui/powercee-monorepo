import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RadioGroup } from '@/components/ui/Select';
import { clientCreateSchema, clientTypeOptions, type ClientFormValues } from '@/lib/schemas/client';
import { createClient } from '@/lib/api/clients';

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
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-foreground mb-2">Nouveau client</Text>
            <Text className="text-base text-muted-foreground">
              Ajoutez un nouveau client à votre base de données.
            </Text>
          </View>

          <View className="gap-6">
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <RadioGroup
                  label="Type de client"
                  value={value}
                  options={clientTypeOptions}
                  onValueChange={onChange}
                  className="mb-2"
                />
              )}
            />

            {clientType === 'PARTICULIER' ? (
              <View className="gap-6">
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
              </View>
            ) : (
              <View className="gap-6">
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
              </View>
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

            <View className="flex-row gap-4 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => router.back()}
                disabled={isSubmitting}
                label="Annuler"
              />
              <Button
                variant="default"
                className="flex-1"
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                loading={isSubmitting}
                label="Créer"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
