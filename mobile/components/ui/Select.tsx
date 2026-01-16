import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, SafeAreaView } from 'react-native';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons'; // Assuming Feather is available in expo/vector-icons

interface Option {
  label: string;
  value: string | number | boolean;
  description?: string;
}

interface SelectProps {
  label?: string;
  value?: string | number | boolean;
  options: Option[];
  onValueChange: (value: any) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function Select({
  label,
  value,
  options,
  onValueChange,
  placeholder = "Sélectionner...",
  error,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View className={cn("w-full mb-4", className)}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className={cn(
          "h-14 w-full flex-row items-center justify-between rounded-xl border border-input bg-background px-4",
          error && "border-destructive"
        )}
        activeOpacity={0.8}
      >
        <Text className={cn(
          "text-base",
          selectedOption ? "text-foreground" : "text-muted-foreground"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>

      {error && (
        <Text className="mt-1 px-1 text-xs text-destructive">
          {error}
        </Text>
      )}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <Text className="text-lg font-bold text-foreground">
              {label || "Sélectionner"}
            </Text>
            <TouchableOpacity onPress={() => setIsOpen(false)} className="p-2">
              <Feather name="x" size={24} color="#1A1F2E" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="gap-3 pb-8">
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      onValueChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex-row items-center justify-between rounded-xl border p-4",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-input bg-card"
                    )}
                  >
                    <View className="flex-1">
                      <Text className={cn(
                        "text-lg font-semibold",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text className="mt-1 text-sm text-muted-foreground">
                          {option.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Feather name="check" size={20} color="#8B1A2B" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Simple Radio Group alternative for fewer options
export function RadioGroup({
  label,
  value,
  options,
  onValueChange,
  className,
}: SelectProps) {
  return (
    <View className={cn("w-full mb-4", className)}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      <View className="gap-3">
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onValueChange(option.value)}
              className={cn(
                "flex-row items-center gap-3 rounded-xl border p-4",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-input bg-card"
              )}
              activeOpacity={0.8}
            >
              <View className={cn(
                "h-6 w-6 rounded-full border-2 items-center justify-center",
                isSelected ? "border-primary" : "border-muted-foreground"
              )}>
                {isSelected && <View className="h-3 w-3 rounded-full bg-primary" />}
              </View>
              <View className="flex-1">
                <Text className={cn(
                  "text-base font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </Text>
                {option.description && (
                  <Text className="text-sm text-muted-foreground">
                    {option.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
