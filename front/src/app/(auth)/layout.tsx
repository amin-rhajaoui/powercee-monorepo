import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Colonne de GAUCHE - Image (Desktop uniquement) */}
      <div className="relative hidden h-full lg:block">
        <Image
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop"
          alt="PowerCEE Architecture"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/5" />
      </div>

      {/* Colonne de DROITE - Formulaire */}
      <div className="flex flex-col items-center justify-center p-8 relative">
        {/* Bouton Help/Back en haut à droite */}
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <Button variant="ghost" asChild>
            <Link href="/">
              Retour au site
            </Link>
          </Button>
        </div>

        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          {/* Logo avec bords arrondis et ombre */}
          <div className="mx-auto mb-8">
            <Logo width={160} height={48} className="shadow-md" />
          </div>

          <div className="flex flex-col space-y-2">
            {children}
          </div>
          
          <p className="px-8 text-center text-sm text-muted-foreground mt-4">
            En continuant, vous acceptez nos{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Conditions d&apos;utilisation
            </Link>{" "}
            et notre{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
