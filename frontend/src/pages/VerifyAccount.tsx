import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import { useTimedMessage } from "../hooks/useTimedMessage";

const VerifyAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { message, showError, showSuccess, clear } = useTimedMessage();
  const hasError = message?.type === "error";

  useEffect(() => {
    document.title = "Verificar cuenta";
    const queryEmail = new URLSearchParams(location.search).get("email") || "";
    setEmail(queryEmail);
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "No se pudo verificar la cuenta");
      } else {
        showSuccess(data.message || "Cuenta verificada correctamente");
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch {
      showError("No se pudo conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    clear();
    try {
      const res = await fetch(`/api/resend-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) showError(data.error || "No se pudo reenviar el correo");
      else showSuccess(data.message || "Correo reenviado");
    } catch {
      showError("No se pudo reenviar el correo");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell>
      <span className="mk-eyebrow">PROTECCIÓN DE TU CUENTA</span>
      <h2 className="mk-auth-title">Verifica tu cuenta</h2>
      <p className="mk-lead">Ingresa el código de 6 dígitos que enviamos por WhatsApp/SMS o confirma desde el enlace de tu correo.</p>

      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="verify-email"
          label="CORREO ELECTRÓNICO"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => { setEmail(event.target.value); clear(); }}
          placeholder="nombre@correo.com"
          error={hasError ? " " : undefined}
        />
        <Field
          id="verify-code"
          label="CÓDIGO DE VERIFICACIÓN"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => { setCode(event.target.value); clear(); }}
          placeholder="123456"
          maxLength={6}
          error={hasError ? " " : undefined}
        />
        {message && <Notice type={message.type} onClose={clear}>{message.text}</Notice>}
        <button type="submit" disabled={isSubmitting} className="mk-btn mk-primary mk-block">
          {isSubmitting ? (
            <>
              <LoaderCircle size={16} className="mk-spin" /> Verificando...
            </>
          ) : (
            <>
              Verificar cuenta <Icon name="arrowRight" size={17} />
            </>
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={isResending || !email}
        className="mk-btn mk-ghost mk-block"
      >
        {isResending && <LoaderCircle size={16} className="mk-spin" />}
        Reenviar código por correo
      </button>
      <p className="mk-auth-note">
        <Link to="/login" className="mk-text-link">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  );
};

export default VerifyAccount;
