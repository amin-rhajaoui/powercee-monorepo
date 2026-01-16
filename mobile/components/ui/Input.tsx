import React from 'react';
import { TextInput, Text, View, TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  helperText,
  containerClassName,
  className,
  style,
  ...props
}: InputProps) {
  const hasError = Boolean(error);

  return (
    <View className={cn("mb-4 w-full", containerClassName)}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          "h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground",
          "focus:border-primary focus:ring-1 focus:ring-primary",
          hasError && "border-destructive focus:border-destructive focus:ring-destructive",
          className
        )}
        placeholderTextColor="#64748B" // muted-foreground
        style={style}
        {...props}
      />
      {(hasError || helperText) && (
        <Text
          className={cn(
            "mt-1 px-1 text-xs",
            hasError ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {hasError ? (typeof error === 'string' ? error : '') : helperText}
        </Text>
      )}
    </View>
  );
}
