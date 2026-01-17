/**
 * FileUpload Component
 * Handles PDF and image file uploads using expo-document-picker and expo-image-picker
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadDocument, uploadImage, UploadResponse } from '@/lib/api/upload';

// ============================================================================
// Types
// ============================================================================

interface FileUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onFileChange?: (file: { uri: string; name: string; type: string } | null) => void;
    label?: string;
    accept?: 'pdf' | 'image' | 'any';
    maxSizeMB?: number;
    disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FileUpload({
    value,
    onChange,
    onFileChange,
    label = 'Choisir un fichier',
    accept = 'pdf',
    maxSizeMB = 10,
    disabled = false,
}: FileUploadProps) {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleDocumentPick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: accept === 'pdf' ? 'application/pdf' : accept === 'image' ? 'image/*' : '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];

            // Validate size
            if (file.size && file.size > maxSizeMB * 1024 * 1024) {
                Alert.alert('Erreur', `Le fichier est trop volumineux (max ${maxSizeMB}Mo).`);
                return;
            }

            setFileName(file.name);

            if (onFileChange) {
                onFileChange({
                    uri: file.uri,
                    name: file.name,
                    type: file.mimeType || 'application/octet-stream',
                });
            }

            // Upload immediately
            setIsUploading(true);
            try {
                const response = await uploadDocument({
                    uri: file.uri,
                    name: file.name,
                    mimeType: file.mimeType,
                });
                onChange(response.url);
            } catch (error) {
                console.error('Upload error:', error);
                Alert.alert('Erreur', 'Erreur lors du téléversement du fichier');
                setFileName(null);
                if (onFileChange) onFileChange(null);
            } finally {
                setIsUploading(false);
            }
        } catch (error) {
            console.error('Document picker error:', error);
            Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
        }
    };

    const handleImagePick = async (useCamera: boolean) => {
        try {
            // Request permissions
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire');
                    return;
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire');
                    return;
                }
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                });

            if (result.canceled) return;

            const image = result.assets[0];
            const imageName = image.fileName || `photo_${Date.now()}.jpg`;

            setFileName(imageName);

            if (onFileChange) {
                onFileChange({
                    uri: image.uri,
                    name: imageName,
                    type: image.mimeType || 'image/jpeg',
                });
            }

            // Upload immediately
            setIsUploading(true);
            try {
                const response = await uploadImage({
                    uri: image.uri,
                    fileName: imageName,
                    mimeType: image.mimeType,
                });
                onChange(response.url);
            } catch (error) {
                console.error('Upload error:', error);
                Alert.alert('Erreur', 'Erreur lors du téléversement de l\'image');
                setFileName(null);
                if (onFileChange) onFileChange(null);
            } finally {
                setIsUploading(false);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
        }
    };

    const showPickerOptions = () => {
        if (accept === 'pdf') {
            handleDocumentPick();
        } else if (accept === 'image') {
            Alert.alert('Choisir une image', '', [
                { text: 'Appareil photo', onPress: () => handleImagePick(true) },
                { text: 'Galerie', onPress: () => handleImagePick(false) },
                { text: 'Annuler', style: 'cancel' },
            ]);
        } else {
            Alert.alert('Choisir un fichier', '', [
                { text: 'Document (PDF)', onPress: handleDocumentPick },
                { text: 'Photo (Caméra)', onPress: () => handleImagePick(true) },
                { text: 'Photo (Galerie)', onPress: () => handleImagePick(false) },
                { text: 'Annuler', style: 'cancel' },
            ]);
        }
    };

    const handleRemove = () => {
        setFileName(null);
        onChange('');
        if (onFileChange) onFileChange(null);
    };

    // Extract filename from URL if available
    const displayName = fileName || (value ? decodeURIComponent(value.split('/').pop() || 'Fichier') : null);
    const hasFile = !!displayName;

    if (isUploading) {
        return (
            <View className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center justify-center">
                <ActivityIndicator size="small" color="#0066FF" />
                <Text className="text-sm text-gray-500 mt-2">Téléversement en cours...</Text>
            </View>
        );
    }

    if (hasFile) {
        return (
            <View className="flex-row items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                <View className="w-10 h-10 items-center justify-center bg-primary/10 rounded-lg">
                    <Ionicons name="document-text" size={20} color="#0066FF" />
                </View>
                <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text className="text-xs text-gray-500">
                        {accept === 'pdf' ? 'PDF' : accept === 'image' ? 'Image' : 'Fichier'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleRemove}
                    disabled={disabled}
                    className="p-2 rounded-full"
                    style={{ opacity: disabled ? 0.5 : 1 }}
                >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <TouchableOpacity
            onPress={showPickerOptions}
            disabled={disabled}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center justify-center"
            style={{ opacity: disabled ? 0.5 : 1 }}
            activeOpacity={0.7}
        >
            <View className="w-12 h-12 items-center justify-center bg-gray-100 rounded-full mb-2">
                <Ionicons name="cloud-upload-outline" size={24} color="#6B7280" />
            </View>
            <Text className="text-sm text-gray-600 font-medium">{label}</Text>
            <Text className="text-xs text-gray-400 mt-1">
                {accept === 'pdf' ? 'PDF' : accept === 'image' ? 'JPG, PNG' : 'PDF, JPG, PNG'}, max {maxSizeMB}Mo
            </Text>
        </TouchableOpacity>
    );
}
