import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Users, TrendingUp, AlertCircle } from "lucide-react";

export default function AppPage() {
  const stats = [
    {
      title: "Dossiers en cours",
      value: "12",
      description: "+2 depuis la semaine dernière",
      icon: FolderOpen,
      color: "text-blue-600",
    },
    {
      title: "Nouveaux Clients",
      value: "48",
      description: "+15% ce mois-ci",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Chiffre d'Affaires",
      value: "24,500€",
      description: "Objectif atteint à 85%",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      title: "Actions requises",
      value: "3",
      description: "Dossiers en attente de signature",
      icon: AlertCircle,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue, voici un aperçu de l'activité de votre entreprise aujourd'hui.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground text-center px-4">
                Le graphique d'activité s'affichera ici dès que vous aurez vos premiers dossiers.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Dernières agences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground text-center py-8 px-4 border rounded-lg border-dashed">
                Configurez vos agences dans les réglages pour les voir apparaître ici.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
