import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator, View } from 'react-native';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-xl disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary shadow-sm",
        destructive: "bg-destructive shadow-sm",
        outline: "border border-input bg-background shadow-sm active:bg-accent",
        secondary: "bg-secondary shadow-sm",
        ghost: "active:bg-accent",
        link: "text-primary underline-offset-4",
      },
      size: {
        default: "h-[50px] w-full px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-14 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const textVariants = cva(
  "text-base font-semibold",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "text-foreground",
        secondary: "text-secondary-foreground",
        ghost: "text-foreground",
        link: "text-primary underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ButtonProps
  extends TouchableOpacityProps,
  VariantProps<typeof buttonVariants> {
  label?: string;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  label,
  children,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#1A1F2E' : '#FFFFFF'}
        />
      ) : (
        <>
          {label ? (
            <Text className={cn(textVariants({ variant }))}>{label}</Text>
          ) : (
            // Handle raw text children by wrapping them, but pass through components
            React.Children.map(children, (child) => {
              if (typeof child === 'string') {
                return <Text className={cn(textVariants({ variant }))}>{child}</Text>;
              }
              return child;
            })
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
