import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
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
      <div className="flex flex-col min-h-screen p-4 sm:p-6 md:p-8 relative">
        {/* Header */}
        <header className="w-full flex-shrink-0 flex justify-end py-4 sm:py-6">
          <Button variant="default" asChild className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Retour au site
            </Link>
          </Button>
        </header>

        {/* Body */}
        <main className="flex-1 flex items-center justify-center w-full py-4">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
            {/* Logo avec bords arrondis - Responsive */}
            <div className="mx-auto mb-4 sm:mb-6 md:mb-8">
              <Logo width={160} height={48} />
            </div>

            {/* Contenu du formulaire */}
            <div className="flex flex-col space-y-2">
              {children}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full flex-shrink-0 py-4 sm:py-6">
          <p className="text-center text-xs sm:text-sm text-muted-foreground px-4">
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
        </footer>
      </div>
    </div>
  );
}
