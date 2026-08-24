import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[32px]">recycling</span>
          <span className="text-headline-lg text-primary tracking-tight">Canoas Coleta+</span>
        </div>
        <h1 className="text-headline-lg text-on-surface mb-2">Criar conta</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          O cadastro de cidadãos chega em breve — em vez disso, você vai poder salvar seu
          endereço, favoritar rotas e receber alertas quando o caminhão estiver próximo.
        </p>
        <Link
          href="/"
          className="inline-block text-label-lg text-on-primary bg-primary px-5 py-3 rounded-xl hover:bg-primary-container transition-colors"
        >
          Voltar ao mapa
        </Link>
      </div>
    </main>
  );
}
