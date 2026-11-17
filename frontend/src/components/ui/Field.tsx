import { useState } from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// Campo del prototipo: etiqueta mono en mayúsculas + input; con ojo si es contraseña.
const Field = ({ label, error, hint, type = "text", id, ...rest }: Props) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  const input = (
    <input
      id={id}
      type={isPassword && show ? "text" : type}
      aria-invalid={Boolean(error)}
      {...rest}
    />
  );

  return (
    <label className={`mk-field${error ? " is-error" : ""}`} htmlFor={id}>
      <span>{label}</span>
      {isPassword ? (
        <span className="mk-pass-wrap">
          {input}
          <button
            type="button"
            className="mk-pass-toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <EyeIcon off={show} />
          </button>
        </span>
      ) : (
        input
      )}
      {error ? (
        <p role="alert" className="mk-field-error">{error}</p>
      ) : hint ? (
        <p className="mk-field-hint">{hint}</p>
      ) : null}
    </label>
  );
};

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {off ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.8 9.8 0 0 0 4.3-1" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </>
    ) : (
      <>
        <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export default Field;
