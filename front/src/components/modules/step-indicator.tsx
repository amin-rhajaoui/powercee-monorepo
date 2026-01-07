"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type StepStatus = "completed" | "current" | "upcoming";

type Step = {
  number: number;
  label: string;
  status: StepStatus;
};

type StepIndicatorProps = {
  steps: Step[];
  onStepClick?: (stepNumber: number) => void;
};

export function StepIndicator({ steps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <button
                type="button"
                onClick={() => onStepClick?.(step.number)}
                disabled={step.status === "upcoming" && !onStepClick}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  step.status === "completed" &&
                    "bg-primary text-primary-foreground border-primary cursor-pointer hover:bg-primary/90",
                  step.status === "current" &&
                    "bg-primary text-primary-foreground border-primary ring-4 ring-primary/20",
                  step.status === "upcoming" &&
                    "bg-background text-muted-foreground border-muted-foreground/30",
                  step.status === "completed" && onStepClick && "cursor-pointer hover:bg-primary/90",
                  step.status === "upcoming" && "cursor-not-allowed"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </button>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[100px]",
                  step.status === "current" && "text-primary",
                  step.status === "completed" && "text-muted-foreground",
                  step.status === "upcoming" && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <Separator
                className={cn(
                  "flex-1 mx-2 h-0.5",
                  step.status === "completed" ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

