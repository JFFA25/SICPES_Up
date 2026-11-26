import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/ui/Field";
import Notice from "../components/ui/Notice";
import { useTimedMessage } from "../hooks/useTimedMessage";

const VerifyAccount = () => {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const { message, showError, showSuccess, clear } = useTimedMessage();
  const hasError = message?.type === "error";

  useEffect(() => {
    document.title = "Verificar cuenta";
    const queryEmail = new URLSearchParams(location.search).get("email") || "";
    setEmail(queryEmail);
  }, [location.search]);

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
      <p className="mk-lead">Confirma tu cuenta desde el enlace que enviamos a tu correo. Si no lo recibiste, puedes solicitar que lo reenviemos.</p>

      <div>
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
        {message && <Notice type={message.type} onClose={clear}>{message.text}</Notice>}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || !email}
          className="mk-btn mk-primary mk-block"
        >
          {isResending && <LoaderCircle size={16} className="mk-spin" />}
          Reenviar correo de confirmación
        </button>
      </div>
      <p className="mk-auth-note">
        <Link to="/login" className="mk-text-link">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  );
};

export default VerifyAccount;
