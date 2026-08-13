import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const token = await getToken();
  if (token && (await getCurrentUser(token))) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-[32px]">
              recycling
            </span>
            <span className="text-headline-lg text-primary tracking-tight">
              Canoas Coleta+
            </span>
          </div>
          <h1 className="text-headline-lg text-on-surface mb-2">
            Área da Cooperativa
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Entre com sua conta para acessar o painel.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
