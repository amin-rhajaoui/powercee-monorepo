import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    // Appel manuel vers le backend pour vérifier le token
    // On transfère le cookie access_token manuellement
    const response = await fetch(`${API_URL}/users/me`, {
      method: "GET",
      headers: {
        "Cookie": `access_token=${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Si l'API renvoie une erreur (401, etc.), on redirige
      redirect("/login");
    }

    // Si tout va bien, on affiche le contenu protégé
    return (
      <div className="min-h-screen bg-background">
        {/* On pourra ajouter une Sidebar ou un Header ici plus tard */}
        <main>{children}</main>
      </div>
    );
  } catch (error) {
    // En cas d'erreur réseau ou autre, par sécurité on redirige
    console.error("Auth Guard Error:", error);
    redirect("/login");
  }
}

