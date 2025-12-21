"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

// #region agent log
// Hypothèse 2 CONFIRMÉE: Retirer .default() car il crée une incohérence de types
// Le .default() rend role optionnel en entrée mais requis en sortie,
// causant un conflit avec zodResolver qui attend un type d'entrée cohérent
fetch('http://127.0.0.1:7245/ingest/608e63c0-36e9-4fc5-88de-a2cccab9ee5a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'invite-dialog.tsx:36',message:'Fix: Retirer .default() du schéma',data:{fixApplied:'remove_default',reason:'defaultValues dans useForm gère déjà la valeur par défaut'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'2'})}).catch(()=>{});
// #endregion

// Schéma sans .default() : role est requis
// La valeur par défaut est gérée dans defaultValues de useForm
const invitationSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["COMMERCIAL", "POSEUR", "AUDITEUR", "COMPTABLE", "ADMIN_AGENCE", "DIRECTION"]),
});

// #region agent log
// Type inféré maintenant cohérent (role requis dans input et output)
fetch('http://127.0.0.1:7245/ingest/608e63c0-36e9-4fc5-88de-a2cccab9ee5a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'invite-dialog.tsx:44',message:'Type inféré après fix',data:{typeUsed:'z.infer',roleRequired:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'2'})}).catch(()=>{});
// #endregion

type InvitationFormValues = z.infer<typeof invitationSchema>;

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId?: string;
  onSuccess?: () => void;
}

const roles = [
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "POSEUR", label: "Poseur" },
  { value: "AUDITEUR", label: "Auditeur" },
  { value: "COMPTABLE", label: "Comptable" },
  { value: "ADMIN_AGENCE", label: "Admin Agence" },
  { value: "DIRECTION", label: "Direction" },
];

export function InviteDialog({
  open,
  onOpenChange,
  agencyId,
  onSuccess,
}: InviteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // #region agent log
  // Vérification post-fix: useForm avec schéma sans .default()
  fetch('http://127.0.0.1:7245/ingest/608e63c0-36e9-4fc5-88de-a2cccab9ee5a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'invite-dialog.tsx:55',message:'useForm avec schéma corrigé (post-fix-2)',data:{defaultValues:{email:'',role:'COMMERCIAL'},schemaHasDefault:false,typeUsed:'z.infer'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'2'})}).catch(()=>{});
  // #endregion

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "COMMERCIAL",
    },
  });

  const onSubmit = async (values: InvitationFormValues) => {
    // #region agent log
    // Vérification post-fix: Valeurs après parsing avec schéma corrigé
    fetch('http://127.0.0.1:7245/ingest/608e63c0-36e9-4fc5-88de-a2cccab9ee5a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'invite-dialog.tsx:62',message:'Valeurs onSubmit (post-fix-2)',data:{values,roleType:typeof values.role,hasRole:!!values.role,roleValue:values.role},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'2'})}).catch(()=>{});
    // #endregion
    try {
      setIsSubmitting(true);
      await api.post("/invitations", {
        ...values,
        agency_id: agencyId,
      });
      toast.success("Invitation envoyée");
      form.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="exemple@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer l'invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

