/**
 * BAR-TH-175 Module - Step 4: Technical Visit
 * Placeholder for future implementation
 */

import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';

export default function BarTh175Step4() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-gray-900 mb-4">Étape 4</Text>
                <Text className="text-gray-500 text-center mb-8">
                    Cette étape sera implémentée prochainement
                </Text>
                <Button label="Retour" onPress={() => router.back()} />
            </View>
        </SafeAreaView>
    );
}
