"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

const acceptSchema = z
  .object({
    full_name: z.string().min(2, "Le nom complet doit faire au moins 2 caractères"),
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type AcceptFormValues = z.infer<typeof acceptSchema>;

interface InvitationData {
  email: string;
  tenant_id?: string;
  role?: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AcceptFormValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: {
      full_name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const validateInvitation = async () => {
      try {
        setStatus("loading");
        const response = await api.get(`/invitations/validate/${token}`);
        const data = await response.json();
        setInvitation(data);
        setStatus("valid");
      } catch (err: any) {
        setStatus("invalid");
        setError(err.message || "Invitation invalide");
      }
    };

    if (token) {
      validateInvitation();
    }
  }, [token]);

  const onSubmit = async (values: AcceptFormValues) => {
    try {
      setIsSubmitting(true);
      const response = await api.post("/invitations/accept", {
        token,
        full_name: values.full_name,
        password: values.password,
      });
      
      // Vérifier que la réponse est OK
      if (response.ok) {
        toast.success("Compte créé avec succès !");
        router.push("/app");
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Erreur inconnue" }));
        toast.error(errorData.detail || "Erreur lors de la création du compte.");
      }
    } catch (err: any) {
      console.error("Erreur lors de l'acceptation de l'invitation:", err);
      const errorMessage = err.data?.detail || err.message || "Erreur lors de la création du compte.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Invitation invalide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Finaliser votre inscription
          </CardTitle>
          <CardDescription>
            Pour rejoindre {invitation?.email || "l'organisation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input
                  type="email"
                  value={invitation?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <p className="text-[0.8rem] text-muted-foreground mt-1">
                      8 caractères minimum.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

