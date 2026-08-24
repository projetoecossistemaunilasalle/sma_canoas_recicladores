import Link from "next/link";

export function AuthPanel() {
  return (
    <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 px-2 py-2">
      <Link
        href="/login"
        className="text-label-lg text-on-surface px-3 py-2 rounded-xl hover:bg-surface-container-low transition-colors"
      >
        Entrar
      </Link>
      <Link
        href="/register"
        className="text-label-lg text-on-primary bg-primary px-3 py-2 rounded-xl hover:bg-primary-container transition-colors"
      >
        Criar conta
      </Link>
    </div>
  );
}
