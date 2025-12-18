"use client";

import * as React from "react";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  Settings, 
  ChevronRight,
  LogOut,
  MapPin,
  Palette,
  Building,
  Building2
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
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";
import { Separator } from "@/components/ui/separator";

const navItems = [
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
    title: "Configuration",
    url: "#",
    icon: Settings,
    items: [
      {
        title: "Mon Entreprise",
        url: "/app/settings/branding",
        icon: Palette,
      },
      {
        title: "Agences",
        url: "/app/settings/agencies",
        icon: MapPin,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-start p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
        <Link href="/app" className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:gap-0">
          <Logo className="h-9 w-auto shadow-sm shrink-0 group-data-[collapsible=icon]:h-6" width={36} height={36} />
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-xl tracking-tight">PowerCEE</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <Separator className="bg-muted/50" />
      
      <SidebarContent>
        <SidebarMenu className="px-2 pt-4">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.items ? (
                <>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    className={pathname.startsWith(item.url) ? "text-primary" : ""}
                  >
                    <item.icon />
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
                            {subItem.icon && <subItem.icon className="h-4 w-4 mr-2" />}
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </>
              ) : (
                <SidebarMenuButton 
                  asChild 
                  tooltip={item.title}
                  isActive={pathname === item.url}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Utilisateur</span>
            <span className="text-xs text-muted-foreground leading-none mt-1">Équipe PowerCEE</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

