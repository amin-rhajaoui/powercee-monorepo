"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/ui/empty-state";
import {
  FolderOpen,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Settings,
  FileText,
  BarChart3,
  MapPin,
} from "lucide-react";

export default function AppPage() {
  const router = useRouter();
  const stats = [
    {
      title: "Dossiers en cours",
      value: "12",
      description: "+2 depuis la semaine dernière",
      icon: FolderOpen,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950",
      trend: "up" as const,
      trendValue: "+2",
    },
    {
      title: "Nouveaux Clients",
      value: "48",
      description: "+15% ce mois-ci",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-950",
      trend: "up" as const,
      trendValue: "+15%",
    },
    {
      title: "Chiffre d'Affaires",
      value: "24,500€",
      description: "Objectif atteint à 85%",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: "up" as const,
      trendValue: "85%",
    },
    {
      title: "Actions requises",
      value: "3",
      description: "Dossiers en attente de signature",
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-950",
      trend: "down" as const,
      trendValue: "3",
    },
  ];

  const quickActions = [
    {
      title: "Nouveau dossier",
      description: "Creer un nouveau dossier client",
      icon: Plus,
      href: "/app/dossiers",
    },
    {
      title: "Ajouter un client",
      description: "Enregistrer un nouveau client",
      icon: Users,
      href: "/app/clients",
    },
    {
      title: "Consulter les modules",
      description: "Voir les modules disponibles",
      icon: FileText,
      href: "/app/modules",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue, voici un apercu de l'activite de votre entreprise aujourd'hui.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="card-interactive overflow-hidden"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stat.value}</span>
                {stat.trend && (
                  <span
                    className={`flex items-center text-xs font-medium ${
                      stat.trend === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.trendValue}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="card-interactive h-full cursor-pointer group">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
                      <action.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 animate-fade-in"
        style={{ animationDelay: "300ms" }}
      >
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Activite recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyStateCard
              icon={BarChart3}
              title="Pas encore de donnees"
              description="Le graphique d'activite s'affichera ici des que vous aurez vos premiers dossiers."
              action={{
                label: "Creer un dossier",
                onClick: () => router.push("/app/dossiers"),
                icon: Plus,
              }}
              bordered={false}
              className="h-[200px]"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              Mes agences
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/settings/agencies">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <EmptyStateCard
              icon={MapPin}
              title="Aucune agence"
              description="Configurez vos agences dans les reglages pour les voir apparaitre ici."
              action={{
                label: "Configurer",
                onClick: () => router.push("/app/settings/agencies"),
              }}
              bordered={false}
              className="py-8"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
