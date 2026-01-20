import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { listModuleDrafts, ModuleDraft, deleteModuleDraft } from '@/lib/api/moduleDrafts';
import { listFolders, Folder } from '@/lib/api/folders';
import { api } from '@/lib/api';
import { Client } from '@/lib/api/clients';

const MODULE_CODE = 'BAR-TH-175';
const STEP_LABELS = ['Foyer', 'Logement', 'Documents', 'Visite Technique'];

type TabType = 'drafts' | 'folders';

interface ModuleOverviewProps {
    onNewDraft: () => void;
}

export function ModuleOverview({ onNewDraft }: ModuleOverviewProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('drafts');
    const [drafts, setDrafts] = useState<ModuleDraft[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});
    const [refreshing, setRefreshing] = useState(false);

    const loadDrafts = async () => {
        setIsLoadingDrafts(true);
        try {
            const result = await listModuleDrafts({ module_code: MODULE_CODE });
            const activeDrafts = result.items.filter((d) => !d.archived_at);
            setDrafts(activeDrafts);

            // Load client names
            const clientIds = [...new Set(activeDrafts.filter((d) => d.client_id).map((d) => d.client_id!))];
            await loadClients(clientIds);
        } catch (error) {
            console.error('Error loading drafts:', error);
        } finally {
            setIsLoadingDrafts(false);
        }
    };

    const loadFolders = async () => {
        setIsLoadingFolders(true);
        try {
            const result = await listFolders({ module_code: MODULE_CODE });
            setFolders(result.items);

            // Load client names
            const clientIds = [...new Set(result.items.map((f) => f.client_id))];
            await loadClients(clientIds);
        } catch (error) {
            console.error('Error loading folders:', error);
        } finally {
            setIsLoadingFolders(false);
        }
    };

    const loadClients = async (clientIds: string[]) => {
        const newClientsMap = { ...clientsMap };
        await Promise.all(
            clientIds.map(async (clientId) => {
                if (!newClientsMap[clientId]) {
                    try {
                        const client = await api.get<Client>(`/clients/${clientId}`);
                        newClientsMap[clientId] = client;
                    } catch {
                        // Ignore
                    }
                }
            })
        );
        setClientsMap(newClientsMap);
    };

    useEffect(() => {
        loadDrafts();
        loadFolders();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadDrafts(), loadFolders()]);
        setRefreshing(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const getClientName = (clientId: string | null) => {
        if (!clientId) return '—';
        const client = clientsMap[clientId];
        if (!client) return '—';
        if (client.first_name || client.last_name) {
            return `${client.first_name || ''} ${client.last_name || ''}`.trim();
        }
        return client.company_name || client.email;
    };

    const handleDeleteDraft = async (id: string) => {
        Alert.alert(
            "Supprimer le brouillon",
            "Êtes-vous sûr de vouloir supprimer ce brouillon ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteModuleDraft(id);
                            setDrafts(prev => prev.filter(d => d.id !== id));
                        } catch (error) {
                            console.error("Erreur suppression:", error);
                            Alert.alert("Erreur", "Impossible de supprimer le brouillon");
                        }
                    }
                }
            ]
        );
    };

    const renderDraftItem = ({ item }: { item: ModuleDraft }) => (
        <View className="bg-white rounded-xl mb-3 border border-gray-100 flex-row overflow-hidden">
            <TouchableOpacity
                onPress={() => router.push(`/(app)/bar-th-175?draftId=${item.id}`)}
                className="flex-1 p-4"
                activeOpacity={0.7}
            >
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-semibold text-gray-900" numberOfLines={1}>
                        {getClientName(item.client_id)}
                    </Text>
                    <View className="bg-blue-50 px-2 py-1 rounded">
                        <Text className="text-blue-700 text-xs font-medium">
                            Étape {item.current_step}/{STEP_LABELS.length}
                        </Text>
                    </View>
                </View>
                <View className="flex-row items-center justify-between">
                    <Text className="text-gray-500 text-sm">Créé le {formatDate(item.created_at)}</Text>
                    <View className="flex-row items-center">
                        <Ionicons name="create-outline" size={16} color="#0066FF" />
                        <Text className="text-primary text-sm ml-1">Continuer</Text>
                    </View>
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => handleDeleteDraft(item.id)}
                className="bg-red-50 w-16 justify-center items-center border-l border-red-100"
                activeOpacity={0.7}
            >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    const renderFolderItem = ({ item }: { item: Folder }) => (
        <TouchableOpacity
            onPress={() => router.push(`/(app)/folders/${item.id}`)}
            className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
            activeOpacity={0.7}
        >
            <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold text-gray-900" numberOfLines={1}>
                    {getClientName(item.client_id)}
                </Text>
                <View className={`px-2 py-1 rounded ${item.status === 'IN_PROGRESS' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Text className={`text-xs font-medium ${item.status === 'IN_PROGRESS' ? 'text-green-700' : 'text-gray-600'}`}>
                        {item.status === 'IN_PROGRESS' ? 'En cours' : item.status === 'CLOSED' ? 'Clos' : 'Archivé'}
                    </Text>
                </View>
            </View>
            <View className="flex-row items-center justify-between">
                <Text className="text-gray-500 text-sm">Créé le {formatDate(item.created_at)}</Text>
                <View className="flex-row items-center">
                    <Ionicons name="eye-outline" size={16} color="#6B7280" />
                    <Text className="text-gray-600 text-sm ml-1">Voir</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900">BAR-TH-175</Text>
                        <Text className="text-sm text-gray-500">Rénovation d'ampleur d'un appartement</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row px-4 py-3 bg-white border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => setActiveTab('drafts')}
                    className={`flex-1 py-2 items-center border-b-2 ${activeTab === 'drafts' ? 'border-primary' : 'border-transparent'}`}
                >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="document-text-outline" size={18} color={activeTab === 'drafts' ? '#0066FF' : '#6B7280'} />
                        <Text className={`font-medium ${activeTab === 'drafts' ? 'text-primary' : 'text-gray-500'}`}>
                            Brouillons
                        </Text>
                        {drafts.length > 0 && (
                            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                                <Text className="text-primary text-xs font-medium">{drafts.length}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('folders')}
                    className={`flex-1 py-2 items-center border-b-2 ${activeTab === 'folders' ? 'border-primary' : 'border-transparent'}`}
                >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="folder-outline" size={18} color={activeTab === 'folders' ? '#0066FF' : '#6B7280'} />
                        <Text className={`font-medium ${activeTab === 'folders' ? 'text-primary' : 'text-gray-500'}`}>
                            Dossiers
                        </Text>
                        {folders.length > 0 && (
                            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                                <Text className="text-primary text-xs font-medium">{folders.length}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'drafts' ? (
                isLoadingDrafts ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0066FF" />
                    </View>
                ) : drafts.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                        <Text className="text-gray-500 mt-4 text-center">Aucun brouillon en cours</Text>
                        <Button label="Créer un brouillon" onPress={onNewDraft} className="mt-6" />
                    </View>
                ) : (
                    <FlatList
                        data={drafts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderDraftItem}
                        contentContainerStyle={{ padding: 16 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    />
                )
            ) : isLoadingFolders ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0066FF" />
                </View>
            ) : folders.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="folder-outline" size={64} color="#D1D5DB" />
                    <Text className="text-gray-500 mt-4 text-center">Aucun dossier pour ce module</Text>
                </View>
            ) : (
                <FlatList
                    data={folders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderFolderItem}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}

            {/* FAB for new draft */}
            {activeTab === 'drafts' && drafts.length > 0 && (
                <TouchableOpacity
                    onPress={onNewDraft}
                    className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}
