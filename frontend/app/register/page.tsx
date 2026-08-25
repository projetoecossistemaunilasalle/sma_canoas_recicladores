import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { redirectForRole } from "@/lib/redirect-for-role";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const token = await getToken();
  if (token) {
    const user = await getCurrentUser(token);
    if (user) redirectForRole(user.role);
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
          <h1 className="text-headline-lg text-on-surface mb-2">Criar conta</h1>
          <p className="text-body-md text-on-surface-variant">
            Acompanhe a coleta na sua rua e receba avisos quando o caminhão estiver perto.
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
