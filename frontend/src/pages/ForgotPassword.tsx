import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import { useTimedMessage } from "../hooks/useTimedMessage";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { message, showError, clear } = useTimedMessage();
  const hasError = message?.type === "error";

  useEffect(() => {
    document.title = "Recuperar Contraseña";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showError("Debes ingresar un correo electrónico.");
      return;
    }
    setIsSubmitting(true);
    clear();
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) showError(data.error || "No se pudo procesar la solicitud.");
      else setSuccessMessage(data.message);
    } catch {
      showError("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <span className="mk-eyebrow">RECUPERACIÓN DE CUENTA</span>
      <h2 className="mk-auth-title">Recupera tu cuenta</h2>
      <p className="mk-lead">Ingresa tu correo electrónico y te enviaremos un enlace para crear una nueva contraseña.</p>

      {successMessage ? (
        <>
          <Notice type="success">{successMessage}</Notice>
          <Link to="/login" className="mk-btn mk-primary mk-block">
            Volver a iniciar sesión <Icon name="arrowRight" size={17} />
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Field
            id="forgot-email"
            label="CORREO ELECTRÓNICO"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); clear(); }}
            placeholder="nombre@correo.com"
            error={hasError ? " " : undefined}
          />
          {message && <Notice type={message.type} onClose={clear}>{message.text}</Notice>}
          <button type="submit" disabled={isSubmitting} className="mk-btn mk-primary mk-block">
            {isSubmitting ? (
              <>
                <LoaderCircle size={16} className="mk-spin" /> Enviando...
              </>
            ) : (
              <>
                Enviar enlace <Icon name="arrowRight" size={17} />
              </>
            )}
          </button>
          <p className="mk-auth-note">
            <Link to="/login" className="mk-text-link">Volver a iniciar sesión</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
