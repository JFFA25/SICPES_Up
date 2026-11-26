import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { LoaderCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import { useAuth } from "../context/AuthContext";
import { useTimedMessage } from "../hooks/useTimedMessage";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message, showError, clear } = useTimedMessage();

  useEffect(() => {
    document.title = "Login";
  }, []);

  // ESTADOS
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const hasError = message?.type === "error";

  const completeLogin = async () => {
    const sessionRes = await fetch("/api/session", {
      credentials: "include",
    });

    if (!sessionRes.ok) {
      throw new Error("Error al validar la sesión del usuario.");
    }

    const sessionData = await sessionRes.json();
    login(
      {
        id: sessionData.id,
        nombre: sessionData.nombre,
        email: sessionData.email,
        rol: sessionData.rol,
        foto_perfil_url: sessionData.foto_perfil_url,
      },
      ""
    );

    if (sessionData.rol === "admin") {
      navigate("/admin/reservations");
    } else {
      navigate("/dashboard");
    }
  };

  // INPUTS
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    clear();
  };

  // SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password.trim()) {
      showError("Todos los campos son obligatorios.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      showError("Por favor, ingresa un correo válido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || data.detail || "Credenciales incorrectas");
        return;
      }

      await completeLogin();
    } catch (err) {
      console.error("Error al conectar:", err);
      showError(err instanceof Error ? err.message : "Error al conectar con el servidor central.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async ({ credential }: CredentialResponse) => {
    if (!credential) {
      showError("Google no devolvió una credencial válida. Intenta de nuevo.");
      return;
    }

    setIsGoogleSubmitting(true);
    clear();

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "No se pudo iniciar sesión con Google.");
        return;
      }

      await completeLogin();
    } catch (err) {
      console.error("Error al iniciar sesión con Google:", err);
      showError(err instanceof Error ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <span className="mk-eyebrow">INICIAR SESIÓN</span>
      <h2 className="mk-auth-title">Qué gusto verte de nuevo.</h2>
      <p className="mk-lead">Ingresa a tu cuenta para continuar con tu reservación.</p>

      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="login-email"
          label="CORREO ELECTRÓNICO"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="nombre@correo.com"
          value={form.email}
          onChange={handleChange}
          error={hasError ? " " : undefined}
        />
        <Field
          id="login-password"
          label="CONTRASEÑA"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          error={hasError ? " " : undefined}
        />

        <div className="mk-inline-between">
          <span />
          <Link to="/forgot-password" className="mk-text-link">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {message && <Notice type={message.type} onClose={clear}>{message.text}</Notice>}

        <button type="submit" disabled={isSubmitting} className="mk-btn mk-primary mk-block">
          {isSubmitting ? (
            <>
              <LoaderCircle size={16} className="mk-spin" /> Entrando...
            </>
          ) : (
            <>
              Entrar <Icon name="arrowRight" size={17} />
            </>
          )}
        </button>
      </form>

      <div className="mk-social-divider" aria-hidden="true">
        <span>O CONTINÚA CON</span>
      </div>
      <div className="mk-google-login" aria-busy={isGoogleSubmitting}>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => showError("No se pudo abrir el inicio de sesión de Google.")}
              theme="outline"
              size="large"
              shape="rectangular"
              text="continue_with"
              width={320}
            />
          </GoogleOAuthProvider>
        ) : (
          <p className="mk-muted" role="status">
            El inicio de sesión con Google aún no está configurado en este entorno.
          </p>
        )}
      </div>
      {isGoogleSubmitting && (
        <p className="mk-google-loading" role="status">
          <LoaderCircle size={14} className="mk-spin" /> Conectando con Google...
        </p>
      )}

      <p className="mk-auth-note">
        ¿No tienes cuenta?{" "}
        <Link to="/register" className="mk-text-link">Regístrate</Link>
      </p>
    </AuthShell>
  );
};

export default Login;
