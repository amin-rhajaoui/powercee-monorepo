import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Navigate to app
      router.replace('/(app)');
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center gap-8 py-10">
            {/* Header / Logo Area */}
            <View className="items-center gap-2">
              {/* Placeholder for Logo if image exists, otherwise text */}
              <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Text className="text-3xl font-bold text-primary">P</Text>
              </View>
              <Text className="text-3xl font-bold text-foreground">PowerCee</Text>
              <Text className="text-center text-base text-muted-foreground">
                L'outil des techniciens pour simplifier{'\n'}vos dossiers CEE sur le terrain.
              </Text>
            </View>

            {/* Form Area using VStack (gap-6) */}
            <View className="gap-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
              <Input
                label="Email"
                placeholder="technicien@powercee.fr"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              <View>
                <Input
                  label="Mot de passe"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <Button
                  variant="link"
                  label="Mot de passe oublié ?"
                  className="self-end"
                />
              </View>

              <Button
                label="Se connecter"
                onPress={handleLogin}
                loading={loading}
                className="mt-2"
              />
            </View>

            {/* Footer */}
            <View className="items-center">
              <Text className="text-sm text-muted-foreground">
                Pas encore de compte ?
              </Text>
              <Button
                variant="link"
                label="Contacter votre administrateur"
                onPress={() => { }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
