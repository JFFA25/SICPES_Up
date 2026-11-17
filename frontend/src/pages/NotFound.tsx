import { useEffect } from "react";
import { Link } from "react-router-dom";
import AuthStatus from "../components/AuthStatus";
import Icon from "../components/ui/Icon";

const NotFound = () => {
  useEffect(() => {
    document.title = "Página no encontrada";
  }, []);

  return (
    <AuthStatus
      tone="neutral"
      eyebrow="PÁGINA NO DISPONIBLE"
      title="No encontramos esta página"
      description="El enlace puede ser incorrecto o la página ya no está disponible. Revisa la dirección o vuelve al inicio."
      code="404"
    >
      <Link to="/" className="mk-btn mk-primary mk-block">
        Volver al inicio <Icon name="arrowRight" size={17} />
      </Link>
      <Link to="/login" className="mk-btn mk-ghost mk-block">
        Iniciar sesión
      </Link>
    </AuthStatus>
  );
};

export default NotFound;
