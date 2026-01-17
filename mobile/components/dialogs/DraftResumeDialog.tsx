/**
 * DraftResumeDialog Component
 * Dialog shown when an existing draft is found for the selected client
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModuleDraft } from '@/lib/api/moduleDrafts';

// ============================================================================
// Types
// ============================================================================

interface DraftResumeDialogProps {
    visible: boolean;
    onClose: () => void;
    existingDraft: ModuleDraft | null;
    onResume: () => void;
    onNew: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function DraftResumeDialog({
    visible,
    onClose,
    existingDraft,
    onResume,
    onNew,
}: DraftResumeDialogProps) {
    if (!existingDraft) return null;

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 items-center justify-center px-6">
                <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                    {/* Icon */}
                    <View className="items-center mb-4">
                        <View className="w-16 h-16 rounded-full bg-amber-100 items-center justify-center">
                            <Ionicons name="document-text" size={32} color="#F59E0B" />
                        </View>
                    </View>

                    {/* Title */}
                    <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                        Brouillon existant
                    </Text>

                    {/* Description */}
                    <Text className="text-gray-600 text-center mb-4">
                        Un brouillon existe déjà pour ce client, créé le{' '}
                        {formatDate(existingDraft.created_at)}.
                    </Text>

                    {/* Draft info */}
                    <View className="bg-gray-50 rounded-xl p-4 mb-6">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-gray-500 text-sm">Étape actuelle</Text>
                            <View className="bg-primary/10 px-2 py-1 rounded">
                                <Text className="text-primary font-medium text-sm">
                                    {existingDraft.current_step}/4
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center justify-between">
                            <Text className="text-gray-500 text-sm">Dernière modification</Text>
                            <Text className="text-gray-700 text-sm">
                                {formatDate(existingDraft.updated_at)}
                            </Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View className="gap-3">
                        <TouchableOpacity
                            onPress={onResume}
                            className="bg-primary py-3 rounded-xl items-center"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-semibold">Reprendre ce brouillon</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onNew}
                            className="bg-gray-100 py-3 rounded-xl items-center"
                            activeOpacity={0.8}
                        >
                            <Text className="text-gray-700 font-medium">Créer un nouveau</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            className="py-2 items-center"
                            activeOpacity={0.8}
                        >
                            <Text className="text-gray-500">Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
