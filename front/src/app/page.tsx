import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // Redirection automatique selon l'état d'authentification
  if (token) {
    redirect("/app");
  } else {
    redirect("/login");
  }

  return null;
}
