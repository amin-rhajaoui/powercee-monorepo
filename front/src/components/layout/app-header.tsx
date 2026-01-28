"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Moon, Sun, User, Palette, MapPin, Plug, Bell, Search, Command } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppHeader() {
  const { setTheme, theme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function fetchUser() {
      try {
        const response = await api.get("users/me");
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error("Erreur lors de la recuperation de l'utilisateur:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6 hidden md:block" />
        </div>

        {/* Center section - Search bar */}
        <div className="flex-1 flex justify-center max-w-md mx-auto">
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground font-normal h-9 px-3 hidden sm:flex"
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left">Rechercher...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  3
                </span>
                <span className="sr-only">Notifications</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Changer le theme</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* User Menu */}
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 gap-2 px-2 hover:bg-accent"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="" alt="Avatar" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user ? getInitials(user.full_name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    {isLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <span className="text-sm font-medium leading-none">
                        {user?.full_name || "Utilisateur"}
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-sm font-medium leading-none">
                      {isLoading ? "Chargement..." : user?.full_name || "Utilisateur"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || ""}
                    </p>
                    {user?.role && (
                      <Badge variant="secondary" className="w-fit mt-1 text-xs">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/app/profile"
                    className="flex items-center cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Mon Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/app/settings/branding"
                    className="flex items-center cursor-pointer"
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Mon Entreprise</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/app/settings/agencies"
                    className="flex items-center cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>Mes Agences</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/app/settings/integrations"
                    className="flex items-center cursor-pointer"
                  >
                    <Plug className="mr-2 h-4 w-4" />
                    <span>Integrations</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <LogoutButton
                  variant="ghost"
                  className="w-full justify-start px-2 py-1.5 h-auto font-normal"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!mounted && (
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full"
              disabled
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  U
                </AvatarFallback>
              </Avatar>
            </Button>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}

