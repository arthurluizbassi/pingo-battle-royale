import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <main className="game-bg min-h-screen flex items-center justify-center p-4">
      <div className="pixel-panel w-full max-w-sm p-6">
        <h1 className="font-pixel text-2xl mb-1">Nova senha</h1>
        <p className="text-sm text-muted mb-4">
          Olá, {session.profile.display_name}! Escolha uma senha só sua para continuar.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
