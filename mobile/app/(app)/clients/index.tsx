import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/lib/colors';
import { listClients, type Client } from '@/lib/api/clients';
import { Button } from '@/components/ui/Button';

function ClientCard({ client }: { client: Client }) {
  const router = useRouter();

  const getClientName = () => {
    if (client.type === 'PARTICULIER') {
      return `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email;
    } else {
      return client.company_name || client.email;
    }
  };

  const getClientSubtitle = () => {
    if (client.type === 'PARTICULIER') {
      return client.email;
    } else {
      return client.contact_name || client.email;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className="mb-4"
    >
      <View className="flex-row items-center bg-card rounded-2xl border border-border p-4 shadow-sm">
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mr-4">
          <Ionicons
            name={client.type === 'PARTICULIER' ? 'person-outline' : 'business-outline'}
            size={28}
            color={lightColors.primary}
          />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-foreground">
            {getClientName()}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {getClientSubtitle()}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <View className={`px-2 py-0.5 rounded ${
              client.type === 'PARTICULIER' ? 'bg-primary/10' : 'bg-[#2D3748]/10'
            }`}>
              <Text className={`text-xs font-bold ${
                client.type === 'PARTICULIER' ? 'text-primary' : 'text-[#2D3748]'
              }`}>
                {client.type === 'PARTICULIER' ? 'Particulier' : 'Professionnel'}
              </Text>
            </View>
            {client.phone && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="call-outline" size={12} color={lightColors.mutedForeground} />
                <Text className="text-xs text-muted-foreground">{client.phone}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = async (refreshing = false) => {
    try {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const response = await listClients({
        page_size: 100,
        sort_by: 'created_at',
        sort_dir: 'desc',
      });
      
      setClients(response.items);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des clients');
      console.error('Error loading clients:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const particulierClients = clients.filter(c => c.type === 'PARTICULIER');
  const professionnelClients = clients.filter(c => c.type === 'PROFESSIONNEL');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadClients(true)}
            tintColor={lightColors.primary}
          />
        }
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground mb-2">Clients</Text>
          <Text className="text-base text-muted-foreground leading-relaxed">
            Gérez vos clients et ajoutez-en de nouveaux.
          </Text>
        </View>

        {isLoading && !isRefreshing ? (
          <View className="items-center py-20">
            <Text className="text-base text-muted-foreground">Chargement...</Text>
          </View>
        ) : error ? (
          <View className="items-center py-20 bg-card rounded-3xl border border-dashed border-border gap-4">
            <Ionicons name="alert-circle-outline" size={64} color={lightColors.destructive} />
            <Text className="text-base text-muted-foreground text-center px-10">
              {error}
            </Text>
            <Button
              variant="outline"
              label="Réessayer"
              className="mt-4"
              onPress={() => loadClients()}
            />
          </View>
        ) : clients.length === 0 ? (
          <View className="items-center py-20 bg-card rounded-3xl border border-dashed border-border gap-4">
            <Ionicons name="people-outline" size={64} color={lightColors.mutedForeground} />
            <Text className="text-base text-muted-foreground text-center px-10">
              Aucun client n'a encore été créé.
            </Text>
            <Button
              variant="default"
              label="Ajouter un client"
              className="mt-4"
              onPress={() => router.push('/(app)/clients/add')}
            />
          </View>
        ) : (
          <>
            {particulierClients.length > 0 && (
              <View className="mb-10">
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="h-8 w-1 bg-primary rounded-full" />
                  <Text className="text-xl font-bold text-foreground">Particuliers</Text>
                  <Text className="text-sm text-muted-foreground">({particulierClients.length})</Text>
                </View>
                <View>
                  {particulierClients.map((client) => (
                    <ClientCard key={client.id} client={client} />
                  ))}
                </View>
              </View>
            )}

            {professionnelClients.length > 0 && (
              <View className="mb-10">
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="h-8 w-1 bg-[#2D3748] rounded-full" />
                  <Text className="text-xl font-bold text-foreground">Professionnels</Text>
                  <Text className="text-sm text-muted-foreground">({professionnelClients.length})</Text>
                </View>
                <View>
                  {professionnelClients.map((client) => (
                    <ClientCard key={client.id} client={client} />
                  ))}
                </View>
              </View>
            )}

            <View className="mt-4 mb-8">
              <Button
                variant="outline"
                label="Ajouter un nouveau client"
                onPress={() => router.push('/(app)/clients/add')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
