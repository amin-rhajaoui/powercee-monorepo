"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Shield, User as UserIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { InviteDialog } from "@/components/invitations/invite-dialog";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface AgencyUsersListProps {
  agencyId: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AgencyUsersList({ agencyId }: AgencyUsersListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`agencies/${agencyId}/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du chargement des utilisateurs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agencyId) {
      fetchUsers();
    }
  }, [agencyId]);

  const handleInvite = () => {
    setIsInviteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Utilisateurs</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Membres de cette agence
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleInvite}>
            <Plus className="w-4 h-4 mr-2" />
            Inviter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun utilisateur dans cette agence.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 font-medium">Utilisateur</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Rôle</th>
                  <th className="pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {user.full_name ? (
                              getInitials(user.full_name)
                            ) : (
                              <UserIcon className="w-4 h-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name || "Sans nom"}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "DIRECTION"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {user.role === "DIRECTION" && <Shield className="w-3 h-3 mr-1" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <InviteDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        agencyId={agencyId}
        onSuccess={fetchUsers}
      />
    </Card>
  );
}

