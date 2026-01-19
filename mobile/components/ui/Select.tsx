/**
 * NativePicker - Base component for all native picker-based selects
 * DRY principle: Single source of truth for picker styling and behavior
 */

import React from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PickerOption<T = string> {
  label: string;
  value: T;
}

export interface NativePickerProps<T = string> {
  /** Label displayed above the picker */
  label?: string;
  /** Currently selected value */
  value: T | null;
  /** Available options */
  options: PickerOption<T>[];
  /** Callback when value changes */
  onChange: (value: T | null) => void;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Error message to display */
  error?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Whether options are loading */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Warning/info message below picker */
  helperText?: string;
  /** Helper text color variant */
  helperVariant?: 'info' | 'warning' | 'error';
}

// ============================================================================
// Component
// ============================================================================

export function NativePicker<T extends string | number | boolean = string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Sélectionner...',
  error,
  disabled = false,
  loading = false,
  className,
  helperText,
  helperVariant = 'info',
}: NativePickerProps<T>) {
  // Loading state
  if (loading) {
    return (
      <View className={cn('w-full mb-4', className)}>
        {label && (
          <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
        )}
        <View className="h-14 bg-gray-100 rounded-xl items-center justify-center">
          <ActivityIndicator size="small" color="#0066FF" />
        </View>
      </View>
    );
  }

  // Helper text color
  const helperColors = {
    info: 'text-blue-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
  };

  return (
    <View className={cn('w-full mb-4', className)}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      )}

      <View
        className={cn(
          'rounded-xl border bg-white overflow-hidden',
          error ? 'border-red-500' : 'border-gray-300',
          disabled && 'opacity-50'
        )}
      >
        <Picker
          selectedValue={value ?? ('' as T)}
          onValueChange={(itemValue) => {
            onChange(itemValue === '' ? null : (itemValue as T));
          }}
          enabled={!disabled && options.length > 0}
          style={{
            height: Platform.OS === 'ios' ? 150 : 56,
          }}
          itemStyle={{
            fontSize: 16,
          }}
        >
          <Picker.Item label={placeholder} value="" color="#9CA3AF" />
          {options.map((option, index) => (
            <Picker.Item
              key={index}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>

      {error && (
        <Text className="mt-1 px-1 text-xs text-red-500">{error}</Text>
      )}

      {helperText && !error && (
        <Text className={cn('mt-1 text-sm', helperColors[helperVariant])}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// Specialized Components (Composition over Inheritance)
// ============================================================================

/**
 * Select - Simple select for static options
 * Uses NativePicker under the hood
 */
interface SelectProps {
  label?: string;
  value?: string | number | boolean | null;
  options: { label: string; value: string | number | boolean }[];
  onValueChange: (value: any) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  options,
  onValueChange,
  ...props
}: SelectProps) {
  return (
    <NativePicker
      value={value ?? null}
      options={options.map((o) => ({ label: o.label, value: o.value as any }))}
      onChange={onValueChange}
      {...props}
    />
  );
}

/**
 * RadioGroup - Card-based selection for 2-4 options
 * Better UX for binary choices like Yes/No
 */
interface RadioOption {
  label: string;
  value: string | number | boolean;
  description?: string;
}

interface RadioGroupProps {
  label?: string;
  value?: string | number | boolean | null;
  options: RadioOption[];
  onValueChange: (value: any) => void;
  className?: string;
  horizontal?: boolean;
}

export function RadioGroup({
  label,
  value,
  options,
  onValueChange,
  className,
  horizontal = false,
}: RadioGroupProps) {
  return (
    <View className={cn('w-full mb-4', className)}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      )}
      <View className={cn(horizontal ? 'flex-row gap-3' : 'gap-2')}>
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <View key={index} className={horizontal ? 'flex-1' : 'w-full'}>
              <View
                className={cn(
                  'flex-row items-center gap-3 rounded-xl border p-4',
                  isSelected
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200 bg-white'
                )}
                onTouchEnd={() => onValueChange(option.value)}
              >
                <View
                  className={cn(
                    'h-5 w-5 rounded-full border-2 items-center justify-center',
                    isSelected ? 'border-primary' : 'border-gray-400'
                  )}
                >
                  {isSelected && (
                    <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    className={cn(
                      'text-base font-medium',
                      isSelected ? 'text-primary' : 'text-gray-900'
                    )}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text className="text-sm text-gray-500">
                      {option.description}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * BooleanSelect - Yes/No binary choice
 * Convenience wrapper around RadioGroup
 */
interface BooleanSelectProps {
  label?: string;
  value?: boolean | null;
  onValueChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
}

export function BooleanSelect({
  label,
  value,
  onValueChange,
  yesLabel = 'Oui',
  noLabel = 'Non',
  className,
}: BooleanSelectProps) {
  return (
    <RadioGroup
      label={label}
      value={value}
      options={[
        { label: yesLabel, value: true },
        { label: noLabel, value: false },
      ]}
      onValueChange={onValueChange}
      className={className}
      horizontal
    />
  );
}
