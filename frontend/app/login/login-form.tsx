
"use client";

import { useActionState, useState, useTransition } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { login, loginWithGoogle, type LoginState } from "./actions";

const initialState: LoginState = {};

function LoginFormContent() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [googlePending, startGoogleTransition] = useTransition();

  function handleGoogleSuccess(credential?: string) {
    if (!credential) {
      setGoogleError("Não foi possível obter a credencial do Google.");
      return;
    }

    setGoogleError("");

    startGoogleTransition(async () => {
      const result = await loginWithGoogle(credential);

      if (result?.error) {
        setGoogleError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-on-surface-variant">
            <span className="material-symbols-outlined">mail</span>
          </div>
          <input
            className="w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl pl-12 pr-4 py-4 outline-none border-2 border-transparent focus:border-primary shadow-sm"
            id="email"
            name="email"
            placeholder="E-mail"
            required
            type="email"
            autoComplete="email"
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-on-surface-variant">
            <span className="material-symbols-outlined">lock</span>
          </div>
          <input
            className="w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl pl-12 pr-12 py-4 outline-none border-2 border-transparent focus:border-primary shadow-sm"
            id="password"
            name="password"
            placeholder="Senha"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
          />
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-on-surface-variant"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            <span className="material-symbols-outlined">
              {showPassword ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>

        {state.error && (
          <p className="text-error text-label-lg" role="alert">
            {state.error}
          </p>
        )}

        <button
          className="w-full h-14 bg-primary text-on-primary text-action-lg rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
          disabled={pending || googlePending}
          type="submit"
        >
          {pending ? "Entrando..." : "Entrar →"}
        </button>
      </form>

      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 border-t border-outline-variant" />
        <span className="text-sm text-on-surface-variant">ou</span>
        <div className="flex-1 border-t border-outline-variant" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(response) => handleGoogleSuccess(response.credential)}
          onError={() =>
            setGoogleError("Não foi possível iniciar o login com Google.")
          }
          text="signin_with"
          theme="outline"
          shape="rectangular"
          size="large"
          width="320"
        />
      </div>

      {googlePending && (
        <p className="text-sm text-on-surface-variant text-center" role="status">
          Entrando com Google...
        </p>
      )}

      {googleError && (
        <p className="text-error text-label-lg" role="alert">
          {googleError}
        </p>
      )}
    </div>
  );
}

export function LoginForm() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <p className="text-error text-label-lg" role="alert">
        O login com Google não está configurado.
      </p>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LoginFormContent />
    </GoogleOAuthProvider>
  );
}
