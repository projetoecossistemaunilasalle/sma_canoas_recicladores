"use client";

import Script from "next/script";
import { useRef, useState, useTransition } from "react";
import { googleLogin } from "./actions";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * The citizens' only way in. Google Identity Services draws its own button
 * (Google's branding rules) and hands back an ID token, which the backend
 * verifies and trades for our session — creating the account the first time.
 */
export function GoogleSignIn() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!CLIENT_ID) {
    return (
      <p className="text-error text-label-lg" role="alert">
        Login com Google não configurado (NEXT_PUBLIC_GOOGLE_CLIENT_ID).
      </p>
    );
  }
  const clientId = CLIENT_ID;

  // From onReady, not onLoad: it also runs when the script is already loaded
  // and this mounts again (back to /login), so the button gets redrawn.
  function renderButton() {
    const parent = buttonRef.current;
    if (!parent) return;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        setError(null);
        startTransition(async () => {
          // Redirects on success; only comes back with an error.
          const result = await googleLogin(credential);
          if (result.error) setError(result.error);
        });
      },
    });
    google.accounts.id.renderButton(parent, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      locale: "pt-BR",
      width: Math.min(parent.offsetWidth, 400),
    });
  }

  return (
    <div className="space-y-3">
      <Script
        src="https://accounts.google.com/gsi/client"
        onReady={renderButton}
        onError={() => setError("Não foi possível carregar o login do Google. Verifique sua conexão.")}
      />
      <div className="relative">
        <div ref={buttonRef} className="flex justify-center min-h-[44px]" />
        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-surface/90 rounded-full text-label-lg text-on-surface">
            <span className="material-symbols-outlined animate-spin">autorenew</span>
            Entrando...
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-error text-label-lg text-center" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
