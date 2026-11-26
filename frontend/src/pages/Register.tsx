import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import { useTimedMessage } from "../hooks/useTimedMessage";

interface FieldErrors {
  nombre?: string;
  email?: string;
  password?: string;
}

const Register = () => {

  useEffect(() => {
    document.title = "Registro";
  }, []);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { message, showError, showSuccess, clear } = useTimedMessage();
  const [verifyEmail, setVerifyEmail] = useState("");

  // VALIDACIÓN SIMPLE (UX)
  const validate = (name: string, value: string) => {
    let fieldError = "";

    if (name === "nombre") {
      if (value.length < 2) {
        fieldError = "Ingresa un nombre válido";
      }
    }

    if (name === "email") {
      if (!value.includes("@")) {
        fieldError = "Correo inválido";
      }
    }

    if (name === "password") {
      if (value.length < 8) {
        fieldError = "Mínimo 8 caracteres";
      }
    }

    setErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  // INPUTS
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });
    clear();
    validate(name, value);
  };

  // SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setVerifyEmail("");

    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      showError("Todos los campos son obligatorios.");
      return;
    }

    if (errors.nombre || errors.email || errors.password) return;

    if (form.password !== confirm) {
      showError("Las contraseñas no coinciden.");
      return;
    }

    if (!accepted) {
      showError("Debes aceptar los términos y el aviso de privacidad.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...form,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "El correo electrónico ya está registrado. Intenta con otro o inicia sesión");
        if (data.requiresVerification) {
          setVerifyEmail(form.email);
        }
      } else {
        showSuccess(data.message || "Registro exitoso. Revisa tu correo para confirmar tu cuenta.");
        setVerifyEmail(form.email);
        setForm({ nombre: "", email: "", password: "" });
        setConfirm("");
        setAccepted(false);
        if (data.requiresVerification) {
          window.location.href = `/verify-account?email=${encodeURIComponent(form.email)}`;
        }
      }

    } catch {
      showError("Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid = Boolean(errors.nombre || errors.email || errors.password);
  const mismatch = confirm.length > 0 && confirm !== form.password;

  return (
    <AuthShell>
      <span className="mk-eyebrow">NUEVO RESIDENTE</span>
      <h2 className="mk-auth-title">Crea tu cuenta</h2>
      <p className="mk-lead">Registra tus datos para comenzar tu reservación.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mk-form-grid">
          <Field
            id="register-nombre"
            label="NOMBRE COMPLETO"
            name="nombre"
            autoComplete="name"
            placeholder="Nombre y apellidos"
            value={form.nombre}
            onChange={handleChange}
            error={errors.nombre}
          />
          <Field
            id="register-email"
            label="CORREO ELECTRÓNICO"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="nombre@correo.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Field
            id="register-password"
            label="CONTRASEÑA"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <Field
            id="register-confirm"
            label="CONFIRMAR CONTRASEÑA"
            type="password"
            name="confirm"
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); clear(); }}
            error={mismatch ? "Las contraseñas no coinciden" : undefined}
          />
        </div>

        <label className="mk-checkline">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => { setAccepted(e.target.checked); clear(); }}
          />
          Acepto los términos, condiciones y el aviso de privacidad.
        </label>

        {message && (
          <div style={{ display: "grid", gap: 6 }}>
            <Notice type={message.type} onClose={clear}>{message.text}</Notice>
            {verifyEmail && (
              <a href={`/verify-account?email=${encodeURIComponent(verifyEmail)}`} className="mk-text-link" style={{ justifySelf: "center" }}>
                Continuar con la verificación por correo
              </a>
            )}
          </div>
        )}

        <button type="submit" disabled={isFormInvalid || isSubmitting} className="mk-btn mk-primary mk-block">
          {isSubmitting ? (
            <>
              <LoaderCircle size={16} className="mk-spin" /> Registrando...
            </>
          ) : (
            <>
              Registrarme <Icon name="arrowRight" size={17} />
            </>
          )}
        </button>
      </form>

      <p className="mk-auth-note">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="mk-text-link">Iniciar sesión</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
