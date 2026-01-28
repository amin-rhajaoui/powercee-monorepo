/**
 * BAR-TH-171 - Step 4: Technical Visit
 * Full technical visit form + folder creation on validation
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useModuleDraft } from '@/hooks/useModuleDraft';
import { createFolderFromDraft } from '@/lib/api/folders';
import {
    barTh171Step4Schema,
    BarTh171Step4Values,
    EmitterType,
    LevelEmitters,
    ATTIC_TYPE_LABELS,
    FLOOR_TYPE_LABELS,
    WALL_ISOLATION_TYPE_LABELS,
    JOINERY_TYPE_LABELS,
    EMITTER_TYPE_LABELS,
} from '@/lib/schemas/barTh171';

// ============================================================================
// Constants
// ============================================================================

const MODULE_ID = 'bar-th-171';
const MODULE_CODE = 'BAR-TH-171';
const STEP_LABELS = ['Foyer', 'Logement', 'Documents', 'Visite Technique'];

const LEVEL_LABELS: Record<number, string> = {
    0: 'RDC (Rez-de-chaussée)',
    1: 'R+1 (1er étage)',
    2: 'R+2 (2ème étage)',
    3: 'R+3 (3ème étage)',
    4: 'R+4 (4ème étage)',
};

// ============================================================================
// Sub-components
// ============================================================================

function EmitterCheckbox({
    level,
    emitterType,
    checked,
    onToggle,
}: {
    level: number;
    emitterType: EmitterType;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onToggle}
            className="flex-row items-center gap-2 py-2"
            activeOpacity={0.7}
        >
            <View
                className={`w-5 h-5 rounded border-2 items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-gray-300'
                    }`}
            >
                {checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text className="text-gray-700">{EMITTER_TYPE_LABELS[emitterType]}</Text>
        </TouchableOpacity>
    );
}

function LevelEmittersSection({
    level,
    selectedEmitters,
    onChange,
}: {
    level: number;
    selectedEmitters: EmitterType[];
    onChange: (emitters: EmitterType[]) => void;
}) {
    const handleToggle = (emitter: EmitterType) => {
        if (selectedEmitters.includes(emitter)) {
            onChange(selectedEmitters.filter((e) => e !== emitter));
        } else {
            onChange([...selectedEmitters, emitter]);
        }
    };

    return (
        <View className="bg-gray-50 rounded-xl p-4 mb-3">
            <Text className="font-medium text-gray-900 mb-2">{LEVEL_LABELS[level]}</Text>
            <View className="flex-row flex-wrap gap-4">
                {(Object.keys(EMITTER_TYPE_LABELS) as EmitterType[]).map((emitterType) => (
                    <EmitterCheckbox
                        key={emitterType}
                        level={level}
                        emitterType={emitterType}
                        checked={selectedEmitters.includes(emitterType)}
                        onToggle={() => handleToggle(emitterType)}
                    />
                ))}
            </View>
        </View>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function Step4TechnicalVisit() {
    const router = useRouter();
    const { draftId } = useLocalSearchParams<{ draftId?: string }>();
    const { draftData, draft, saveDraft } = useModuleDraft({
        moduleId: MODULE_ID,
        moduleCode: MODULE_CODE,
        draftId,
    });

    const [isValidating, setIsValidating] = useState(false);
    const [emittersConfig, setEmittersConfig] = useState<LevelEmitters[]>([]);

    // Form setup
    const form = useForm<BarTh171Step4Values>({
        resolver: zodResolver(barTh171Step4Schema),
        defaultValues: {
            nb_levels: draftData.step4?.nb_levels ?? undefined,
            avg_ceiling_height: draftData.step4?.avg_ceiling_height ?? undefined,
            target_temperature: draftData.step4?.target_temperature ?? 19,
            attic_type: draftData.step4?.attic_type ?? undefined,
            is_attic_isolated: draftData.step4?.is_attic_isolated ?? undefined,
            attic_isolation_year: draftData.step4?.attic_isolation_year ?? undefined,
            floor_type: draftData.step4?.floor_type ?? undefined,
            is_floor_isolated: draftData.step4?.is_floor_isolated ?? undefined,
            floor_isolation_year: draftData.step4?.floor_isolation_year ?? undefined,
            wall_isolation_type: draftData.step4?.wall_isolation_type ?? undefined,
            wall_isolation_year_interior: draftData.step4?.wall_isolation_year_interior ?? undefined,
            wall_isolation_year_exterior: draftData.step4?.wall_isolation_year_exterior ?? undefined,
            joinery_type: draftData.step4?.joinery_type ?? undefined,
            emitters_configuration: draftData.step4?.emitters_configuration ?? [],
        },
        mode: 'onChange',
    });

    const nbLevels = form.watch('nb_levels');
    const isAtticIsolated = form.watch('is_attic_isolated');
    const isFloorIsolated = form.watch('is_floor_isolated');
    const wallIsolationType = form.watch('wall_isolation_type');

    // Initialize emitters config from draft data
    useEffect(() => {
        if (draftData.step4?.emitters_configuration) {
            setEmittersConfig(draftData.step4.emitters_configuration as LevelEmitters[]);
        }
    }, [draftData.step4]);

    // Update emitters config when nb_levels changes
    useEffect(() => {
        if (nbLevels) {
            const newConfig = Array.from({ length: nbLevels }, (_, i) => {
                const existing = emittersConfig.find((c) => c.level === i);
                return existing || { level: i, emitters: [] as EmitterType[] };
            });
            setEmittersConfig(newConfig);
            form.setValue('emitters_configuration', newConfig);
        }
    }, [nbLevels]);

    const handleEmitterChange = (level: number, emitters: EmitterType[]) => {
        const newConfig = emittersConfig.map((c) =>
            c.level === level ? { ...c, emitters } : c
        );
        setEmittersConfig(newConfig);
        form.setValue('emitters_configuration', newConfig);
    };

    const handlePrevious = () => {
        router.back();
    };

    const handleValidate = async () => {
        const isValid = await form.trigger();
        if (!isValid) {
            Alert.alert('Erreur', 'Veuillez corriger les erreurs du formulaire');
            return;
        }

        if (!draftId || draftId === 'new') {
            Alert.alert('Erreur', 'Brouillon introuvable');
            return;
        }

        setIsValidating(true);
        try {
            const values = form.getValues();

            // Save step4 data first
            await saveDraft(
                {
                    step4: {
                        nb_levels: values.nb_levels,
                        avg_ceiling_height: values.avg_ceiling_height,
                        target_temperature: values.target_temperature,
                        attic_type: values.attic_type,
                        is_attic_isolated: values.is_attic_isolated,
                        attic_isolation_year: values.attic_isolation_year,
                        floor_type: values.floor_type,
                        is_floor_isolated: values.is_floor_isolated,
                        floor_isolation_year: values.floor_isolation_year,
                        wall_isolation_type: values.wall_isolation_type,
                        wall_isolation_year_interior: values.wall_isolation_year_interior,
                        wall_isolation_year_exterior: values.wall_isolation_year_exterior,
                        joinery_type: values.joinery_type,
                        emitters_configuration: values.emitters_configuration,
                    },
                },
                4
            );

            // Create folder from draft
            const folder = await createFolderFromDraft(draftId);
            Alert.alert('Succès', 'Dossier créé avec succès !', [
                {
                    text: 'Voir le dossier',
                    onPress: () => router.replace(`/(app)/folders/${folder.id}`),
                },
            ]);
        } catch (error) {
            console.error('Error validating:', error);
            Alert.alert('Erreur', 'Erreur lors de la création du dossier');
        } finally {
            setIsValidating(false);
        }
    };

    // Options
    const levelOptions = [1, 2, 3, 4, 5].map((n) => ({
        value: n.toString(),
        label: `${n} niveau${n > 1 ? 'x' : ''}`,
    }));

    const atticOptions = Object.entries(ATTIC_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const floorOptions = Object.entries(FLOOR_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const wallOptions = Object.entries(WALL_ISOLATION_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const joineryOptions = Object.entries(JOINERY_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={handlePrevious}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900">BAR-TH-171</Text>
                        <Text className="text-sm text-gray-500">Étape 4 : Visite technique</Text>
                    </View>
                </View>
            </View>

            {/* Progress */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-medium text-primary">Étape 4/{STEP_LABELS.length}</Text>
                    <Text className="text-sm text-gray-500">{STEP_LABELS[3]}</Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <View className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                </View>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
                {/* Chauffage */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="thermometer" size={20} color="#0066FF" />
                        <Text className="text-base font-semibold text-gray-900">Chauffage</Text>
                    </View>

                    <View className="gap-4">
                        <Controller
                            control={form.control}
                            name="nb_levels"
                            render={({ field }) => (
                                <Select
                                    label="Nombre de niveaux"
                                    placeholder="Sélectionnez..."
                                    options={levelOptions}
                                    value={field.value?.toString() || null}
                                    onValueChange={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                />
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="avg_ceiling_height"
                            render={({ field }) => (
                                <Input
                                    label="Hauteur sous plafond (m)"
                                    placeholder="Ex: 2.5"
                                    keyboardType="decimal-pad"
                                    value={field.value?.toString() || ''}
                                    onChangeText={(v) => field.onChange(v ? parseFloat(v) : undefined)}
                                />
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="target_temperature"
                            render={({ field }) => (
                                <Input
                                    label="Température cible (°C)"
                                    placeholder="19"
                                    keyboardType="numeric"
                                    value={field.value?.toString() || '19'}
                                    onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : 19)}
                                />
                            )}
                        />
                    </View>

                    {/* Emitters per level */}
                    {nbLevels && nbLevels > 0 && (
                        <View className="mt-4">
                            <Text className="font-medium text-gray-900 mb-3">Émetteurs par niveau</Text>
                            {emittersConfig.map((config) => (
                                <LevelEmittersSection
                                    key={config.level}
                                    level={config.level}
                                    selectedEmitters={config.emitters}
                                    onChange={(emitters) => handleEmitterChange(config.level, emitters)}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Enveloppe */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="home" size={20} color="#0066FF" />
                        <Text className="text-base font-semibold text-gray-900">Enveloppe</Text>
                    </View>

                    {/* Combles */}
                    <Text className="font-medium text-gray-700 mb-3">Combles</Text>
                    <View className="gap-4 mb-6">
                        <Controller
                            control={form.control}
                            name="attic_type"
                            render={({ field }) => (
                                <Select
                                    label="Type de combles"
                                    placeholder="Sélectionnez..."
                                    options={atticOptions}
                                    value={field.value || null}
                                    onValueChange={field.onChange}
                                />
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="is_attic_isolated"
                            render={({ field }) => (
                                <Select
                                    label="Isolés ?"
                                    placeholder="Sélectionnez..."
                                    options={[
                                        { value: 'true', label: 'Oui' },
                                        { value: 'false', label: 'Non' },
                                    ]}
                                    value={field.value === undefined ? null : field.value ? 'true' : 'false'}
                                    onValueChange={(v) => field.onChange(v === 'true')}
                                />
                            )}
                        />

                        {isAtticIsolated && (
                            <Controller
                                control={form.control}
                                name="attic_isolation_year"
                                render={({ field }) => (
                                    <Input
                                        label="Année d'isolation"
                                        placeholder="Ex: 2015"
                                        keyboardType="numeric"
                                        value={field.value?.toString() || ''}
                                        onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                    />
                                )}
                            />
                        )}
                    </View>

                    {/* Plancher bas */}
                    <View className="border-t border-gray-100 pt-4">
                        <Text className="font-medium text-gray-700 mb-3">Plancher bas</Text>
                        <View className="gap-4 mb-6">
                            <Controller
                                control={form.control}
                                name="floor_type"
                                render={({ field }) => (
                                    <Select
                                        label="Type de plancher"
                                        placeholder="Sélectionnez..."
                                        options={floorOptions}
                                        value={field.value || null}
                                        onValueChange={field.onChange}
                                    />
                                )}
                            />

                            <Controller
                                control={form.control}
                                name="is_floor_isolated"
                                render={({ field }) => (
                                    <Select
                                        label="Isolé ?"
                                        placeholder="Sélectionnez..."
                                        options={[
                                            { value: 'true', label: 'Oui' },
                                            { value: 'false', label: 'Non' },
                                        ]}
                                        value={field.value === undefined ? null : field.value ? 'true' : 'false'}
                                        onValueChange={(v) => field.onChange(v === 'true')}
                                    />
                                )}
                            />

                            {isFloorIsolated && (
                                <Controller
                                    control={form.control}
                                    name="floor_isolation_year"
                                    render={({ field }) => (
                                        <Input
                                            label="Année d'isolation"
                                            placeholder="Ex: 2015"
                                            keyboardType="numeric"
                                            value={field.value?.toString() || ''}
                                            onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                        />
                                    )}
                                />
                            )}
                        </View>
                    </View>

                    {/* Murs */}
                    <View className="border-t border-gray-100 pt-4">
                        <Text className="font-medium text-gray-700 mb-3">Murs</Text>
                        <View className="gap-4">
                            <Controller
                                control={form.control}
                                name="wall_isolation_type"
                                render={({ field }) => (
                                    <Select
                                        label="Type d'isolation"
                                        placeholder="Sélectionnez..."
                                        options={wallOptions}
                                        value={field.value || null}
                                        onValueChange={field.onChange}
                                    />
                                )}
                            />

                            {(wallIsolationType === 'INTERIEUR' || wallIsolationType === 'DOUBLE') && (
                                <Controller
                                    control={form.control}
                                    name="wall_isolation_year_interior"
                                    render={({ field }) => (
                                        <Input
                                            label="Année isolation intérieure"
                                            placeholder="Ex: 2015"
                                            keyboardType="numeric"
                                            value={field.value?.toString() || ''}
                                            onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                        />
                                    )}
                                />
                            )}

                            {(wallIsolationType === 'EXTERIEUR' || wallIsolationType === 'DOUBLE') && (
                                <Controller
                                    control={form.control}
                                    name="wall_isolation_year_exterior"
                                    render={({ field }) => (
                                        <Input
                                            label="Année isolation extérieure"
                                            placeholder="Ex: 2015"
                                            keyboardType="numeric"
                                            value={field.value?.toString() || ''}
                                            onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                        />
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </View>

                {/* Menuiseries */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="grid" size={20} color="#0066FF" />
                        <Text className="text-base font-semibold text-gray-900">Menuiseries</Text>
                    </View>

                    <Controller
                        control={form.control}
                        name="joinery_type"
                        render={({ field }) => (
                            <Select
                                label="Type de vitrages"
                                placeholder="Sélectionnez..."
                                options={joineryOptions}
                                value={field.value || null}
                                onValueChange={field.onChange}
                            />
                        )}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View className="p-4 bg-white border-t border-gray-100 flex-row gap-3">
                <Button
                    variant="outline"
                    label="Précédent"
                    onPress={handlePrevious}
                    disabled={isValidating}
                    className="flex-1"
                />
                <TouchableOpacity
                    onPress={handleValidate}
                    disabled={isValidating}
                    className="flex-1 bg-green-600 py-3 rounded-xl flex-row items-center justify-center gap-2"
                    activeOpacity={0.8}
                    style={{ opacity: isValidating ? 0.5 : 1 }}
                >
                    {isValidating ? (
                        <Text className="text-white font-semibold">Création...</Text>
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text className="text-white font-semibold">Valider le dossier</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
