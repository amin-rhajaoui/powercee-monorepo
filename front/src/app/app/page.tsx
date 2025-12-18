import { LogoutButton } from "@/components/auth/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Tableau de bord</CardTitle>
            <CardDescription>
              Bienvenue sur votre espace PowerCEE.
            </CardDescription>
          </div>
          <LogoutButton />
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-muted/50 rounded-lg border border-dashed flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-medium">Vous êtes connecté !</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ceci est votre espace sécurisé. Vous pouvez maintenant commencer à gérer vos rénovations énergétiques.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

