/**
 * Folder Detail Page
 * Shows folder details and documents for a completed BAR-TH-171 folder
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFolder, Folder } from '@/lib/api/folders';
import { api } from '@/lib/api';
import { Client } from '@/lib/api/clients';

// ============================================================================
// Status Labels
// ============================================================================

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
    IN_PROGRESS: { label: 'En cours', color: '#D97706', bgColor: '#FEF3C7' },
    CLOSED: { label: 'Clôturé', color: '#059669', bgColor: '#D1FAE5' },
    ARCHIVED: { label: 'Archivé', color: '#6B7280', bgColor: '#F3F4F6' },
};

// ============================================================================
// Component
// ============================================================================

export default function FolderDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [folder, setFolder] = useState<Folder | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFolder();
    }, [id]);

    const loadFolder = async () => {
        if (!id) return;

        setIsLoading(true);
        setError(null);
        try {
            const folderData = await getFolder(id);
            setFolder(folderData);

            // Load client info
            if (folderData.client_id) {
                try {
                    const clientData = await api.get<Client>(`/clients/${folderData.client_id}`);
                    setClient(clientData);
                } catch (e) {
                    console.error('Error loading client:', e);
                }
            }
        } catch (err) {
            console.error('Error loading folder:', err);
            setError('Impossible de charger le dossier');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getClientName = () => {
        if (!client) return '—';
        if (client.first_name || client.last_name) {
            return `${client.first_name || ''} ${client.last_name || ''}`.trim();
        }
        return client.company_name || client.email;
    };

    const statusInfo = folder ? STATUS_LABELS[folder.status] || STATUS_LABELS.IN_PROGRESS : STATUS_LABELS.IN_PROGRESS;

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#0066FF" />
                    <Text style={{ color: '#6B7280', marginTop: 16 }}>Chargement du dossier...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !folder) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                <View style={{ padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>Dossier</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                    <Text style={{ fontSize: 16, color: '#EF4444', marginTop: 16, textAlign: 'center' }}>
                        {error || 'Dossier non trouvé'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ marginTop: 20, backgroundColor: '#0066FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            {/* Header */}
            <View style={{ padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>
                        {folder.module_code}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>
                        {getClientName()}
                    </Text>
                </View>
                <View style={{ backgroundColor: statusInfo.bgColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                    <Text style={{ color: statusInfo.color, fontSize: 12, fontWeight: '600' }}>
                        {statusInfo.label}
                    </Text>
                </View>
            </View>

            {/* Content */}
            <ScrollView style={{ flex: 1, padding: 16 }}>
                {/* Info Card */}
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
                        Informations
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <Text style={{ color: '#6B7280' }}>Client</Text>
                        <Text style={{ color: '#1F2937', fontWeight: '500' }}>{getClientName()}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <Text style={{ color: '#6B7280' }}>Date de création</Text>
                        <Text style={{ color: '#1F2937', fontWeight: '500' }}>{formatDate(folder.created_at)}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <Text style={{ color: '#6B7280' }}>Dernière modification</Text>
                        <Text style={{ color: '#1F2937', fontWeight: '500' }}>{formatDate(folder.updated_at)}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                        <Text style={{ color: '#6B7280' }}>ID</Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{folder.id.slice(0, 8)}...</Text>
                    </View>
                </View>

                {/* Data Summary Card */}
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
                        Données du dossier
                    </Text>

                    {folder.data && Object.keys(folder.data).length > 0 ? (
                        <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                            {Object.entries(folder.data).map(([key, value]) => (
                                <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                                    <Text style={{ color: '#6B7280', fontSize: 13 }}>{key}</Text>
                                    <Text style={{ color: '#1F2937', fontSize: 13, maxWidth: '60%' }} numberOfLines={1}>
                                        {typeof value === 'object' ? '(objet)' : String(value)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune donnée disponible</Text>
                    )}
                </View>

                {/* Actions Card */}
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 32 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
                        Actions
                    </Text>

                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}
                        onPress={() => Alert.alert('Info', 'Export PDF bientôt disponible')}
                    >
                        <Ionicons name="document-text-outline" size={24} color="#0066FF" />
                        <Text style={{ color: '#0066FF', fontWeight: '500' }}>Exporter en PDF</Text>
                    </TouchableOpacity>

                    <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />

                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}
                        onPress={() => Alert.alert('Info', 'Partage bientôt disponible')}
                    >
                        <Ionicons name="share-outline" size={24} color="#0066FF" />
                        <Text style={{ color: '#0066FF', fontWeight: '500' }}>Partager</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
