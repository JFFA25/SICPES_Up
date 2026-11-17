import { useEffect } from "react";
import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import AuthStatus from "../components/AuthStatus";
import Icon from "../components/ui/Icon";

const Error = () => {
  useEffect(() => {
    document.title = "Ocurrió un error";
  }, []);

  return (
    <AuthStatus
      tone="error"
      eyebrow="NO SE PUDO COMPLETAR"
      title="Algo salió mal"
      description="Ocurrió un error al procesar tu solicitud. Intenta de nuevo o contacta al equipo de soporte."
      icon={TriangleAlert}
    >
      <Link to="/" className="mk-btn mk-primary mk-block">
        Volver al inicio <Icon name="arrowRight" size={17} />
      </Link>
      <Link to="/contact" className="mk-btn mk-ghost mk-block">
        Contactar soporte
      </Link>
    </AuthStatus>
  );
};

export default Error;
