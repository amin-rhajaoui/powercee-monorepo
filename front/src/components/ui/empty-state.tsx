import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in-50 duration-500",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface EmptyStateCardProps extends EmptyStateProps {
  bordered?: boolean;
}

export function EmptyStateCard({
  bordered = true,
  className,
  ...props
}: EmptyStateCardProps) {
  return (
    <EmptyState
      {...props}
      className={cn(
        bordered && "border border-dashed rounded-lg bg-muted/30",
        className
      )}
    />
  );
}
