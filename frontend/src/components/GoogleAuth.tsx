import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

interface GoogleAuthProps {
  /** "register" cambia el texto a "Registrarse con Google". */
  mode: "login" | "register";
  onError: (message: string) => void;
  onStart?: () => void;
}

/** Divisor + botón de Google. Si la cuenta no existe, el backend la crea. */
const GoogleAuth = ({ mode, onError, onStart }: GoogleAuthProps) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSuccess = async ({ credential }: CredentialResponse) => {
    if (!credential) {
      onError("Google no devolvió una credencial válida. Intenta de nuevo.");
      return;
    }
    setSubmitting(true);
    onStart?.();
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error || "No se pudo continuar con Google.");
        return;
      }

      const sessionRes = await fetch("/api/session", { credentials: "include" });
      if (!sessionRes.ok) throw new Error("Error al validar la sesión del usuario.");
      const session = await sessionRes.json();
      login(
        {
          id: session.id,
          nombre: session.nombre,
          email: session.email,
          rol: session.rol,
          foto_perfil_url: session.foto_perfil_url,
        },
        ""
      );
      navigate(session.rol === "admin" ? "/admin/reservations" : "/dashboard");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mk-social-divider" aria-hidden="true">
        <span>{mode === "register" ? "O REGÍSTRATE CON" : "O CONTINÚA CON"}</span>
      </div>
      <div className="mk-google-login" aria-busy={submitting}>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => onError("No se pudo abrir la ventana de Google.")}
              theme="outline"
              size="large"
              shape="rectangular"
              text={mode === "register" ? "signup_with" : "continue_with"}
              width={320}
            />
          </GoogleOAuthProvider>
        ) : (
          <p className="mk-muted" role="status">
            El acceso con Google aún no está configurado en este entorno.
          </p>
        )}
      </div>
      {submitting && (
        <p className="mk-google-loading" role="status">
          <LoaderCircle size={14} className="mk-spin" /> Conectando con Google...
        </p>
      )}
    </>
  );
};

export default GoogleAuth;
