import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import { useAuth } from "../context/AuthContext";
import { useTimedMessage } from "../hooks/useTimedMessage";

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

  const hasError = message?.type === "error";

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
      // Utiliza el proxy configurado en Vite
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
        setIsSubmitting(false);
        return;
      }

      const sessionRes = await fetch("/api/session", {
        credentials: "include",
      });

      if (!sessionRes.ok) {
        showError("Error al validar la sesión del usuario.");
        setIsSubmitting(false);
        return;
      }

      const sessionData = await sessionRes.json();

      login(
        {
          id: sessionData.id,
          nombre: sessionData.nombre,
          email: sessionData.sub,
          rol: sessionData.rol,
        },
        ""
      );

      if (sessionData.rol === "admin") {
        navigate("/admin/reservations");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Error al conectar:", err);
      showError("Error al conectar con el servidor central.");
      setIsSubmitting(false);
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

      <p className="mk-auth-note">
        ¿No tienes cuenta?{" "}
        <Link to="/register" className="mk-text-link">Regístrate</Link>
      </p>
    </AuthShell>
  );
};

export default Login;
