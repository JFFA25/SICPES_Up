import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import { useTimedMessage } from "../hooks/useTimedMessage";

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { message, showError, clear } = useTimedMessage();
  const hasError = message?.type === "error";

  useEffect(() => {
    document.title = "Ajustar Contraseña";

    // Verificar si el token es válido
    fetch(`/api/reset-password/${token}`)
      .then(res => {
        if (!res.ok) {
          navigate("/error"); // Redirigir a pantalla de error si el token ya se usó o no existe
        }
      })
      .catch(() => navigate("/error"));
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) {
      showError("Llena todos los campos.");
      return;
    }
    if (password !== confirmPassword) {
      showError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      showError("La contraseña debe ser de al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);
    clear();

    try {
      const res = await fetch(`/api/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) showError(data.error || "No se pudo restablecer la contraseña.");
      else {
        setSuccessMessage("Contraseña restablecida con éxito. Redirigiendo al Login...");
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch {
      showError("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <span className="mk-eyebrow">SEGURIDAD DE LA CUENTA</span>
      <h2 className="mk-auth-title">Crea una nueva contraseña</h2>
      <p className="mk-lead">Elige una contraseña segura de al menos 8 caracteres.</p>

      {successMessage ? (
        <>
          <Notice type="success">{successMessage}</Notice>
          <Link to="/login" className="mk-btn mk-primary mk-block">
            Ir a iniciar sesión <Icon name="arrowRight" size={17} />
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Field
            id="reset-password"
            label="NUEVA CONTRASEÑA"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); clear(); }}
            placeholder="Mínimo 8 caracteres"
            error={hasError ? " " : undefined}
          />
          <Field
            id="reset-confirm-password"
            label="CONFIRMAR CONTRASEÑA"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => { setConfirmPassword(event.target.value); clear(); }}
            placeholder="Repite la contraseña"
            error={hasError ? " " : undefined}
          />
          {message && <Notice type={message.type} onClose={clear}>{message.text}</Notice>}
          <button type="submit" disabled={isSubmitting} className="mk-btn mk-primary mk-block">
            {isSubmitting ? (
              <>
                <LoaderCircle size={16} className="mk-spin" /> Guardando...
              </>
            ) : (
              <>
                Actualizar contraseña <Icon name="arrowRight" size={17} />
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

export default ResetPassword;
