import { redirectIfAuthenticated } from "@/lib/auth";
import { GoogleSignIn } from "./google-sign-in";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-[32px]">
              recycling
            </span>
            <span className="text-headline-lg text-primary tracking-tight">
              Canoas Recicla com a Gente
            </span>
          </div>
          <h1 className="text-headline-lg text-on-surface mb-2">Entrar</h1>
          <p className="text-body-md text-on-surface-variant">
            Acompanhe a coleta na sua rua e receba avisos quando o caminhão estiver perto.
          </p>
        </div>

        <GoogleSignIn />
        <p className="text-body-md text-on-surface-variant text-center mt-3">
          Use sua conta Google, sem criar senha. No primeiro acesso sua conta é criada na hora.
        </p>
      </div>
    </main>
  );
}
