"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Settings } from "lucide-react";
import { Module } from "@/lib/modules";

type ModuleCardProps = {
  module: Module;
};

export function ModuleCard({ module }: ModuleCardProps) {
  const Icon = module.icon;

  return (
    <Card className="relative h-full transition-all hover:shadow-lg hover:border-primary/50 group">
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/app/settings/modules/${module.code}`}>
                <Settings className="mr-2 h-4 w-4" />
                Réglages
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/app/modules/${module.id}`} className="block h-full">
        <CardHeader className="pb-4 pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg leading-tight">{module.title}</CardTitle>
                <CardDescription className="mt-2 text-xs font-mono text-muted-foreground">
                  {module.code}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}

