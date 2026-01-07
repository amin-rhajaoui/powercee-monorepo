"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Module } from "@/lib/modules";

type ModuleCardProps = {
  module: Module;
};

export function ModuleCard({ module }: ModuleCardProps) {
  const Icon = module.icon;

  return (
    <Link href={`/app/modules/${module.id}`} className="block">
      <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full group">
        <CardHeader className="pb-4">
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
      </Card>
    </Link>
  );
}

