"use client";

import * as React from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Package,
  Boxes,
  ChevronRight,
  BadgeEuro,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  items?: Array<{ title: string; url: string; icon?: React.ComponentType<{ className?: string }> }>;
};

const navItems: NavItem[] = [
  {
    title: "Tableau de bord",
    url: "/app",
    icon: LayoutDashboard,
  },
  {
    title: "Dossiers",
    url: "/app/dossiers",
    icon: FolderOpen,
  },
  {
    title: "Clients",
    url: "/app/clients",
    icon: Users,
  },
  {
    title: "Modules",
    url: "/app/modules",
    icon: Package,
  },
  {
    title: "Stock & Catalogue",
    url: "/app/stock",
    icon: Boxes,
  },
  {
    title: "Valorisation CEE",
    url: "/app/settings/valuation",
    icon: BadgeEuro,
  },
];

function isActiveRoute(pathname: string, itemUrl: string): boolean {
  if (itemUrl === "/app") {
    return pathname === "/app";
  }
  return pathname.startsWith(itemUrl);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-start p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
        <Link
          href="/app"
          className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:gap-0 transition-opacity hover:opacity-80"
        >
          <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 ring-2 ring-primary/10">
            <Logo
              className="h-full w-full object-cover rounded-full"
              width={36}
              height={36}
            />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden whitespace-nowrap">
            <span className="font-bold text-xl tracking-tight">PowerCEE</span>
          </div>
        </Link>
      </SidebarHeader>

      <Separator className="bg-border/50" />

      <SidebarContent>
        <SidebarMenu className="px-2 pt-4 space-y-1">
          {navItems.map((item) => {
            const isActive = isActiveRoute(pathname, item.url);

            return (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-150",
                        pathname.startsWith(item.url) && "text-primary font-medium"
                      )}
                    >
                      <item.icon className={cn(
                        "transition-colors",
                        pathname.startsWith(item.url) && "text-primary"
                      )} />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/menu-item:rotate-90" />
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                          >
                            <Link href={subItem.url}>
                              {subItem.icon && (
                                <subItem.icon className="h-4 w-4 mr-2" />
                              )}
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </>
                ) : (
                  <div className="relative">
                    {/* Active indicator bar */}
                    <div
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary transition-all duration-200",
                        isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                      )}
                    />
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "transition-all duration-150 ml-0.5",
                        isActive && "bg-primary/5 text-primary font-medium"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon
                          className={cn(
                            "transition-colors",
                            isActive && "text-primary"
                          )}
                        />
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 px-1.5 text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </div>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/50">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium leading-tight">Utilisateur</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                Admin
              </Badge>
              <span className="text-xs text-muted-foreground">PowerCEE</span>
            </div>
          </div>
          <Link
            href="/app/settings/branding"
            className="ml-auto group-data-[collapsible=icon]:hidden p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

