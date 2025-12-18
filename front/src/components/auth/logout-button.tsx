"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  showIcon?: boolean;
}

export function LogoutButton({ variant = "outline", className, showIcon = true }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await api.post("/auth/logout", {});
      toast.success("Déconnexion réussie");
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      onClick={handleLogout} 
      disabled={isLoading}
      size="sm"
      className={cn("flex items-center gap-2", className)}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      {isLoading ? "Déconnexion..." : "Se déconnecter"}
    </Button>
  );
}

